import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socket from '../socket';
import Sidebar from './Sidebar';
import Messages from './Messages';
import DMPanel from './DMPanel';
import ChatInput from './ChatInput';
import './Chat.css';

const Chat = ({ user, onLogout }) => {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnread] = useState({});
  const [activeDM, setActiveDM] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [unreadDM, setUnreadDM] = useState({});
  const activeDMRef = useRef(activeDM);
  useEffect(() => { activeDMRef.current = activeDM; }, [activeDM]);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('ghostline_sound') !== 'off');
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const playBeep = () => {
    if (!soundOnRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch { /* audio not supported */ }
  };

  // Регистрируемся в сокете
  useEffect(() => {
    socket.emit('user_online', { id: user.id, username: user.username, role: user.role });

    const handleOnlineUsers = (users) => setOnlineUsers(users);
    socket.on('online_users', handleOnlineUsers);

    const handleDM = (msg) => {
      const myId = String(user.id);
      const senderId = String(msg.sender._id);
      const partnerId = senderId === myId ? msg.receiverId : senderId;

      if (activeDMRef.current?.id === partnerId) {
        setDmMessages((prev) => [...prev, { ...msg, isNew: true }]);
      } else {
        setUnreadDM((prev) => ({ ...prev, [partnerId]: (prev[partnerId] || 0) + 1 }));
        playBeep();
      }
    };
    socket.on('receive_dm', handleDM);

    return () => {
      socket.off('online_users', handleOnlineUsers);
      socket.off('receive_dm', handleDM);
    };
  }, [user]);

  const handleStatusChange = (status) => {
    socket.emit('change_status', status);
  };

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      localStorage.setItem('ghostline_sound', next ? 'on' : 'off');
      return next;
    });
  };

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
        playBeep();
      } else {
        setUnread((prev) => ({ ...prev, [message.channel]: (prev[message.channel] || 0) + 1 }));
        playBeep();
      }
    };

    const handleTyping = (username) => {
      setTypingUser(username);
    };

    const handleStopTyping = () => {
      setTypingUser('');
    };

    const handleMessageDeleted = (messageId) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    };

    socket.on('receive_message', handleMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_deleted', handleMessageDeleted);

    const handleChannelDeleted = (channelId) => {
      setChannels((prev) => prev.filter((c) => c._id !== channelId));
      setActiveChannel((prev) => {
        if (prev?._id === channelId) return null;
        return prev;
      });
    };
    socket.on('channel_deleted', handleChannelDeleted);

    const handleChannelCreatedRemote = (channel) => {
      setChannels((prev) => {
        if (prev.find((c) => c._id === channel._id)) return prev;
        return [...prev, channel];
      });
    };
    socket.on('channel_created', handleChannelCreatedRemote);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('channel_deleted', handleChannelDeleted);
      socket.off('channel_created', handleChannelCreatedRemote);
    };
  }, [activeChannel]);

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setActiveDM(null);
    setTypingUser('');
    setUnread((prev) => ({ ...prev, [channel._id]: 0 }));
  };

  const handleOpenDM = (u) => {
    setActiveDM({ id: u.id, username: u.username });
    setActiveChannel(null);
    setUnreadDM((prev) => ({ ...prev, [u.id]: 0 }));
    setSidebarOpen(false);
  };

  const handleDMDecrypted = (msgId) => {
    setDmMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, isNew: false } : m));
  };

  // Загрузить историю DM при открытии
  useEffect(() => {
    if (!activeDM) return;
    const fetchDMs = async () => {
      const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/dm`, {
        params: { userId: user.id, with: activeDM.id }
      });
      setDmMessages(res.data);
    };
    fetchDMs();
  }, [activeDM, user.id]);

  const handleChannelCreated = (channel) => {
    setChannels((prev) => [...prev, channel]);
    setActiveChannel(channel);
  };

  const handleDeleteChannel = async (channelId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_SERVER_URL}/api/channels/${channelId}`,
        { data: { userId: user.id } }
      );
    } catch (err) {
      console.error('Failed to delete channel:', err.response?.data?.message || err.message);
    }
  };

  const handleMessageDecrypted = (messageId) => {
    setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, isNew: false } : m));
  };

  const handleDelete = async (messageId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_SERVER_URL}/api/channels/messages/${messageId}`,
        { data: { userId: user.id } }
      );
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    } catch (err) {
      console.error('Failed to delete message:', err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="chat-layout">
      <Sidebar
        user={user}
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={(ch) => { handleSelectChannel(ch); setSidebarOpen(false); }}
        onChannelCreated={handleChannelCreated}
        onLogout={onLogout}
        onlineUsers={onlineUsers}
        onStatusChange={handleStatusChange}
        unread={unread}
        onDeleteChannel={handleDeleteChannel}
        onOpenDM={handleOpenDM}
        unreadDM={unreadDM}
        activeDM={activeDM}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="chat-area">
        {activeDM ? (
          <>
            <div className="chat-header">
              <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
              <h2>
                <span className="hash" style={{ color: 'var(--cyan)' }}>@</span>
                {activeDM.username}
                <span className="dm-label"> [DM]</span>
              </h2>
              <div className="header-right">
                <button className="sound-btn" onClick={toggleSound} title="toggle sound">
                  {soundOn ? '[SND:ON]' : '[SND:OFF]'}
                </button>
              </div>
            </div>

            <DMPanel messages={dmMessages} user={user} onMessageDecrypted={handleDMDecrypted} />
            <ChatInput user={user} dmTargetId={activeDM.id} />
          </>
        ) : activeChannel ? (
          <>
            <div className="chat-header">
              <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
              <h2>
                <span className="hash">#</span>
                {activeChannel.name}
              </h2>
              <div className="header-right">
                {typingUser && (
                  <span className="typing-indicator">
                    @{typingUser} is decrypting...
                  </span>
                )}
                <button className="sound-btn" onClick={toggleSound} title="toggle sound">
                  {soundOn ? '[SND:ON]' : '[SND:OFF]'}
                </button>
              </div>
            </div>

            <Messages messages={messages} user={user} onDelete={handleDelete} onMessageDecrypted={handleMessageDecrypted} />
            <ChatInput user={user} channelId={activeChannel._id} />
          </>
        ) : (
          <div className="no-channel">
            <button className="menu-btn menu-btn-nochannel" onClick={() => setSidebarOpen(true)}>☰</button>
            <p>// create or select a channel to start</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
