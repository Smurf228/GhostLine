import { useEffect, useRef } from 'react';
import DecryptText from './DecryptText';

const USER_COLORS = [
  '#00ff41', '#00d4ff', '#ff00ff', '#ff9500', '#ff4444',
  '#a8ff00', '#00ffcc', '#ff0099', '#ffdd00', '#7b00ff'
];

const getUserColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

const Messages = ({ messages, user, onDelete }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="messages-container">
      {messages.map((msg, i) => {
        const senderId = String(msg.sender?._id);
        const userId = String(user?.id);
        const isOwn = senderId === userId;
        const isAdmin = user?.role === 'admin';
        const canDelete = isOwn || isAdmin;
        const username = msg.sender?.username || 'unknown';
        const userColor = getUserColor(username);
        return (
        <div className="message" key={msg._id || i}>
          <span className="msg-prefix">&gt;</span>
          <span className="msg-user" style={{ color: userColor }}>@{username}</span>
          <span className="msg-text">
            {msg.isNew ? <DecryptText text={msg.text} /> : msg.text}
          </span>
          <span className="msg-time">{formatTime(msg.createdAt)}</span>
          {canDelete && (
            <button className="msg-delete" onClick={() => onDelete(msg._id)} title="delete">
              [x]
            </button>
          )}
        </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default Messages;
