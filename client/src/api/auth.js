import { api } from './client.js';

export const authApi = {
  login:    (body) => api.post('/auth/login', body),
  register: (body) => api.post('/auth/register', body),
  me:       ()     => api.get('/auth/me'),
  updateProfile:  (body) => api.put('/auth/profile', body),
  updatePassword: (body) => api.put('/auth/password', body),
  uploadAvatar:   (formData) => api.post('/auth/avatar', formData),
};

export const usersApi = {
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
};
