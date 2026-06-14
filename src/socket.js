import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger.js';
import prisma from './utils/prisma.js';
import * as pushService from './services/push.service.js';

let io;

// Map to keep track of active users to their socket IDs
const userSockets = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = { id: decoded.sub };
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    
    // Join a personal room so we can target this user specifically
    socket.join(`user:${userId}`);

    // Add to active users
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    
    // Notify others that this user is online
    io.emit('user_status', { userId, status: 'online' });

    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, fileId } = data;
        
        // Save to database
        const message = await prisma.chatMessage.create({
          data: {
            senderId: userId,
            receiverId,
            content,
            fileId,
          },
          include: {
            file: {
              select: {
                id: true,
                name: true,
                mimeType: true,
                size: true,
              }
            }
          }
        });

        // Grant view permission if a file is shared and no permission exists
        if (fileId) {
          const existingShare = await prisma.fileShare.findUnique({
            where: {
              fileId_sharedWithUserId: {
                fileId,
                sharedWithUserId: receiverId
              }
            }
          });
          if (!existingShare) {
            await prisma.fileShare.create({
              data: {
                fileId,
                sharedWithUserId: receiverId,
                permissionLevel: 'VIEWER'
              }
            });
          }
        }

        // Emit to sender
        socket.emit('new_message', message);
        
        // Emit to receiver's sockets
        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets) {
          receiverSockets.forEach(socketId => {
            io.to(socketId).emit('new_message', message);
          });
        }

        // Emit a rich notification to the receiver's room
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        });
        io.to(`user:${receiverId}`).emit('notification', {
          type: 'new_message',
          sharer: sender,
          message: content || 'Sent you a file',
          createdAt: message.createdAt
        });

        // Send push notification
        pushService.sendPushNotification(receiverId, {
          title: `New message from ${sender.fullName || sender.username}`,
          body: content || 'Sent you a file',
          icon: sender.avatarUrl || '/favicon.ico',
          data: { url: '/chat' }
        }).catch(err => logger.error('Push error', err));
      } catch (err) {
        console.error('Socket message error:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // Notify others that this user is offline
          io.emit('user_status', { userId, status: 'offline' });
        }
      }
    });
  });
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
};
