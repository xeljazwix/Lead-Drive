import webpush from 'web-push';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';
import prisma from '../utils/prisma.js';

// VAPID keys setup
let vapidKeys = null;

export function initPushService() {
  const vapidFile = path.resolve(process.cwd(), '.vapid.json');
  
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
    logger.info('VAPID keys loaded from environment variables');
  } else if (fs.existsSync(vapidFile)) {
    try {
      vapidKeys = JSON.parse(fs.readFileSync(vapidFile, 'utf8'));
      logger.info('VAPID keys loaded from .vapid.json');
    } catch (e) {
      logger.error('Failed to parse .vapid.json', e);
    }
  }

  if (!vapidKeys) {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidFile, JSON.stringify(vapidKeys, null, 2));
    logger.info('Generated new VAPID keys and saved to .vapid.json');
  }

  webpush.setVapidDetails(
    'mailto:admin@leaddrive.local',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

export function getPublicKey() {
  if (!vapidKeys) initPushService();
  return vapidKeys.publicKey;
}

/**
 * Send a push notification to a specific user.
 * It fetches all subscriptions for the user and sends the payload.
 * Invalid/expired subscriptions are automatically removed from the database.
 * @param {string} userId - ID of the user to notify
 * @param {object} payload - The notification payload (usually { title, body, icon, url })
 */
export async function sendPushNotification(userId, payload) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (!subscriptions.length) return;

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys
        }, payloadString);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          logger.info(`Removed expired push subscription for user ${userId}`);
        } else {
          logger.error('Error sending push notification', err);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (err) {
    logger.error('Failed to send push notifications', err);
  }
}
