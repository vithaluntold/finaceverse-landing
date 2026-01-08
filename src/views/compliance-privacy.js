import React from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './compliance-privacy.css'

const CompliancePrivacy = (props) => {
  return (
    <div className="compliance-privacy-container1">
      <Helmet>
        <title>Compliance & Privacy - FinACEverse</title>
        <meta
          property="og:title"
          content="Compliance & Privacy - FinACEverse"
        />
        <link
          rel="canonical"
          href="https://scary-impeccable-ibex-vzbllw.teleporthq.app/compliance-privacy"
        />
      </Helmet>
      <Navigation></Navigation>
      <section className="compliance-hero">
        <div className="compliance-hero-overlay"></div>
        <video
          autoPlay="true"
          muted="true"
          loop="true"
          playsInline="true"
          poster="https://images.pexels.com/videos/6266762/pictures/preview-0.jpg"
          src="https://videos.pexels.com/video-files/6266762/6266762-hd_1280_720_25fps.mp4"
          className="compliance-hero-video"
        ></video>
        <div className="compliance-hero-diagonal"></div>
        <div className="compliance-hero-content">
          <div className="compliance-hero-text">
            <h1 className="hero-title">
              Compliance &amp; Privacy Architecture
            </h1>
            <p className="hero-subtitle">
              Redefining trust through the Verifiable Arithmetic Multi-Stream
              Network. FinACEverse integrates regulatory alignment, data
              governance, and uncompromising security into the core of financial
              operations.
            </p>
            <div className="compliance-hero-actions">
              <a href="#frameworks">
                <div className="btn btn-primary btn-lg">
                  <span>Explore Frameworks</span>
                </div>
              </a>
              <a href="#controls">
                <div className="btn btn-lg btn-outline">
                  <span>Security Controls</span>
                </div>
              </a>
            </div>
          </div>
          <div className="compliance-hero-visual">
            <div className="compliance-hero-card">
              <div className="compliance-hero-card-header">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                  <path d="m9 12l2 2l4-4"></path>
                </svg>
                <span>VAMN Verified</span>
              </div>
              <div className="compliance-hero-card-body">
                <div className="compliance-hero-stat">
                  <span className="compliance-hero-stat-value">100%</span>
                  <span className="compliance-hero-stat-label">
                    Audit Lineage
                  </span>
                </div>
                <div className="compliance-hero-stat">
                  <span className="compliance-hero-stat-value">Zero</span>
                  <span className="compliance-hero-stat-label">
                    Data Fragmentation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="frameworks" className="compliance-frameworks">
        <div className="compliance-frameworks-container">
          <div className="compliance-frameworks-header">
            <h2 className="section-title">Regulatory Alignment Strategy</h2>
            <p className="section-subtitle">
              FinACEverse is designed with global regulatory standards in mind. Our architecture supports
              compliance requirements through VAMN and Accute orchestration, with ongoing work to achieve
              formal certifications as we grow.
            </p>
          </div>
        </div>
      </section>
      <section className="compliance-lineage">
        <div className="compliance-lineage-container">
          <div className="compliance-lineage-header">
            <h2 className="section-title">Data Governance &amp; Lineage</h2>
            <p className="section-subtitle">
              How Cyloid transforms raw documents into indisputable, auditable
              facts.
            </p>
          </div>
          <div className="compliance-lineage-timeline">
            <div className="compliance---privacy-timeline-item">
              <div className="compliance---privacy-timeline-content">
                <h3 className="section-subtitle">
                  Ingestion &amp; Classification
                </h3>
                <p className="section-content">
                  Every document entering the ecosystem is automatically
                  classified using Cyloid&apos;s mathematical verification,
                  identifying PII and sensitive financial data.
                </p>
              </div>
              <div className="timeline-marker">
                <span>1</span>
              </div>
            </div>
            <div className="compliance---privacy-timeline-item">
              <div className="compliance---privacy-timeline-content">
                <h3 className="section-subtitle">VAMN Processing</h3>
                <p className="section-content">
                  Data is processed through specialized cognitive streams,
                  ensuring that every calculation adheres to the firm&apos;s
                  source of truth defined in Accute.
                </p>
              </div>
              <div className="timeline-marker">
                <span>2</span>
              </div>
            </div>
            <div className="compliance---privacy-timeline-item">
              <div className="compliance---privacy-timeline-content">
                <h3 className="section-subtitle">Lineage Validation</h3>
                <p className="section-content">
                  End-to-end lineage is recorded, allowing auditors to trace any
                  financial figure back to its original source document with
                  100% certainty.
                </p>
              </div>
              <div className="timeline-marker">
                <span>3</span>
              </div>
            </div>
            <div className="compliance---privacy-timeline-item">
              <div className="compliance---privacy-timeline-content">
                <h3 className="section-subtitle">Retention &amp; Archival</h3>
                <p className="section-content">
                  Automated retention policies ensure data is stored securely
                  for the required legal duration and purged once compliance
                  windows expire.
                </p>
              </div>
              <div className="timeline-marker">
                <span>4</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="controls" className="compliance-controls">
        <div className="compliance-controls-container">
          <div className="compliance-controls-header">
            <h2 className="section-title">Technical Safeguards</h2>
            <p className="section-subtitle">
              Privacy-by-design architecture protecting your most sensitive
              client data.
            </p>
          </div>
          <div className="compliance-controls-bento">
            <div className="compliance---privacy-bento-cell wide">
              <div className="bento-content">
                <div className="bento-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      width="18"
                      height="11"
                      x="3"
                      y="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3 className="section-subtitle">Multi-Layer Encryption</h3>
                <p className="section-content">
                  Data is encrypted at rest using AES-256 and in transit via TLS
                  1.3. VAMN adds an additional layer of arithmetic obfuscation
                  for sensitive computation streams, ensuring even internal
                  processes cannot leak raw PII.
                </p>
              </div>
              <img
                src="https://images.pexels.com/photos/30547568/pexels-photo-30547568.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                alt="Encryption Visualization"
                className="bento-bg"
              />
            </div>
            <div className="compliance---privacy-bento-cell tall">
              <div className="bento-content">
                <div className="bento-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12l2 2l4-4"></path>
                  </svg>
                </div>
                <h3 className="section-subtitle">Access Control</h3>
                <p className="section-content">
                  Granular RBAC and MFA enforcement integrated with Accute
                  workflows.
                </p>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell tall">
              <div className="bento-content">
                <div className="bento-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                  </svg>
                </div>
                <h3 className="section-subtitle">Anonymization</h3>
                <p className="section-content">
                  Real-time data masking for analytics and cross-border
                  reporting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="compliance---privacy-compliance-stats">
        <div className="compliance-stats-container">
          <div className="compliance-stats-header">
            <h2 className="section-title">Compliance Metrics</h2>
            <p className="section-subtitle">
              Quantifiable evidence of the FinACEverse operational advantage.
            </p>
          </div>
          <div className="compliance-stats-bento">
            <div className="compliance---privacy-bento-cell wide">
              <div className="bento-content">
                <div className="stat-large">
                  <span>99.9%</span>
                </div>
                <h3 className="section-subtitle">Verification Accuracy</h3>
                <p className="section-content">
                  VAMN’s verifiable arithmetic streams eliminate human error in
                  complex financial reporting cycles, providing immutable
                  evidence for regulators.
                </p>
              </div>
              <img
                src="https://images.pexels.com/photos/18069858/pexels-photo-18069858.png?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                alt="Data Flow"
                className="bento-bg"
              />
            </div>
            <div className="compliance---privacy-bento-cell tall">
              <div className="bento-content">
                <div className="stat-medium">
                  <span>-85%</span>
                </div>
                <h3 className="section-subtitle">Audit Prep Time</h3>
                <p className="section-content">
                  Automated lineage reduces the time required for external audit
                  evidence gathering.
                </p>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell tall">
              <div className="bento-content">
                <div className="stat-medium">
                  <span>0</span>
                </div>
                <h3 className="section-subtitle">Compliance Gaps</h3>
                <p className="section-content">
                  Real-time monitoring of regulatory shifts through the EPI-Q
                  intelligence module.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="compliance-about">
        <div className="compliance-about-container">
          <div className="compliance-about-header">
            <h2 className="section-title">Operational Responsibility</h2>
            <p className="section-subtitle">
              How Accute enforces segregation of duties and organizational
              integrity.
            </p>
          </div>
          <div className="compliance-about-bento">
            <div className="compliance---privacy-bento-cell wide">
              <div className="bento-content">
                <div className="bento-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3 className="section-subtitle">Shared Ontology Framework</h3>
                <p className="section-content">
                  Accute establishes a unified language across finance,
                  accounting, and taxation. This shared source of truth ensures
                  that responsibilities are clearly assigned, preventing
                  conflicts of interest and ensuring that compliance causality
                  is maintained across every team.
                </p>
              </div>
              <img
                src="https://images.pexels.com/photos/17485744/pexels-photo-17485744.png?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                alt="Team Synergy"
                className="bento-bg"
              />
            </div>
            <div className="compliance---privacy-bento-cell tall">
              <div className="bento-content">
                <h3 className="section-subtitle">Segregation of Duties</h3>
                <p className="section-content">
                  Automated workflow gates ensure no single user can initiate
                  and approve critical financial transactions.
                </p>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell tall">
              <div className="bento-content">
                <h3 className="section-subtitle">Audit Trails</h3>
                <p className="section-content">
                  Every action within the Cognitive OS is timestamped and
                  attributed, creating a permanent record of accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="compliance-support">
        <div className="compliance-support-container">
          <div className="compliance-support-header">
            <h2 className="section-title">Support Hub &amp; Resources</h2>
            <p className="section-subtitle">
              Access the tools and documentation needed for deep regulatory
              scrutiny.
            </p>
          </div>
          <div className="compliance-support-bento">
            <div className="compliance---privacy-bento-cell item-1">
              <div className="bento-content">
                <h3 className="section-subtitle">Whitepapers</h3>
                <p className="section-content">
                  The VAMN Architecture: Arithmetic Verification in Finance.
                </p>
                <a href="/request-demo">
                  <div className="btn btn-link">
                    <span>Download PDF</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell item-2">
              <div className="bento-content">
                <h3 className="section-subtitle">Compliance Playbooks</h3>
                <p className="section-content">
                  Step-by-step guides for SOC 2 and GDPR alignment using
                  FinACEverse.
                </p>
                <a href="/request-demo">
                  <div className="btn btn-link">
                    <span>View Guides</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell item-3">
              <div className="bento-content">
                <h3 className="section-subtitle">Request Reports</h3>
                <p className="section-content">
                  Access our latest SOC 2 Type II and ISO audit summaries.
                </p>
                <a href="/request-demo">
                  <button className="btn btn-secondary btn-sm">
                    Request Access
                  </button>
                </a>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell item-4">
              <div className="bento-content">
                <h3 className="section-subtitle">Privacy FAQ</h3>
                <p className="section-content">
                  Common questions about data residency, encryption, and our
                  privacy-by-design approach.
                </p>
                <a href="/request-demo">
                  <div className="btn btn-link">
                    <span>Read FAQ</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="compliance---privacy-bento-cell item-5">
              <div className="bento-content">
                <h3 className="section-subtitle">Inquiry Center</h3>
                <p className="section-content">
                  Direct line to our Data Protection Officer and Compliance
                  Team.
                </p>
                <a href="/expert-consultation">
                  <button className="btn btn-sm btn-accent">
                    Contact Compliance
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="compliance-cta">
        <div className="compliance-cta-diagonal"></div>
        <div className="compliance-cta-content">
          <div className="compliance-cta-main">
            <h2 className="hero-title">Secure Your Future</h2>
            <p className="hero-subtitle">
              Schedule a compliance briefing or privacy impact assessment
              tailored to your firm&apos;s specific regulatory needs.
            </p>
          </div>
          <div className="compliance-cta-side">
            <div className="compliance-cta-actions">
              <a href="/expert-consultation" className="btn btn-primary btn-xl">
                Schedule Briefing
              </a>
              <a href="/request-demo" className="btn btn-outline btn-xl">Request Demo</a>
            </div>
          </div>
        </div>
      </section>
      <div className="compliance-privacy-container2">
        <div className="compliance-privacy-container3">
          <Script
            html={`<script defer data-name="compliance-interactions">
(function(){
  const observerOptions = {
    threshold: 0.1,
  }

  const revealOnScroll = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
        revealOnScroll.unobserve(entry.target)
      }
    })
  }, observerOptions)

  document.querySelectorAll(".bento-cell, .timeline-item, .compliance-frameworks-table tr").forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = "all 0.6s cubic-bezier(0.23, 1, 0.32, 1)"
    revealOnScroll.observe(el)
  })

  const heroCard = document.querySelector(".compliance-hero-card")
  if (heroCard) {
    window.addEventListener("mousemove", (e) => {
      const xAxis = (window.innerWidth / 2 - e.pageX) / 25
      const yAxis = (window.innerHeight / 2 - e.pageY) / 25
      heroCard.style.transform = \`perspective(1000px) rotateY(\${xAxis}deg) rotateX(\${yAxis}deg)\`
    })

    window.addEventListener("mouseleave", () => {
      heroCard.style.transform = \`perspective(1000px) rotateY(-15deg) rotateX(0deg)\`
    })
  }
})()
</script>`}
          ></Script>
        </div>
      </div>
      <Footer></Footer>
      <a href="/request-demo">
        <div
          aria-label="FinACEverse"
          className="compliance-privacy-container4"
        >
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px'}} />
          <span className="compliance-privacy-text42">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  )
}

export default CompliancePrivacy
