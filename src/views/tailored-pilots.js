import React from 'react'
import { Helmet } from 'react-helmet'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import Breadcrumb from '../components/breadcrumb'
import './tailored-pilots.css'

const TailoredPilots = (props) => {
  return (
    <div className="tailored-pilots-container">
      <Helmet>
        <title>Tailored Pilots - FinACEverse | Customized AI Finance Implementation</title>
        <meta name="description" content="Experience FinACEverse with a customized pilot program. We tailor our cognitive finance platform to your specific needs and workflows." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta property="og:title" content="Tailored Pilots - FinACEverse" />
        <meta property="og:description" content="Customized pilot programs for cognitive finance implementation." />
        <meta property="og:url" content="https://finaceverse.io/tailored-pilots" />
        <link rel="canonical" href="https://finaceverse.io/tailored-pilots" />
      </Helmet>
      <Navigation></Navigation>
      
      <div className="container-wrapper" style={{paddingTop: 'var(--spacing-lg)'}}>
        <Breadcrumb />
      </div>
      
      <section className="pilots-hero">
        <div className="pilots-hero-bg">
          <video
            autoPlay="true"
            muted="true"
            loop="true"
            playsInline="true"
            poster="https://images.pexels.com/videos/34127955/pictures/preview-0.jpg"
            src="https://videos.pexels.com/video-files/34127955/14471454_640_360_30fps.mp4"
          ></video>
          <div className="pilots-hero-overlay"></div>
        </div>
        <div className="pilots-hero-content">
          <span className="pilots-badge">Custom Implementation</span>
          <h1 className="section-title">Tailored Pilot Programs</h1>
          <p className="pilots-description">
            Request a custom pilot program designed for your enterprise or
            professional service firm. Experience the Cognitive Operating System
            adapted to your unique workflows and compliance requirements.
          </p>
        </div>
      </section>

      <section className="pilots-benefits">
        <div className="content-container">
          <h2 className="section-title">What's Included</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Custom Configuration</h3>
              <p className="section-content">
                Tailored deployment matching your existing tech stack, data sources,
                and compliance frameworks.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5S5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05c1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Dedicated Support</h3>
              <p className="section-content">
                Direct access to our Cognitive OS architects and implementation
                specialists throughout the pilot phase.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Flexible Timeline</h3>
              <p className="section-content">
                Pilot programs ranging from 30 to 90 days, with milestone-based
                evaluation and gradual rollout options.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">ROI Analysis</h3>
              <p className="section-content">
                Comprehensive metrics tracking efficiency gains, error reduction,
                and time saved across all deployed modules.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pilots-process">
        <div className="content-container">
          <h2 className="section-title">Pilot Journey</h2>
          <div className="process-timeline">
            <div className="timeline-step">
              <div className="step-number">1</div>
              <h3 className="section-subtitle">Discovery Call</h3>
              <p className="section-content">
                30-minute consultation to understand your current pain points,
                workflows, and objectives.
              </p>
            </div>

            <div className="timeline-step">
              <div className="step-number">2</div>
              <h3 className="section-subtitle">Custom Proposal</h3>
              <p className="section-content">
                Detailed pilot plan including module selection, integration scope,
                timeline, and success metrics.
              </p>
            </div>

            <div className="timeline-step">
              <div className="step-number">3</div>
              <h3 className="section-subtitle">Implementation</h3>
              <p className="section-content">
                Guided deployment with your team, data migration support, and
                initial training sessions.
              </p>
            </div>

            <div className="timeline-step">
              <div className="step-number">4</div>
              <h3 className="section-subtitle">Evaluation & Scale</h3>
              <p className="section-content">
                Review results, gather feedback, and plan full-scale deployment
                or additional module integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pilots-cta">
        <div className="content-container">
          <h2 className="section-title">Ready to Start Your Pilot?</h2>
          <p className="pilots-cta-text">
            Join forward-thinking firms already transforming their financial operations
            with cognitive intelligence.
          </p>
          <form className="pilots-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="Full Name"
                required
                className="form-input"
              />
              <input
                type="email"
                placeholder="Business Email"
                required
                className="form-input"
              />
            </div>
            <div className="form-row">
              <input
                type="text"
                placeholder="Company Name"
                required
                className="form-input"
              />
              <input
                type="text"
                placeholder="Company Size"
                required
                className="form-input"
              />
            </div>
            <textarea
              placeholder="Tell us about your current challenges and objectives"
              required
              className="form-textarea"
              rows="4"
            ></textarea>
            <button type="submit" className="btn btn-primary btn-lg">
              Request Pilot Program
            </button>
          </form>
        </div>
      </section>

      <Footer></Footer>
      <a href="/request-demo">
        <div aria-label="FinACEverse" className="pilots-container-floating">
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px'}} />
          <span className="pilots-text-floating">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  )
}

export default TailoredPilots
