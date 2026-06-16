import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import { chatApi } from '../api/chat.js';
import { filesApi } from '../api/drive.js';
import { useChatStore } from '../store/chat.store.js';
import { toast } from '../components/ui/Toast.jsx';
import FilePickerModal from '../components/chat/FilePickerModal.jsx';
import { Header } from '../components/layout/Header.jsx';
import { Send, Paperclip, ChevronLeft, File } from 'lucide-react';
import { getAvatarUrl } from '../utils/format.js';
import styles from './ChatPage.module.css';

const SOCKET_URL = '/';

export default function ChatPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const { socket, onlineUsers, unreadCounts, clearUnread } = useChatStore();
  const [showFilePicker, setShowFilePicker] = useState(false);
  const messagesEndRef = useRef(null);
  const activeChatIdRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('cd_user') || '{}');

  useEffect(() => {
    // Fetch users
    chatApi.getUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'));
  }, []);

  // Attach directly to the global socket for real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Only append if this message belongs to the current conversation
      const otherId = activeChatIdRef.current;
      const isRelevant =
        (msg.senderId === currentUser.id && msg.receiverId === otherId) ||
        (msg.senderId === otherId && msg.receiverId === currentUser.id);

      if (!isRelevant) return;

      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, currentUser.id]);

  useEffect(() => {
    if (selectedUser) {
      activeChatIdRef.current = selectedUser.id;
      localStorage.setItem('cd_active_chat_id', selectedUser.id);
      clearUnread(selectedUser.id);
      chatApi.getMessages(selectedUser.id)
        .then(setMessages)
        .catch(() => toast.error('Failed to load messages'));
    } else {
      activeChatIdRef.current = null;
      localStorage.removeItem('cd_active_chat_id');
      setMessages([]);
    }
  }, [selectedUser, clearUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !selectedUser || !socket) return;
    
    socket.emit('send_message', {
      receiverId: selectedUser.id,
      content: inputValue,
    });
    setInputValue('');
  };

  const handleSendFile = (file) => {
    if (!selectedUser || !socket) return;
    socket.emit('send_message', {
      receiverId: selectedUser.id,
      fileId: file.id,
      content: `Sent a file: ${file.name}`
    });
    setShowFilePicker(false);
    toast.success('File shared');
  };

  const handleDownload = (fileId, fileName) => {
    filesApi.download(fileId, fileName, toast);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Header title={t('chat.title')} />
      <div className={styles.container}>
        
        {/* User List Sidebar */}
        <div className={`${styles.sidebar} ${selectedUser ? styles.hiddenOnMobile : ''}`}>
          <div className={styles.sidebarHeader}>Users</div>
          <div className={styles.userList}>
            {users.length === 0 && <p style={{ padding: 12, color: 'var(--text-secondary)' }}>No other users.</p>}
            {users.map(u => (
              <div 
                key={u.id} 
                className={`${styles.userItem} ${selectedUser?.id === u.id ? styles.active : ''}`}
                onClick={() => setSelectedUser(u)}
              >
                <div className={styles.avatar}>
                  {u.avatarUrl ? <img src={getAvatarUrl(u.avatarUrl)} alt="" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : u.username.charAt(0).toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <p className={styles.userName}>{u.fullName || u.username}</p>
                </div>
                {unreadCounts[u.id] > 0 && <span className={styles.userUnreadBadge}>{unreadCounts[u.id]}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className={`${styles.chatArea} ${!selectedUser ? styles.hiddenOnMobile : ''}`}>
          {selectedUser ? (
            <>
              <div className={styles.chatHeader}>
                <button className={styles.backBtn} onClick={() => setSelectedUser(null)}>
                  <ChevronLeft size={24} />
                </button>
                <div className={styles.avatar}>
                  {selectedUser.avatarUrl ? <img src={getAvatarUrl(selectedUser.avatarUrl)} alt="" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} /> : selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div className={styles.chatHeaderInfo}>
                  <span className={styles.userName}>{selectedUser.fullName || selectedUser.username}</span>
                  <span className={styles.userStatus}>{onlineUsers.has(selectedUser.id) ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              
              <div className={styles.messages}>
                {messages.length === 0 && <div className={styles.emptyState}>No messages yet. Say hi!</div>}
                {messages.map(msg => {
                  const isSent = msg.senderId === currentUser.id;
                  const msgUser = isSent ? currentUser : selectedUser;
                  return (
                    <div key={msg.id} className={`${styles.messageRow} ${isSent ? styles.sentRow : styles.receivedRow}`}>
                      {!isSent && (
                        <div className={styles.messageAvatar}>
                          {msgUser.avatarUrl ? <img src={getAvatarUrl(msgUser.avatarUrl)} alt="" /> : msgUser.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`${styles.messageWrapper} ${isSent ? styles.sent : styles.received}`}>
                        <div className={styles.messageBubble}>
                          {msg.content}
                        </div>
                        {msg.file && (
                          <div className={styles.fileAttachment} onClick={() => handleDownload(msg.file.id, msg.file.name)}>
                            <div className={styles.fileIcon}><File size={20} /></div>
                            <div className={styles.fileName}>{msg.file.name}</div>
                          </div>
                        )}
                        <div className={styles.messageTime}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <button className={styles.iconBtn} onClick={() => setShowFilePicker(true)} title="Attach File">
                  <Paperclip size={20} />
                </button>
                <div className={styles.inputWrapper}>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder={t('chat.typeMessage')} 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                </div>
                <button 
                  className={styles.sendBtn} 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              {t('chat.noMessages')}
            </div>
          )}
        </div>

      </div>

      {showFilePicker && (
        <FilePickerModal 
          onClose={() => setShowFilePicker(false)} 
          onSelect={handleSendFile} 
        />
      )}
    </div>
  );
}
