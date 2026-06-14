import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDriveStore } from '../../store/drive.store.js';
import { Input } from '../ui/Input.jsx';
import { FilterBar } from '../drive/FilterBar.jsx';
import { useAuthStore } from '../../store/auth.store.js';
import { formatBytes, quotaPercent } from '../../utils/format.js';
import { Search, LayoutGrid, List, ShieldCheck, Settings as SettingsIcon, LogOut, X, Sun, Moon, Globe, MessageCircle, Bell, Download, Share } from 'lucide-react';
import { useThemeStore } from '../../store/theme.store.js';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../../store/chat.store.js';
import { NotificationsPanel } from './NotificationsPanel.jsx';
import { usePushNotifications } from '../../hooks/usePushNotifications.js';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import styles from './Header.module.css';

export function Header({ title, actions }) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { view, setView } = useDriveStore();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const inputRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { permission, isSubscribed, isSupported, subscribe } = usePushNotifications();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const unreadCounts = useChatStore(s => s.unreadCounts);
  const unreadNotifications = useChatStore(s => s.unreadNotifications);
  const markNotificationsRead = useChatStore(s => s.markNotificationsRead);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const usedPct = quotaPercent(user?.storageUsed, user?.storageQuota);
  const isAdmin = user?.role === 'SUPER_ADMIN';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/drive/search?q=${encodeURIComponent(query.trim())}`);
  }

  async function handleInstallClick() {
    const result = await promptInstall();
    if (result === 'ios_instructions') {
      setShowIOSInstructions(true);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <Input
          ref={inputRef}
          id="global-search"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search size={18} />}
          className={styles.searchInput}
        />
      </form>

      <div className={styles.right}>
        <FilterBar />
        {actions}
        <button
          className={`${styles.viewBtn} ${styles.hideOnMobile}`}
          onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
          title={i18n.language === 'en' ? 'عربي' : 'English'}
          style={{ marginRight: '8px' }}
        >
          <Globe size={16} />
        </button>
        <button
          className={`${styles.viewBtn} ${styles.hideOnMobile}`}
          onClick={toggleTheme}
          title={theme === 'dark' ? t('nav.light') : t('nav.dark')}
          style={{ marginRight: '8px' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {isInstallable && !isInstalled && (
          <button
            className={styles.viewBtn}
            onClick={handleInstallClick}
            title="Install App"
            style={{ marginRight: '8px', color: 'var(--primary-color)' }}
          >
            <Download size={16} />
          </button>
        )}

        {permission === 'default' && isSupported && (
          <button
            className={styles.viewBtn}
            onClick={subscribe}
            title="Enable Push Notifications"
            style={{ marginRight: '8px', color: 'var(--primary-color)' }}
          >
            <Bell size={16} />+
          </button>
        )}

        {/* Bell Notification Button */}
        <div style={{ position: 'relative' }}>
          <button
            className={styles.viewBtn}
            style={{ marginRight: '8px', position: 'relative' }}
            onClick={() => { setNotifOpen(o => !o); if (!notifOpen) markNotificationsRead(); }}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadNotifications > 0 && (
              <span className={styles.bellBadge}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
            )}
          </button>
          {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
        </div>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'grid' ? styles.viewActive : ''}`}
            onClick={() => setView('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'list' ? styles.viewActive : ''}`}
            onClick={() => setView('list')}
            title="List view"
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
        
        {/* Mobile Profile Toggle */}
        <button className={styles.mobileProfileBtn} onClick={() => setMobileMenuOpen(true)}>
          {totalUnread > 0 && <span className={styles.headerUnreadDot}>{totalUnread}</span>}
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className={styles.mobileAvatarImg} />
          ) : (
            <div className={styles.mobileAvatar}>{user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}</div>
          )}
        </button>
      </div>

      {/* Mobile Profile Drawer */}
      {mobileMenuOpen && createPortal(
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawer} onClick={e => e.stopPropagation()}>
            <button className={styles.closeDrawerBtn} onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
            
            <div className={styles.drawerLogo}>
              <div className={styles.drawerLogoSvg} aria-label="Lead Drive Logo" title="Lead Drive" />
            </div>

            <div className={styles.drawerUser}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className={styles.drawerAvatarImg} />
              ) : (
                <div className={styles.drawerAvatar}>{user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}</div>
              )}
              <div className={styles.drawerUserInfo}>
                <p className={styles.drawerUsername}>{user?.fullName || user?.username}</p>
                <p className={styles.drawerRole}>{user?.role}</p>
              </div>
            </div>

            <div className={styles.drawerQuota}>
              <div className={styles.drawerQuotaBar}>
                <div
                  className={styles.drawerQuotaFill}
                  style={{ width: `${usedPct}%`, background: usedPct > 90 ? 'var(--danger)' : 'var(--primary)' }}
                />
              </div>
              <p className={styles.drawerQuotaText}>
                {formatBytes(user?.storageUsed)} {t('quota.of')} {formatBytes(user?.storageQuota)} {t('quota.used')}
              </p>
            </div>

            <div className={styles.drawerDivider} />

            <div className={styles.drawerViewToggle}>
              <span className={styles.drawerLabel}>{t('nav.view')}</span>
              <div className={styles.viewToggleGroup}>
                <button className={`${styles.viewBtn} ${view === 'grid' ? styles.viewActive : ''}`} onClick={() => { setView('grid'); setMobileMenuOpen(false); }}><LayoutGrid size={16} /> {t('nav.grid')}</button>
                <button className={`${styles.viewBtn} ${view === 'list' ? styles.viewActive : ''}`} onClick={() => { setView('list'); setMobileMenuOpen(false); }}><List size={16} /> {t('nav.list')}</button>
              </div>
            </div>

            <div className={styles.drawerDivider} />

            <div className={styles.drawerViewToggle}>
              <span className={styles.drawerLabel}>{t('nav.theme')}</span>
              <div className={styles.viewToggleGroup}>
                <button className={`${styles.viewBtn} ${theme === 'light' ? styles.viewActive : ''}`} onClick={() => { if(theme !== 'light') toggleTheme(); setMobileMenuOpen(false); }}><Sun size={16} /> {t('nav.light')}</button>
                <button className={`${styles.viewBtn} ${theme === 'dark' ? styles.viewActive : ''}`} onClick={() => { if(theme !== 'dark') toggleTheme(); setMobileMenuOpen(false); }}><Moon size={16} /> {t('nav.dark')}</button>
              </div>
            </div>

            <div className={styles.drawerDivider} />

            <div className={styles.drawerViewToggle}>
              <span className={styles.drawerLabel}>Language / اللغة</span>
              <div className={styles.viewToggleGroup}>
                <button className={`${styles.viewBtn} ${i18n.language === 'en' ? styles.viewActive : ''}`} onClick={() => { i18n.changeLanguage('en'); setMobileMenuOpen(false); }}>English</button>
                <button className={`${styles.viewBtn} ${i18n.language === 'ar' ? styles.viewActive : ''}`} onClick={() => { i18n.changeLanguage('ar'); setMobileMenuOpen(false); }}>عربي</button>
              </div>
            </div>

            <div className={styles.drawerDivider} />

            <div className={styles.drawerNav}>
              {isAdmin && (
                <button className={styles.drawerNavItem} onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }}>
                  <ShieldCheck size={18} /> {t('nav.adminPanel')}
                </button>
              )}
              <button className={styles.drawerNavItem} onClick={() => { setMobileMenuOpen(false); navigate('/chat'); }}>
                <span style={{ position: 'relative', display: 'flex' }}>
                  <MessageCircle size={18} />
                  {totalUnread > 0 && <span className={styles.drawerUnreadDot}>{totalUnread}</span>}
                </span>
                {t('chat.title')}
              </button>
              <button className={styles.drawerNavItem} onClick={() => { setMobileMenuOpen(false); navigate('/drive/settings'); }}>
                <SettingsIcon size={18} /> {t('nav.settings')}
              </button>
              <button className={`${styles.drawerNavItem} ${styles.danger}`} onClick={handleLogout}>
                <LogOut size={18} /> {t('nav.logOut')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {showIOSInstructions && (
        <div className={styles.modalOverlay} onClick={() => setShowIOSInstructions(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Install on iOS</h3>
              <button className={styles.iconBtn} onClick={() => setShowIOSInstructions(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ marginBottom: '16px' }}>To install Lead Drive on your iPhone or iPad:</p>
              <ol style={{ textAlign: 'left', margin: '0 auto', display: 'inline-block', lineHeight: '1.6' }}>
                <li>Tap the <strong>Share</strong> button <Share size={16} style={{ verticalAlign: 'text-bottom' }} /> at the bottom of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
