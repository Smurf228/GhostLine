import { useEffect, useRef } from 'react';
import DecryptText from './DecryptText';

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
      {messages.map((msg, i) => (
        <div className="message" key={msg._id || i}>
          <span className="msg-prefix">&gt;</span>
          <span className="msg-user">@{msg.sender?.username || 'unknown'}</span>
          <span className="msg-text">
            {msg.isNew ? <DecryptText text={msg.text} /> : msg.text}
          </span>
          <span className="msg-time">{formatTime(msg.createdAt)}</span>
          {msg.sender?._id === user?.id && (
            <button className="msg-delete" onClick={() => onDelete(msg._id)} title="delete">
              [x]
            </button>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default Messages;
