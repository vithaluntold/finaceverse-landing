import React, { useState } from 'react'
import { Helmet } from 'react-helmet'
import './superadmin-login.css'

const SuperAdminLogin = () => {
  const [masterKey, setMasterKey] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTotp, setShowTotp] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/vault-e9232b8eefbaa45e/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          masterKey,
          password,
          totpCode: totpCode || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'TOTP_REQUIRED') {
          setShowTotp(true)
          setError('TOTP code required')
        } else {
          setError(data.error || 'Authentication failed')
        }
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
              placeholder="Enter master key"
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

          {showTotp && (
            <div className="form-group">
              <label htmlFor="totpCode">TOTP Code</label>
              <input
                type="text"
                id="totpCode"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Access Vault'}
          </button>
        </form>

        <div className="login-footer">
          <p>🔐 Multi-factor authentication required</p>
          <p>15-minute session timeout • IP logged</p>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminLogin
