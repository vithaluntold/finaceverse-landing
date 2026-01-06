import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './analytics-login.css';

const AnalyticsLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      localStorage.setItem('analytics_token', data.token);
      localStorage.setItem('analytics_user', data.username);

      // Redirect to dashboard
      navigate('/analytics/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics-login-container">
      <div className="analytics-login-box">
        <div className="analytics-login-header">
          <h1>FinACEverse Analytics</h1>
          <p>Secure Dashboard Access</p>
        </div>
        
        <form onSubmit={handleLogin} className="analytics-login-form">
          {error && <div className="analytics-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          
          <button type="submit" className="analytics-login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="analytics-login-footer">
          <p>🔒 Protected with JWT authentication</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsLogin;
