import { api } from './client.js';

export const adminApi = {
  getStats:    ()              => api.get('/admin/stats'),
  listUsers:   (page = 1)     => api.get(`/admin/users?page=${page}&limit=20`),
  createUser:  (body)         => api.post('/admin/users', body),
  updateQuota: (id, quota)    => api.patch(`/admin/users/${id}/quota`, { storageQuota: quota }),
  deleteUser:  (id, hard)     => api.delete(`/admin/users/${id}${hard ? '?hard=true' : ''}`),
  updateSettings: (settings)  => api.patch('/admin/settings', settings),
};
