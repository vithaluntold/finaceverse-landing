import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './unsubscribe.css'

const Unsubscribe = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [message, setMessage] = useState('')
  
  // Try to get email from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [])
  
  const handleUnsubscribe = async (e) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }
    
    setStatus('loading')
    
    try {
      const response = await fetch('/api/mailgun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'unsubscribe', 
          email 
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setStatus('success')
        setMessage('You have been successfully unsubscribed from our newsletter.')
      } else {
        setStatus('error')
        setMessage(result.message || 'Failed to unsubscribe. Please try again.')
      }
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setStatus('error')
      setMessage('An error occurred. Please try again later.')
    }
  }
  
  return (
    <div className="unsubscribe-container">
      <Helmet>
        <title>Unsubscribe - FinACEverse Newsletter</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Navigation />
      
      <section className="unsubscribe-main">
        <div className="container-wrapper">
          <div className="unsubscribe-content">
            {status === 'success' ? (
              <div className="unsubscribe-success">
                <div className="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h1 className="hero-title">Unsubscribed Successfully</h1>
                <p className="hero-subtitle">{message}</p>
                <p className="section-content" style={{marginTop: '20px'}}>
                  We're sorry to see you go. If you change your mind, you can always 
                  resubscribe from any of our newsletter signup forms.
                </p>
                <div style={{marginTop: '32px'}}>
                  <a href="/" className="btn btn-primary">
                    Return to Home
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="unsubscribe-header">
                  <h1 className="hero-title">Unsubscribe from Newsletter</h1>
                  <p className="hero-subtitle">
                    We're sorry to see you go. Enter your email below to unsubscribe from our Cognitive Insights newsletter.
                  </p>
                </div>
                
                <form onSubmit={handleUnsubscribe} className="unsubscribe-form">
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="form-input"
                      disabled={status === 'loading'}
                    />
                  </div>
                  
                  {status === 'error' && (
                    <div className="error-message">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      {message}
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Processing...' : 'Unsubscribe'}
                  </button>
                  
                  <p className="form-note">
                    You can also contact us at{' '}
                    <a href="mailto:vithal@finacegroup.com">vithal@finacegroup.com</a>
                    {' '}for assistance.
                  </p>
                </form>
                
                <div className="feedback-section">
                  <h3 className="section-subtitle">Before you go...</h3>
                  <p className="section-content">
                    We'd love to know how we can improve. Consider adjusting your preferences 
                    instead of unsubscribing completely:
                  </p>
                  <ul className="preference-list">
                    <li>Receive only monthly digests instead of weekly updates</li>
                    <li>Get notifications only for major product announcements</li>
                    <li>Subscribe to specific topics like compliance or technology</li>
                  </ul>
                  <p className="section-content" style={{marginTop: '16px'}}>
                    <a href="mailto:vithal@finacegroup.com?subject=Newsletter Preferences">
                      Contact us to adjust your preferences
                    </a>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  )
}

export default Unsubscribe
