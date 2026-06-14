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
}));
