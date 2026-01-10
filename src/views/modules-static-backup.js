import React, { useState, useEffect } from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './modules.css'

const Modules = (props) => {
  const [viewMode, setViewMode] = useState('current'); // 'current' or 'vision'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`/api/products?view=${viewMode}`);
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        // Fallback to showing all static content if API fails
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [viewMode]);

  // Helper to check if a product should be shown
  const isProductVisible = (slug) => {
    if (products.length === 0) return true; // Show all if no API data
    const product = products.find(p => p.slug === slug);
    return product !== undefined;
  };

  // Helper to get status badge for a product
  const getStatusBadge = (slug) => {
    if (products.length === 0) return null;
    const product = products.find(p => p.slug === slug);
    if (!product) return null;
    
    if (product.status === 'launched') {
      return <span className="product-status-badge launched">Live</span>;
    } else if (product.status === 'launching') {
      return <span className="product-status-badge launching">Launching Soon</span>;
    } else if (product.status === 'coming_soon') {
      return <span className="product-status-badge coming-soon">Coming Soon</span>;
    } else {
      return <span className="product-status-badge planned">In Development</span>;
    }
  };

  return (
    <div className="modules-container1">
      <Helmet>
        <title>FinACEverse Modules - VAMN, Accute, Cyloid & More | Financial AI Solutions</title>
        <meta name="description" content="Explore FinACEverse's 7 specialized modules: VAMN cognitive intelligence, Accute orchestration, Cyloid verification, Luca AI, Finaid Hub, Finory reporting, and EPI-Q tax optimization." />
        <meta name="keywords" content="VAMN, Accute, Cyloid, Luca AI, Finaid Hub, Finory, EPI-Q, financial modules, AI finance tools" />
        <meta property="og:title" content="FinACEverse Modules - AI-Powered Financial Solutions" />
        <meta property="og:description" content="Seven specialized modules working in harmony to transform your financial operations." />
        <meta property="og:url" content="https://finaceverse.io/modules" />
        <link rel="canonical" href="https://finaceverse.io/modules" />
      </Helmet>
      <Navigation></Navigation>
      
      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <span className="toggle-label">View:</span>
        <button 
          className={`toggle-btn ${viewMode === 'current' ? 'active' : ''}`}
          onClick={() => setViewMode('current')}
        >
          Current Products
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'vision' ? 'active' : ''}`}
          onClick={() => setViewMode('vision')}
        >
          Full Vision
        </button>
      </div>

      <section className="modules-hero">
        <video
          autoPlay="true"
          muted="true"
          loop="true"
          playsInline="true"
          poster="https://images.pexels.com/videos/34127887/pictures/preview-0.jpg"
          src="https://videos.pexels.com/video-files/34127887/14471394_640_360_30fps.mp4"
          className="modules-hero-video"
        ></video>
        <div className="modules-hero-overlay"></div>
        <div className="modules-hero-container">
          <div className="modules-hero-bento">
            <div className="modules-hero-main">
              <h1 className="hero-title">Unified Cognitive Intelligence</h1>
              <p className="hero-subtitle">
                Experience the future of finance with FinACEverse. Our
                integrated Cognitive Operating System harmonizes accounting,
                finance, and taxation into a single source of truth.
              </p>
              <div className="modules-hero-actions">
                <a href="#capabilities">
                  <div className="btn btn-primary btn-lg">
                    <span>Explore Capabilities</span>
                  </div>
                </a>
                <a href="#integration">
                  <div className="btn btn-lg btn-outline">
                    <span>System Architecture</span>
                  </div>
                </a>
              </div>
            </div>
            <a href="https://accute.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
              <div className="modules-hero-card modules-hero-accute" style={{cursor: 'pointer'}}>
                {getStatusBadge('accute')}
                <div className="modules-hero-card-icon">
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"></path>
                    <rect width="16" height="16" x="4" y="4" rx="2"></rect>
                    <rect width="8" height="8" x="8" y="8" rx="1"></rect>
                  </g>
                </svg>
              </div>
              <h3 className="section-subtitle">Accute</h3>
              <p className="section-content">
                Operational orchestrator coordinating VAMN's cognitive streams across complex financial workflows.
              </p>
            </div>
            </a>
            {isProductVisible('vamn') && (
            <a href="https://vamn.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
              <div className="modules-hero-card modules-hero-vamn" style={{cursor: 'pointer'}}>
                {getStatusBadge('vamn')}
                <div className="modules-hero-card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M3 5v14a9 3 0 0 0 18 0V5"></path>
                    <path d="M3 12a9 3 0 0 0 18 0"></path>
                  </g>
                </svg>
              </div>
              <h3 className="section-subtitle">VAMN</h3>
              <p className="section-content">
                Verifiable Arithmetic Multi-Stream Network for intelligence.
              </p>
            </div>
            </a>
            )}
            {isProductVisible('cyloid') && (
            <a href="https://cyloid.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
              <div className="modules-hero-card modules-hero-cyloid" style={{cursor: 'pointer'}}>
                {getStatusBadge('cyloid')}
                <div className="modules-hero-card-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                  ></path>
                </svg>
              </div>
              <h3 className="section-subtitle">Cyloid</h3>
              <p className="section-content">
                Transforming documents into indisputable mathematical facts.
              </p>
            </div>
            </a>
            )}
          </div>
        </div>
      </section>
      <section id="capabilities" className="capabilities-grid">
        <div className="capabilities-header">
          <h2 className="section-title">Modular Capabilities</h2>
          <p className="section-content">
            Our seven specialized modules work in perfect synchronicity to
            redefine your capacity.
          </p>
        </div>
        <div className="capabilities-bento">
          <div className="capabilities-cell cell-large">
            <div className="cell-content">
              <span className="cell-tag">Foundation</span>
              <div style={{display: 'flex', gap: '12px', marginBottom: '8px'}}>
                <img src="/images/VAMN-7B Transparent logo.png" alt="VAMN" style={{height: '32px', opacity: 0.9}} />
                <img src="/images/Accute Transparent symbol.png" alt="Accute" style={{height: '32px', opacity: 0.9}} />
              </div>
              <h3 className="section-subtitle">VAMN &amp; Accute</h3>
              <p className="section-content">
                The cognitive brain of FinACEverse. VAMN provides the core
                intelligence through specialized cognitive streams while Accute
                orchestrates workflows across the financial ecosystem.
              </p>
              <ul className="cell-list">
                <li className="section-content">
                  <span>Regulatory Compliance Streams</span>
                </li>
                <li className="section-content">
                  <span>Shared Financial Ontology</span>
                </li>
                <li className="section-content">
                  <span>Cross-cycle Orchestration</span>
                </li>
              </ul>
            </div>
            <img
              src="https://images.pexels.com/photos/18069816/pexels-photo-18069816.png?auto=compress&amp;cs=tinysrgb&amp;w=1500"
              alt="Data flow visualization"
              className="cell-image"
            />
          </div>
          <div className="capabilities-cell cell-medium">
            <div className="cell-content">
              <span className="cell-tag">Intelligence</span>
              <img src="/images/Luca Transparent symbol (2).png" alt="Luca" style={{height: '32px', opacity: 0.9, marginBottom: '8px'}} />
              <h3 className="section-subtitle">Luca</h3>
              <p className="section-content">
                Domain intelligence that understands the nuances of accounting
                history and future taxation impacts.
              </p>
            </div>
          </div>
          <div className="capabilities-cell cell-small">
            <div className="cell-content">
              <span className="cell-tag">Scale</span>
              <img src="/images/Fin(Ai)d Studio Transparent symbol.png" alt="Finaid Hub" style={{height: '32px', opacity: 0.9, marginBottom: '8px'}} />
              <h3 className="section-subtitle">Finaid Hub</h3>
              <p className="section-content">
                Execution at scale without increasing headcount.
              </p>
            </div>
          </div>
          <div className="capabilities-cell cell-medium">
            <div className="cell-content">
              <span className="cell-tag">Verification</span>
              <img src="/images/Cyloid.png" alt="Cyloid" style={{height: '32px', opacity: 0.9, marginBottom: '8px'}} />
              <h3 className="section-subtitle">Cyloid</h3>
              <p className="section-content">
                Ensuring mathematical verification for every entry into the
                financial system.
              </p>
            </div>
          </div>
          <div className="capabilities-cell cell-small">
            <div className="cell-content">
              <span className="cell-tag">Communication</span>
              <img src="/images/SumBuddy Transparent symbol.png" alt="Sumbuddy" style={{height: '32px', opacity: 0.9, marginBottom: '8px'}} />
              <h3 className="section-subtitle">Sumbuddy</h3>
              <p className="section-content">
                Smart collaboration and unified communication layer.
              </p>
            </div>
          </div>
          <div className="capabilities-cell cell-medium">
            <div className="cell-content">
              <span className="cell-tag">Insights</span>
              <div style={{display: 'flex', gap: '12px', marginBottom: '8px'}}>
                <img src="/images/Finory Transparent symbol.png" alt="Finory" style={{height: '32px', opacity: 0.9}} />
                <img src="/images/EPI-Q Transparent symbol.png" alt="EPI-Q" style={{height: '32px', opacity: 0.9}} />
              </div>
              <h3 className="section-subtitle">Finory &amp; EPI-Q</h3>
              <p className="section-content">
                Advanced reporting and predictive analytics for modern
                enterprise operations.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="workflows-section">
        <div className="workflows-container">
          <h2 className="section-title">Operational Workflows</h2>
          <div className="workflows-bento">
            <div className="workflow-card">
              <div className="workflow-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3v16a2 2 0 0 0 2 2h16M7 16h8m-8-5h12M7 6h3"
                  ></path>
                </svg>
              </div>
              <h3 className="section-subtitle">Corporate Finance</h3>
              <p className="section-content">
                Automate month-end closing and consolidate global entities with
                real-time tax provision calculations.
              </p>
            </div>
            <div className="workflow-card featured">
              <div className="workflow-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
                    <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
                    <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
                  </g>
                </svg>
              </div>
              <h3 className="section-subtitle">Audit &amp; Compliance</h3>
              <p className="section-content">
                Continuous auditing enabled by Cyloid&apos;s verification,
                reducing seasonal spikes and ensuring 100% audit readiness.
              </p>
            </div>
            <div className="workflow-card">
              <div className="workflow-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2"></path>
                  </g>
                </svg>
              </div>
              <h3 className="section-subtitle">Tax Practice</h3>
              <p className="section-content">
                Scale tax preparation capacity with Sumbuddy&apos;s
                collaborative tools and VAMN&apos;s regulatory intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id="integration" className="integration-section">
        <div className="integration-wrapper">
          <div className="integration-intro">
            <h2 className="section-title">Seamless Ecosystem</h2>
            <p className="section-content">
              FinACEverse integrates with your existing tech stack while
              providing a unified data layer through VAMN.
            </p>
          </div>
          <div className="integration-bento">
            <div className="integration-cell api-cell">
              <h3 className="section-subtitle">Next-Gen APIs</h3>
              <p className="section-content">
                Connect ERPs, CRMs, and legacy accounting software directly into
                the VAMN network for real-time data streaming.
              </p>
              <div className="api-visual">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  <code>GET /v1/vamn/intelligence/stream</code>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  <code>POST /v1/cyloid/verify/document</code>
                </div>
              </div>
            </div>
            <div className="integration-cell data-flow">
              <h3 className="section-subtitle">VAMN Data Flow</h3>
              <p className="section-content">
                Specialized cognitive streams process raw financial data into
                verifiable facts for all downstream modules.
              </p>
            </div>
            <div className="integration-cell deployment">
              <h3 className="section-subtitle">Deployment Patterns</h3>
              <p className="section-content">
                Hybrid-cloud or full SaaS options tailored to enterprise
                security requirements.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="compliance-stats">
        <div className="compliance-container">
          <div className="compliance-bento">
            <div className="compliance-main">
              <h2 className="section-title">Verifiable Arithmetic</h2>
              <p className="section-content">
                Cyloid and VAMN form a dual-shield of auditability. Every
                calculation is traced back to a verified document, ensuring
                regulatory compliance through mathematical verification rather than
                manual processes.
              </p>
            </div>
            <div className="compliance-stat-card">
              <div className="stat-value">
                <span>100%</span>
              </div>
              <div className="stat-label">
                <span>Verification Rate</span>
              </div>
            </div>
            <div className="compliance-stat-card">
              <div className="stat-value">
                <span>0%</span>
              </div>
              <div className="stat-label">
                <span>Calculation Errors</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="modules-testimonials-carousel">
        <div className="carousel-header">
          <h2 className="section-title">Module Impact</h2>
          <p className="section-subtitle" style={{opacity: 0.7}}>
            Customer testimonials coming soon from pilot program participants
          </p>
        </div>
        <div className="modules-carousel-container">
          <div className="modules-testimonial-card">
            <p className="section-content" style={{opacity: 0.5, fontStyle: 'italic'}}>
              Early feedback and success stories from pilot program participants will be shared here as we validate the system with real-world implementations.
            </p>
            <div className="modules-testimonial-author">
              <span className="modules-author-name">Testimonials Coming Soon</span>
              <span className="modules-author-role">
                Pilot Program In Progress
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="modules-process-timeline">
        <div className="process-container">
          <h2 className="section-title">Onboarding Journey</h2>
          <div className="modules-timeline-wrapper">
            <div className="modules-timeline-line"></div>
            <div className="modules-timeline-item left">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">Phase 1: Discovery</h3>
                <p className="section-content">
                  Analysis of existing tech stack and workflow fragmentation.
                  Identification of key module bundles.
                </p>
                <span className="timeline-time">Week 1-2</span>
              </div>
            </div>
            <div className="modules-timeline-item right">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">Phase 2: VAMN Integration</h3>
                <p className="section-content">
                  Establishing the data layer and connecting specialized
                  cognitive streams to your core systems.
                </p>
                <span className="timeline-time">Week 3-5</span>
              </div>
            </div>
            <div className="modules-timeline-item left">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">Phase 3: Module Activation</h3>
                <p className="section-content">
                  Sequential rollout of Accute, Cyloid, and Luca modules with
                  tailored training programs.
                </p>
                <span className="timeline-time">Week 6-8</span>
              </div>
            </div>
            <div className="modules-timeline-item right">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">Phase 4: Optimization</h3>
                <p className="section-content">
                  Success milestone review and performance tuning for maximum
                  efficiency gains.
                </p>
                <span className="timeline-time">Week 9+</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="modules-cta">
        <div className="cta-container">
          <div className="cta-grid">
            <div className="cta-main">
              <h2 className="section-title">
                Ready to Transform Your Operations?
              </h2>
              <p className="section-content">
                Join the pioneers of the Cognitive Operating System. Whether
                you&apos;re a professional firm or an enterprise department,
                FinACEverse is built for your scale.
              </p>
              <div className="cta-buttons">
                <a href="/tailored-pilots">
                  <div className="btn btn-accent btn-xl">
                    <span>Request Enterprise Pilot</span>
                  </div>
                </a>
                <a href="/expert-consultation">
                  <div className="btn btn-outline btn-xl">
                    <span>Speak to a Technical Expert</span>
                  </div>
                </a>
              </div>
            </div>
            <div className="cta-side">
              <div className="cta-box">
                <h4 className="section-subtitle">Module Bundles</h4>
                <ul className="cta-list">
                  <li className="section-content">
                    <span>Audit Excellence Pack</span>
                  </li>
                  <li className="section-content">
                    <span>Tax Scale Accelerator</span>
                  </li>
                  <li className="section-content">
                    <span>Corporate OS Suite</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="modules-container2">
        <div className="modules-container3">
          <Script
            html={`<script defer data-name="modules-interactions">
// Placeholder for future interactions
</script>`}
          ></Script>
        </div>
      </div>
      <Footer></Footer>
      <a href="/request-demo">
        <div aria-label="Request Demo" className="modules-container4">
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px'}} />
          <span className="modules-text29">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  )
}

export default Modules
