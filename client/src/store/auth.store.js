import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('cd_token') ?? null,
  user:  JSON.parse(localStorage.getItem('cd_user') ?? 'null'),

  login(token, user) {
    localStorage.setItem('cd_token', token);
    localStorage.setItem('cd_user', JSON.stringify(user));
    set({ token, user });
  },

  logout() {
    localStorage.removeItem('cd_token');
    localStorage.removeItem('cd_user');
    set({ token: null, user: null });
  },

  updateUser(user) {
    localStorage.setItem('cd_user', JSON.stringify(user));
    set({ user });
  },

  async refreshUser() {
    try {
      const token = localStorage.getItem('cd_token');
      if (!token) return;
      const { BASE } = await import('../api/client.js');
      const res = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          localStorage.setItem('cd_user', JSON.stringify(data.user));
          set({ user: data.user });
        }
      }
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  }
}));
