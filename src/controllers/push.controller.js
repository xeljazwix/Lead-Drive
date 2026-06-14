import { asyncHandler } from '../utils/helpers.js';
import { getPublicKey } from '../services/push.service.js';
import prisma from '../utils/prisma.js';

export const getVapidKey = asyncHandler(async (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

export const subscribe = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  // Check if it already exists
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: subscription.endpoint }
  });

  if (existing) {
    if (existing.userId !== req.user.id) {
      // Reassign if another user logs in on same browser
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { userId: req.user.id, keys: subscription.keys }
      });
    }
  } else {
    await prisma.pushSubscription.create({
      data: {
        userId: req.user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }
    });
  }

  res.status(201).json({ status: 'success', message: 'Subscribed to push notifications' });
});

export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: req.user.id }
  });

  res.json({ status: 'success', message: 'Unsubscribed' });
});
