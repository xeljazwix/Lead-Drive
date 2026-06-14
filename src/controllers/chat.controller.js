import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
      },
      orderBy: {
        username: 'asc',
      },
    });
    
    // Remove the current user from the list
    const otherUsers = users.filter((u) => u.id !== req.user.id);
    
    res.json(otherUsers);
  } catch (err) {
    console.error('Error fetching users for chat:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;
  
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      orderBy: {
        createdAt: 'asc',
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
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
