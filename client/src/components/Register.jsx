import { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const Register = ({ onSwitch, onAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Handle must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      setError('Passkey must be at least 6 characters');
      return;
    }

    try {
      const res = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/auth/register`, {
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
        <h2><span className="auth-prefix">&gt;</span>NEW IDENTITY</h2>
        <p className="auth-sub">// create your ghost handle</p>

        {error && <p className="auth-error">[ERROR] {error}</p>}

        <div className="auth-field">
          <label>HANDLE (3-20 chars)</label>
          <input
            type="text"
            placeholder="@username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label>PASSKEY (min 6 chars)</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-btn">
          $ CREATE HANDLE<span className="cursor-blink">█</span>
        </button>

        <p className="auth-switch">
          Already have access? <span onClick={onSwitch}>Login</span>
        </p>
      </form>
    </div>
  );
};

export default Register;
