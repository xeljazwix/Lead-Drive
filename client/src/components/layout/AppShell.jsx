import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';
import { useChatStore } from '../../store/chat.store.js';
import { Sidebar } from './Sidebar.jsx';
import styles from './AppShell.module.css';
import { UploadProgress } from '../drive/UploadProgress.jsx';
import { NotificationHost } from '../ui/NotificationToast.jsx';

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const connectChat = useChatStore((state) => state.connect);
  const disconnectChat = useChatStore((state) => state.disconnect);

  useEffect(() => {
    if (user) {
      connectChat();
    }
    return () => disconnectChat();
  }, [user, connectChat, disconnectChat]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <UploadProgress />
      <NotificationHost />
    </div>
  );
}
