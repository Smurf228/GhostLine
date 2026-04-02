import { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const Login = ({ onSwitch, onAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/auth/login`, {
        username,
        password,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onAuth(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Connection failed');
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleSubmit}>
        <h2><span className="auth-prefix">&gt;</span>ACCESS TERMINAL</h2>
        <p className="auth-sub">// authenticate to proceed</p>

        {error && <p className="auth-error">[ERROR] {error}</p>}

        <div className="auth-field">
          <label>HANDLE</label>
          <input
            type="text"
            placeholder="@username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label>PASSKEY</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-btn">
          $ LOGIN<span className="cursor-blink">█</span>
        </button>

        <p className="auth-switch">
          No access? <span onClick={onSwitch}>Create handle</span>
        </p>
      </form>
    </div>
  );
};

export default Login;
