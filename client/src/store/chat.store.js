import { create } from 'zustand';
import { io } from 'socket.io-client';
import { notify } from '../components/ui/NotificationToast.jsx';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? new URL(import.meta.env.VITE_API_URL).origin 
  : '/';

export const useChatStore = create((set, get) => ({
  socket: null,
  onlineUsers: new Set(),
  unreadCounts: {}, // mapping of senderId -> count
  notifications: [],  // history of all notifications
  unreadNotifications: 0,

  connect: () => {
    const { socket } = get();
    if (socket) return; // already connected

    const token = localStorage.getItem('cd_token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      path: '/socket.io',
    });

    newSocket.on('connect', () => {
      console.log('Global chat socket connected');
    });

    newSocket.on('user_status', ({ userId, status }) => {
      set(state => {
        const next = new Set(state.onlineUsers);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return { onlineUsers: next };
      });
    });

    newSocket.on('new_message', (msg) => {
      window.dispatchEvent(new CustomEvent('chat_new_message', { detail: msg }));
      
      set(state => {
        const currentUserStr = localStorage.getItem('cd_user');
        const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
        
        // If I sent the message, do not increment unread counts
        if (currentUser && msg.senderId === currentUser.id) {
          return state;
        }

        const currentActiveChatId = localStorage.getItem('cd_active_chat_id');
        if (currentActiveChatId === msg.senderId) {
          return state; // handled by ChatPage
        }
        
        return {
          unreadCounts: {
            ...state.unreadCounts,
            [msg.senderId]: (state.unreadCounts[msg.senderId] || 0) + 1
          }
        };
      });
    });

    newSocket.on('notification', (payload) => {
      notify(payload);
      // Also persist to notification history
      set(state => ({
        notifications: [{ ...payload, id: Date.now(), readAt: null }, ...state.notifications].slice(0, 50),
        unreadNotifications: state.unreadNotifications + 1,
      }));
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, onlineUsers: new Set() });
    }
  },

  clearUnread: (userId) => {
    set(state => {
      const nextCounts = { ...state.unreadCounts };
      delete nextCounts[userId];
      return { unreadCounts: nextCounts };
    });
  },

  markNotificationsRead: () => {
    set({ unreadNotifications: 0 });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadNotifications: 0 });
  },
}));
