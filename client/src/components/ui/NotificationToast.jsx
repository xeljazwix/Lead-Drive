import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, FolderOpen, File, X } from 'lucide-react';
import styles from './NotificationToast.module.css';

let _addNotification = null;
export function notify(notification) {
  if (_addNotification) _addNotification(notification);
}

export function NotificationHost() {
  const [items, setItems] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    setItems(prev => [...prev, { ...notification, id }]);
    setTimeout(() => {
      setItems(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    _addNotification = addNotification;
    return () => { _addNotification = null; };
  }, [addNotification]);

  const dismiss = (id) => setItems(prev => prev.filter(n => n.id !== id));

  if (!items.length) return null;

  return createPortal(
    <div className={styles.host}>
      {items.map(n => (
        <NotificationCard key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>,
    document.body
  );
}

function NotificationCard({ notification, onDismiss }) {
  const { type, sharer, item } = notification;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const typeLabel =
    type === 'new_message' ? 'sent you a message' :
    type === 'file_shared' ? 'shared a file with you' :
    'shared a folder with you';

  const TypeIcon =
    type === 'new_message' ? MessageCircle :
    type === 'file_shared' ? File :
    FolderOpen;

  const name = sharer?.fullName || sharer?.username || 'Someone';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`${styles.card} ${visible ? styles.visible : ''}`}>
      <div className={styles.avatar}>
        {sharer?.avatarUrl ? (
          <img src={sharer.avatarUrl} alt="" className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarInitial}>{initial}</span>
        )}
        <span className={styles.typeIcon}>
          <TypeIcon size={10} />
        </span>
      </div>

      <div className={styles.content}>
        <p className={styles.title}>
          <strong>{name}</strong> {typeLabel}
        </p>
        {item?.name && (
          <p className={styles.subtitle}>{item.name}</p>
        )}
      </div>

      <button className={styles.close} onClick={onDismiss}>
        <X size={14} />
      </button>

      <div className={styles.progress} />
    </div>
  );
}
