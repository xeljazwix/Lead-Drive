import { useRef, useEffect } from 'react';
import { MessageCircle, FolderOpen, File, Trash2, Bell } from 'lucide-react';
import { useChatStore } from '../../store/chat.store.js';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../../utils/format.js';
import styles from './NotificationsPanel.module.css';

function timeAgo(id) {
  const ms = Date.now() - id;
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsPanel({ onClose }) {
  const { notifications, clearNotifications } = useChatStore();
  const panelRef = useRef(null);
  const { t } = useTranslation();

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className={styles.panel} ref={panelRef}>
      <div className={styles.header}>
        <span className={styles.title}>{t('notifications.title', 'Notifications')}</span>
        {notifications.length > 0 && (
          <button className={styles.clearBtn} onClick={clearNotifications}>
            <Trash2 size={14} /> {t('notifications.clear', 'Clear all')}
          </button>
        )}
      </div>

      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={32} strokeWidth={1.5} />
            <p>{t('notifications.empty', 'No notifications yet')}</p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationRow key={n.id} n={n} onClose={onClose} />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationRow({ n, onClose }) {
  const { type, sharer, item } = n;
  const navigate = useNavigate();

  const TypeIcon =
    type === 'new_message' ? MessageCircle :
    type === 'file_shared' ? File :
    FolderOpen;

  const typeLabel =
    type === 'new_message' ? 'sent you a message' :
    type === 'file_shared' ? 'shared a file with you' :
    'shared a folder with you';

  const name = sharer?.fullName || sharer?.username || 'Someone';
  const initial = name.charAt(0).toUpperCase();

  const handleClick = () => {
    onClose();
    if (type === 'new_message') {
      navigate('/chat');
    } else {
      // Both file_shared and folder_shared go to Shared With Me
      navigate('/drive/shared');
    }
  };

  return (
    <button className={styles.row} onClick={handleClick}>
      <div className={styles.avatar}>
        {sharer?.avatarUrl ? (
          <img src={getAvatarUrl(sharer.avatarUrl)} alt="" className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarInitial}>{initial}</span>
        )}
        <span className={styles.typeIcon}>
          <TypeIcon size={9} />
        </span>
      </div>

      <div className={styles.content}>
        <p className={styles.rowTitle}>
          <strong>{name}</strong> {typeLabel}
        </p>
        {item?.name && <p className={styles.rowSub}>{item.name}</p>}
        <p className={styles.rowTime}>{timeAgo(n.id)}</p>
      </div>
    </button>
  );
}
