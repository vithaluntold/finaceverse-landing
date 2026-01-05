import React from 'react'
import { Helmet } from 'react-helmet'
import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './expert-consultation.css'

const ExpertConsultation = (props) => {
  return (
    <div className="consultation-container">
      <Helmet>
        <title>Expert Consultation - FinACEverse</title>
        <meta property="og:title" content="Expert Consultation - FinACEverse" />
      </Helmet>
      <Navigation></Navigation>
      
      <section className="consultation-hero">
        <div className="consultation-hero-bg">
          <video
            autoPlay="true"
            muted="true"
            loop="true"
            playsInline="true"
            poster="https://images.pexels.com/videos/34127955/pictures/preview-0.jpg"
            src="https://videos.pexels.com/video-files/34127955/14471454_640_360_30fps.mp4"
          ></video>
          <div className="consultation-hero-overlay"></div>
        </div>
        <div className="consultation-hero-content">
          <span className="consultation-badge">Strategic Guidance</span>
          <h1 className="section-title">Expert Consultation</h1>
          <p className="consultation-description">
            Speak with a Cognitive OS architect to map your transition from
            traditional financial operations to an intelligent, unified ecosystem.
          </p>
        </div>
      </section>

      <section className="consultation-value">
        <div className="content-container">
          <h2 className="section-title">Why Consult With Us</h2>
          <div className="value-grid">
            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Deep Technical Expertise</h3>
              <p className="section-content">
                Our architects designed VAMN's cognitive streams and Accute's
                orchestration logic from the ground up.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1s-1-.45-1-1s.45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Industry-Specific Insights</h3>
              <p className="section-content">
                Tailored recommendations for accounting firms, tax practitioners,
                or corporate finance teams.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9 11.75A1.25 1.25 0 0 0 7.75 13A1.25 1.25 0 0 0 9 14.25A1.25 1.25 0 0 0 10.25 13A1.25 1.25 0 0 0 9 11.75zm6 0A1.25 1.25 0 0 0 13.75 13A1.25 1.25 0 0 0 15 14.25A1.25 1.25 0 0 0 16.25 13A1.25 1.25 0 0 0 15 11.75zM12 2C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Roadmap Planning</h3>
              <p className="section-content">
                Clear, phased implementation plan aligned with your operational
                priorities and resource constraints.
              </p>
            </div>

            <div className="value-card">
              <div className="value-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <h3 className="section-subtitle">Compliance Guidance</h3>
              <p className="section-content">
                Navigate regulatory requirements and understand how FinACEverse
                supports your compliance obligations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="consultation-topics">
        <div className="content-container">
          <h2 className="section-title">What We'll Cover</h2>
          <div className="topics-list">
            <div className="topic-item">
              <div className="topic-bullet"></div>
              <div className="topic-content">
                <h3 className="section-subtitle">Current State Assessment</h3>
                <p className="section-content">
                  Review your existing tech stack, pain points, and inefficiencies
                  in financial workflows.
                </p>
              </div>
            </div>

            <div className="topic-item">
              <div className="topic-bullet"></div>
              <div className="topic-content">
                <h3 className="section-subtitle">Module Selection</h3>
                <p className="section-content">
                  Identify which of the 7 modules align with your immediate needs
                  and long-term strategy.
                </p>
              </div>
            </div>

            <div className="topic-item">
              <div className="topic-bullet"></div>
              <div className="topic-content">
                <h3 className="section-subtitle">Integration Architecture</h3>
                <p className="section-content">
                  Design integration points with your existing systems, data sources,
                  and third-party tools.
                </p>
              </div>
            </div>

            <div className="topic-item">
              <div className="topic-bullet"></div>
              <div className="topic-content">
                <h3 className="section-subtitle">Change Management</h3>
                <p className="section-content">
                  Plan team training, adoption strategies, and transition timelines
                  to minimize disruption.
                </p>
              </div>
            </div>

            <div className="topic-item">
              <div className="topic-bullet"></div>
              <div className="topic-content">
                <h3 className="section-subtitle">Success Metrics</h3>
                <p className="section-content">
                  Define KPIs and measurement frameworks to track ROI and operational
                  improvements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="consultation-booking">
        <div className="content-container">
          <h2 className="section-title">Schedule Your Consultation</h2>
          <p className="consultation-booking-text">
            Book a 45-minute strategic consultation with one of our Cognitive OS
            architects. No sales pressure—just expert guidance.
          </p>
          <form className="consultation-form">
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
                placeholder="Role/Title"
                required
                className="form-input"
              />
            </div>
            <div className="form-row">
              <input
                type="tel"
                placeholder="Phone Number"
                className="form-input"
              />
              <select className="form-input" required>
                <option value="">Preferred Time Zone</option>
                <option value="EST">Eastern (EST)</option>
                <option value="CST">Central (CST)</option>
                <option value="MST">Mountain (MST)</option>
                <option value="PST">Pacific (PST)</option>
                <option value="UTC">UTC/GMT</option>
                <option value="IST">India (IST)</option>
                <option value="SGT">Singapore (SGT)</option>
              </select>
            </div>
            <textarea
              placeholder="What specific challenges or questions do you want to address?"
              required
              className="form-textarea"
              rows="4"
            ></textarea>
            <button type="submit" className="btn btn-primary btn-lg">
              Schedule Consultation
            </button>
          </form>
        </div>
      </section>

      <Footer></Footer>
    </div>
  )
}

export default ExpertConsultation
