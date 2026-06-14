import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    // Check initial subscription state if permission is granted
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    } else if (permission === 'default' && isSupported) {
      // Automatically prompt for permission on first access
      // Note: Some modern browsers require a user gesture (like a click) 
      // before allowing this prompt to appear.
      subscribe();
    }
  }, [permission]);

  const subscribe = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by this browser.');
      }

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        throw new Error('Permission not granted for Notification');
      }

      // Register SW if not already registered
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID key
      const { data: { publicKey } } = await api.get('/push/vapid-key');
      const applicationServerKey = urlB64ToUint8Array(publicKey);

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send to backend
      await api.post('/push/subscribe', { subscription });
      setIsSubscribed(true);
      
      return true;
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
      return false;
    }
  };

  return { permission, isSubscribed, isSupported, subscribe };
}

// Utility to convert base64 VAPID key to Uint8Array
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
