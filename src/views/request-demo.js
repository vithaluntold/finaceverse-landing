import React from 'react'
import { Helmet } from 'react-helmet'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './request-demo.css'

const RequestDemo = (props) => {
  return (
    <div className="demo-container">
      <Helmet>
        <title>Request Demo - FinACEverse | See Cognitive Finance in Action</title>
        <meta name="description" content="Schedule a personalized demo of FinACEverse. See how VAMN, Accute, and Cyloid transform financial operations with AI-powered automation and verification." />
        <meta name="keywords" content="FinACEverse demo, financial software demo, VAMN demo, AI finance demo, accounting automation demo" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta property="og:title" content="Request Demo - FinACEverse" />
        <meta property="og:description" content="See FinACEverse in action. Watch how our Cognitive OS transforms fragmented financial operations." />
        <meta property="og:url" content="https://finaceverse.io/request-demo" />
        <link rel="canonical" href="https://finaceverse.io/request-demo" />
      </Helmet>
      <Navigation></Navigation>
      
      <section className="demo-hero">
        <div className="demo-hero-bg">
          <video
            autoPlay="true"
            muted="true"
            loop="true"
            playsInline="true"
            poster="https://images.pexels.com/videos/34127955/pictures/preview-0.jpg"
            src="https://videos.pexels.com/video-files/34127955/14471454_640_360_30fps.mp4"
          ></video>
          <div className="demo-hero-overlay"></div>
        </div>
        <div className="demo-hero-content">
          <span className="demo-badge">Experience the Future</span>
          <h1 className="section-title">Request Demo</h1>
          <p className="demo-description">
            See FinACEverse in action. Watch how our Cognitive OS transforms
            fragmented financial operations into a unified, intelligent ecosystem.
          </p>
        </div>
      </section>

      <section className="demo-value">
        <div className="content-container">
          <h2 className="section-title">What You'll See</h2>
          <div className="value-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Live VAMN Intelligence</h3>
              <p className="section-content">
                Watch how Verifiable Arithmetic Multi-Stream Network processes
                financial data with cognitive precision.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87l1.18 6.88L12 17.77l-6.18 3.25L7 14.14L2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Accute Orchestration</h3>
              <p className="section-content">
                See how Accute unifies accounting, finance, and tax workflows
                across your entire organization.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Cyloid Verification</h3>
              <p className="section-content">
                Experience mathematical document verification that turns every
                input into an indisputable fact.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.39 3.39 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.39 3.39 0 0 0 15 11a3.5 3.5 0 0 0 0-7Z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Scale Without Headcount</h3>
              <p className="section-content">
                Discover how Finaid Hub and Luca enable your firm to handle
                10x volume with your existing team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-features">
        <div className="content-container">
          <h2 className="section-title">Demo Highlights</h2>
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-bullet"></div>
              <div className="feature-content">
                <h3 className="section-subtitle">Document Intelligence</h3>
                <p className="section-content">
                  Watch Cyloid extract, verify, and validate financial documents
                  in real-time with zero manual intervention.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-bullet"></div>
              <div className="feature-content">
                <h3 className="section-subtitle">Workflow Automation</h3>
                <p className="section-content">
                  See how Accute orchestrates end-to-end financial processes from
                  bookkeeping to tax filing.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-bullet"></div>
              <div className="feature-content">
                <h3 className="section-subtitle">Compliance Causality</h3>
                <p className="section-content">
                  Understand how every financial fact traces back to its source
                  with complete audit trails.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-bullet"></div>
              <div className="feature-content">
                <h3 className="section-subtitle">Predictive Intelligence</h3>
                <p className="section-content">
                  Experience EPI-Q's predictive tax optimization and Finory's
                  real-time financial reporting.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-bullet"></div>
              <div className="feature-content">
                <h3 className="section-subtitle">AI-Powered Expertise</h3>
                <p className="section-content">
                  Ask Luca complex accounting and tax questions and get expert-level
                  answers with source citations.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-bullet"></div>
              <div className="feature-content">
                <h3 className="section-subtitle">Client Collaboration</h3>
                <p className="section-content">
                  See how Sumbuddy creates a seamless communication layer between
                  your team and clients.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-booking">
        <div className="content-container">
          <h2 className="section-title">Schedule Your Demo</h2>
          <p className="demo-booking-text">
            Book a 30-minute personalized demo with our team. We'll customize the
            session based on your firm's specific needs and use cases.
          </p>
          
          <div className="demo-cta-container">
            <a 
              href="mailto:info@finacegroup.com?subject=Demo Request&body=I'm interested in scheduling a demo of FinACEverse.%0D%0A%0D%0AName:%0D%0ACompany:%0D%0ARole:%0D%0APreferred Date/Time:%0D%0ASpecific Areas of Interest:" 
              className="btn btn-primary btn-lg"
            >
              Request Demo via Email
            </a>
            <p className="demo-note section-content">
              Or call us directly at <a href="tel:+1234567890" style={{color: 'var(--color-primary)'}}>+1 (234) 567-890</a>
            </p>
          </div>
        </div>
      </section>

      <Footer></Footer>
      <a href="/request-demo">
        <div aria-label="FinACEverse" className="demo-container-floating">
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px'}} />
          <span className="demo-text-floating">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  )
}

export default RequestDemo
