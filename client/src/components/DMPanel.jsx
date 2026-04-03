import { useEffect, useRef } from 'react';
import DecryptText from './DecryptText';

const DMPanel = ({ messages, user, onMessageDecrypted }) => {
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
      {messages.length === 0 && (
        <p className="dm-empty">// no messages yet. start the transmission.</p>
      )}
      {messages.map((msg, i) => {
        const isOwn = String(msg.sender?._id) === String(user?.id);
        return (
          <div className="message" key={msg._id || i}>
            <span className="msg-prefix">&gt;</span>
            <span className="msg-user" style={{ color: isOwn ? 'var(--green)' : 'var(--cyan)' }}>
              @{msg.sender?.username}
            </span>
            <span className="msg-text">
              {msg.isNew
                ? <DecryptText text={msg.text} onDone={() => onMessageDecrypted?.(msg._id)} />
                : msg.text
              }
            </span>
            <span className="msg-time">{formatTime(msg.createdAt)}</span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default DMPanel;
