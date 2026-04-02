import { useState, useRef } from 'react';
import socket from '../socket';

const ChatInput = ({ user, channelId }) => {
  const [text, setText] = useState('');
  const typingTimeout = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    socket.emit('typing', { channelId, username: user.username });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop_typing', { channelId, username: user.username });
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    socket.emit('send_message', {
      text: text.trim(),
      senderId: user.id,
      channelId,
    });

    socket.emit('stop_typing', { channelId, username: user.username });
    setText('');
  };

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <span className="input-prefix">$</span>
      <input
        className="chat-input"
        type="text"
        placeholder="Enter message..."
        value={text}
        onChange={handleChange}
        autoFocus
      />
    </form>
  );
};

export default ChatInput;
