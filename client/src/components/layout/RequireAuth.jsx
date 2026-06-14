import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';

export function RequireAuth({ adminOnly = false }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'SUPER_ADMIN') return <Navigate to="/drive" replace />;
  return <Outlet />;
}
