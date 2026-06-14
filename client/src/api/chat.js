import { api } from './client.js';

export const chatApi = {
  getUsers: () => api.get('/chat/users'),
  getMessages: (userId) => api.get(`/chat/messages/${userId}`),
};
