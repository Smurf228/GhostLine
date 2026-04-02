import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../socket';
import Sidebar from './Sidebar';
import Messages from './Messages';
import ChatInput from './ChatInput';
import './Chat.css';

const Chat = ({ user, onLogout }) => {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState('');

  // Загрузить каналы
  useEffect(() => {
    const fetchChannels = async () => {
      const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/channels`);
      setChannels(res.data);
      if (res.data.length > 0) {
        setActiveChannel(res.data[0]);
      }
    };
    fetchChannels();
  }, []);

  // Подключение к каналу + загрузка сообщений
  useEffect(() => {
    if (!activeChannel) return;

    socket.emit('join_channel', activeChannel._id);

    const fetchMessages = async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/channels/${activeChannel._id}/messages`
      );
      setMessages(res.data);
    };
    fetchMessages();
  }, [activeChannel]);

  // Слушаем новые сообщения
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.channel === activeChannel?._id) {
        setMessages((prev) => [...prev, { ...message, isNew: true }]);
      }
    };

    const handleTyping = (username) => {
      setTypingUser(username);
    };

    const handleStopTyping = () => {
      setTypingUser('');
    };

    socket.on('receive_message', handleMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [activeChannel]);

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setTypingUser('');
  };

  const handleChannelCreated = (channel) => {
    setChannels((prev) => [...prev, channel]);
    setActiveChannel(channel);
  };

  return (
    <div className="chat-layout">
      <Sidebar
        user={user}
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={handleSelectChannel}
        onChannelCreated={handleChannelCreated}
        onLogout={onLogout}
      />

      <div className="chat-area">
        {activeChannel ? (
          <>
            <div className="chat-header">
              <h2>
                <span className="hash">#</span>
                {activeChannel.name}
              </h2>
              {typingUser && (
                <span className="typing-indicator">
                  @{typingUser} is decrypting...
                </span>
              )}
            </div>

            <Messages messages={messages} />
            <ChatInput user={user} channelId={activeChannel._id} />
          </>
        ) : (
          <div className="no-channel">
            <p>// create or select a channel to start</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
