import { useState } from 'react';
import axios from 'axios';

const STATUSES = ['ONLINE', 'AWAY', 'GHOST'];

const Sidebar = ({
  user, channels, activeChannel, onSelectChannel, onChannelCreated,
  onLogout, onStatusChange, unread = {}, onDeleteChannel,
  isOpen, onClose, onOpenDM, unreadDM = {}, activeDM,
  friends = [], pendingRequests = [], onAcceptRequest, onRejectRequest, onSendFriendRequest,
  channelInvites = [], onAcceptChannelInvite, onRejectChannelInvite, onSendChannelInvite
}) => {
  const [newChannel, setNewChannel] = useState('');
  const [statusIndex, setStatusIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviteOpenFor, setInviteOpenFor] = useState(null); // channelId
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

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/friends/search`, {
        params: { q, userId: user.id }
      });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    await onSendFriendRequest(targetUserId);
    setSearchQuery('');
    setSearchResults([]);
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

      {/* Входящие приглашения в каналы */}
      {channelInvites.length > 0 && (
        <div className="channel-invites-list">
          {channelInvites.map(inv => (
            <div key={inv._id} className="channel-invite-item">
              <span className="ch-inv-text">
                <span className="hash">#</span>{inv.channel.name}
                <span className="req-from"> from @{inv.sender.username}</span>
              </span>
              <button className="req-accept-btn" onClick={() => onAcceptChannelInvite(inv._id)} title="join">✓</button>
              <button className="req-reject-btn" onClick={() => onRejectChannelInvite(inv._id)} title="decline">✕</button>
            </div>
          ))}
        </div>
      )}

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
            {/* Invite button — for any member */}
            <button
              className="channel-invite-btn"
              title="invite friend"
              onClick={(e) => { e.stopPropagation(); setInviteOpenFor(inviteOpenFor === ch._id ? null : ch._id); }}
            >[+]</button>
            {inviteOpenFor === ch._id && friends.length > 0 && (
              <div className="invite-dropdown">
                {friends.map(f => (
                  <div
                    key={f._id}
                    className="invite-dropdown-item"
                    onClick={(e) => { e.stopPropagation(); onSendChannelInvite(ch._id, f._id); setInviteOpenFor(null); }}
                  >@{f.username}</div>
                ))}
              </div>
            )}
            {inviteOpenFor === ch._id && friends.length === 0 && (
              <div className="invite-dropdown"><div className="invite-dropdown-item" style={{color:'var(--text-dim)'}}>no friends yet</div></div>
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
          autoComplete="off"
        />
      </form>

      {/* Connections section */}
      <p className="channels-title">
        // connections
        {(pendingRequests.length + channelInvites.length) > 0 && (
          <span className="pending-badge"> [{pendingRequests.length + channelInvites.length} req]</span>
        )}
      </p>

      {/* User search */}
      <div className="friend-search">
        <input
          className="new-channel-input"
          type="text"
          placeholder="⌕ find user..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          autoComplete="off"
        />
        {searching && <p className="search-hint">// scanning...</p>}
        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
          <p className="search-hint">// no users found</p>
        )}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(u => (
              <div key={u._id} className="search-result-item">
                <span className="online-name">@{u.username}</span>
                <button className="req-btn" onClick={() => handleSendRequest(u._id)}>[+add]</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending incoming requests */}
      {pendingRequests.length > 0 && (
        <div className="pending-requests">
          {pendingRequests.map(req => (
            <div key={req._id} className="pending-request-item">
              <span className="online-name">@{req.sender.username}</span>
              <span className="req-from"> wants to connect</span>
              <button className="req-accept-btn" onClick={() => onAcceptRequest(req._id, req.sender)} title="accept">✓</button>
              <button className="req-reject-btn" onClick={() => onRejectRequest(req._id)} title="reject">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div className="online-list">
        {friends.length === 0 && pendingRequests.length === 0 && (
          <p className="no-friends">// no connections yet</p>
        )}
        {friends.map((f) => (
          <div
            key={f._id}
            className={`online-item ${activeDM?.id === f._id ? 'active' : ''}`}
            onClick={() => { onOpenDM?.({ id: f._id, username: f.username }); onClose?.(); }}
            title={`DM @${f.username}`}
            style={{ cursor: 'pointer' }}
          >
            <span className={`online-status status-${f.status.toLowerCase()}`}>●</span>
            <span className="online-name">@{f.username}</span>
            <span className={`online-badge status-${f.status.toLowerCase()}`}>[{f.status}]</span>
            {unreadDM[f._id] > 0 && (
              <span className="unread-badge dm-unread">{unreadDM[f._id]}</span>
            )}
          </div>
        ))}
      </div>

      <button className="logout-btn" onClick={onLogout}>
        $ disconnect
      </button>
    </div>
  );
};

export default Sidebar;
