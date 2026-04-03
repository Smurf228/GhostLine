import { useState } from 'react';
import axios from 'axios';

const STATUSES = ['ONLINE', 'AWAY', 'GHOST'];

const Sidebar = ({ user, channels, activeChannel, onSelectChannel, onChannelCreated, onLogout }) => {
  const [newChannel, setNewChannel] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const status = STATUSES[statusIndex];

  const handleStatusClick = () => {
    setStatusIndex((prev) => (prev + 1) % STATUSES.length);
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannel.trim()) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/channels`, {
        name: newChannel.trim().toLowerCase(),
        creator: user.id,
      });
      onChannelCreated(res.data);
      setNewChannel('');
    } catch {
      console.error('Failed to create channel');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>GHOSTLINE</h1>
        <p className="user-info">@{user.username}</p>
        <p className={`user-status status-${status.toLowerCase()}`} onClick={handleStatusClick} title="click to change">[{status}]</p>
      </div>

      <p className="channels-title">// channels</p>

      <div className="channel-list">
        {channels.map((ch) => (
          <div
            key={ch._id}
            className={`channel-item ${activeChannel?._id === ch._id ? 'active' : ''}`}
            onClick={() => onSelectChannel(ch)}
          >
            <span className="hash">#</span>
            {ch.name}
          </div>
        ))}
      </div>

      <form className="new-channel" onSubmit={handleCreateChannel}>
        <input
          className="new-channel-input"
          type="text"
          placeholder="+ new channel"
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value)}
        />
      </form>

      <button className="logout-btn" onClick={onLogout}>
        $ disconnect
      </button>
    </div>
  );
};

export default Sidebar;
