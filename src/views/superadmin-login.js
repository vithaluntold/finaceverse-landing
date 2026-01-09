import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import './superadmin-login.css'

const SuperAdminLogin = () => {
  const [masterKey, setMasterKey] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          masterKey,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Authentication failed')
        setLoading(false)
        return
      }

      // Store tokens securely
      localStorage.setItem('superadmin_token', data.accessToken)
      localStorage.setItem('superadmin_refresh', data.refreshToken)
      
      // Redirect to dashboard
      window.location.href = '/vault-e9232b8eefbaa45e/dashboard'
    } catch (err) {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="superadmin-login-container">
      <Helmet>
        <title>Vault Access | FinACEverse</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="login-card">
        <div className="login-header">
          <img src="/logo.svg" alt="FinACEverse" className="login-logo" />
          <h1>Vault Access</h1>
          <p>SuperAdmin Authentication Required</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="masterKey">Master Key</label>
            <input
              type="password"
              id="masterKey"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="Paste master key"
              required
              autoComplete="off"
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
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>🔐 Master key + password authentication</p>
          <p>IP whitelist • Session fingerprinting • Auto-lockout</p>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminLogin
