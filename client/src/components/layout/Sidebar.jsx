import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';
import { useDriveStore } from '../../store/drive.store.js';
import { formatBytes, quotaPercent } from '../../utils/format.js';
import { Folder, Clock, Star, Trash2, ShieldCheck, LogOut, Users, Settings, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store/chat.store.js';
import styles from './Sidebar.module.css';

const NAV = [
  { to: '/drive',           icon: <Folder size={18} />,     labelKey: 'nav.myDrive'  },
  { to: '/drive/shared',    icon: <Users size={18} />,      labelKey: 'nav.sharedWithMe' },
  { to: '/drive/recent',    icon: <Clock size={18} />,      labelKey: 'nav.recent'    },
  { to: '/chat',            icon: <MessageCircle size={18} />,labelKey: 'Chat'          },
  { to: '/drive/starred',   icon: <Star size={18} />,       labelKey: 'nav.starred'   },
  { to: '/drive/trash',     icon: <Trash2 size={18} />,     labelKey: 'nav.trash'     },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const unreadCounts = useChatStore(s => s.unreadCounts);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const usedPct = quotaPercent(user?.storageUsed, user?.storageQuota);
  const isAdmin = user?.role === 'SUPER_ADMIN';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const { clearSelection } = useDriveStore();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoSvg} aria-label="Lead Drive Logo" title="Lead Drive" />
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {NAV.map(({ to, icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/drive'}
            onClick={clearSelection}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''} ${labelKey === 'Chat' ? styles.desktopOnlyNav : ''}`}
          >
            <span className={styles.navIcon}>
              {icon}
              {labelKey === 'Chat' && totalUnread > 0 && <span className={styles.unreadDot}>{totalUnread}</span>}
            </span>
            <span>{labelKey === 'Chat' ? t('chat.title') : t(labelKey)}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <div className={styles.desktopOnly}>
            <div className={styles.divider} />
            <NavLink
              to="/admin"
              onClick={clearSelection}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}><ShieldCheck size={18} /></span>
              <span>{t('nav.adminPanel')}</span>
            </NavLink>
          </div>
        )}

        <div className={styles.desktopOnly}>
          <div className={styles.divider} />
          <NavLink
            to="/drive/settings"
            onClick={clearSelection}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}><Settings size={18} /></span>
            <span>{t('nav.settings')}</span>
          </NavLink>
        </div>
      </nav>

      {/* Storage Quota */}
      <div className={styles.quota}>
        <div className={styles.quotaBar}>
          <div
            className={styles.quotaFill}
            style={{ width: `${usedPct}%`, background: usedPct > 90 ? 'var(--danger)' : 'var(--primary)' }}
          />
        </div>
        <p className={styles.quotaText}>
          {formatBytes(user?.storageUsed)} {t('quota.of')} {formatBytes(user?.storageQuota)} {t('quota.used')}
        </p>
      </div>

      {/* User + Logout */}
      <div className={styles.user}>
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="Avatar" className={styles.avatarImg} />
        ) : (
          <div className={styles.avatar}>{user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}</div>
        )}
        <div className={styles.userInfo}>
          <p className={styles.username}>{user?.fullName || user?.username}</p>
          <p className={styles.role}>{user?.role}</p>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title={t('nav.logOut')}>
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
