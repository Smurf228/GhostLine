import { useState } from 'react';
import axios from 'axios';

const STATUSES = ['ONLINE', 'AWAY', 'GHOST'];

const Sidebar = ({ user, channels, activeChannel, onSelectChannel, onChannelCreated, onLogout, onlineUsers = [], onStatusChange, unread = {}, onDeleteChannel, isOpen, onClose, onOpenDM, unreadDM = {}, activeDM }) => {
  const [newChannel, setNewChannel] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const status = STATUSES[statusIndex];

  const handleStatusClick = () => {
    const next = (statusIndex + 1) % STATUSES.length;
    setStatusIndex(next);
    onStatusChange?.(STATUSES[next]);
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
    <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <h1>GHOSTLINE</h1>
          <button className="sidebar-close-btn" onClick={onClose}>✕</button>
        </div>
        <p className="user-info">@{user.username}{user.role === 'admin' && <span className="admin-badge"> [ADMIN]</span>}</p>
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
            {unread[ch._id] > 0 && (
              <span className="unread-badge">{unread[ch._id]}</span>
            )}
            {(String(ch.creator) === String(user.id) || user.role === 'admin') && (
              <button
                className="channel-delete-btn"
                onClick={(e) => { e.stopPropagation(); onDeleteChannel(ch._id); }}
                title="delete channel"
              >[x]</button>
            )}
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

      {onlineUsers.length > 0 && (
        <>
          <p className="channels-title">// online [{onlineUsers.length}]</p>
          <div className="online-list">
            {onlineUsers.map((u) => (
              <div
                key={u.id}
                className={`online-item ${activeDM?.id === u.id ? 'active' : ''}`}
                onClick={u.id !== user.id ? () => { onOpenDM?.(u); onClose?.(); } : undefined}
                title={u.id !== user.id ? `DM @${u.username}` : undefined}
                style={{ cursor: u.id !== user.id ? 'pointer' : 'default' }}
              >
                <span className={`online-status status-${u.status.toLowerCase()}`}>●</span>
                <span className="online-name">@{u.username}</span>
                {u.role === 'admin' && <span className="admin-badge">[ADMIN]</span>}
                <span className={`online-badge status-${u.status.toLowerCase()}`}>[{u.status}]</span>
                {u.id !== user.id && unreadDM[u.id] > 0 && (
                  <span className="unread-badge dm-unread">{unreadDM[u.id]}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <button className="logout-btn" onClick={onLogout}>
        $ disconnect
      </button>
    </div>
  );
};

export default Sidebar;
