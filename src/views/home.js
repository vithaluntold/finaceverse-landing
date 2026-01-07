import React, { useState } from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './home.css'

const Home = (props) => {
  // Phase toggle - Phase 1 products are live, Phase 2 coming soon
  const [showPhase2] = useState(false); // Set to true via SuperAdmin to show Phase 2
  
  return (
    <div className="home-container1">
      <Helmet>
        <title>FinACEverse - Cognitive Operating System for Finance | AI-Powered Financial Intelligence</title>
        <meta name="description" content="Transform fragmented financial operations with FinACEverse, the world's first Cognitive OS for finance. Unify accounting, taxation, and financial workflows through VAMN AI technology." />
        <meta name="keywords" content="cognitive finance, VAMN, financial automation, AI accounting, tax compliance, Accute, Cyloid, financial intelligence" />
        <meta property="og:title" content="FinACEverse - Cognitive Operating System for Finance" />
        <meta property="og:description" content="Transform fragmented financial operations into a unified, intelligent ecosystem. VAMN-powered cognitive finance for modern enterprises." />
        <meta property="og:url" content="https://finaceverse.io/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://finaceverse.io/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FinACEverse - Cognitive Operating System for Finance" />
        <meta name="twitter:description" content="Transform fragmented financial operations into a unified, intelligent ecosystem." />
        <link rel="canonical" href="https://finaceverse.io/" />
      </Helmet>
      <Navigation></Navigation>
      <section className="hero-split-diagonal">
        <div className="hero-bg-media">
          <video
            autoPlay="true"
            muted="true"
            loop="true"
            playsInline="true"
            poster="https://images.pexels.com/videos/34127955/pictures/preview-0.jpg"
            src="https://videos.pexels.com/video-files/34127955/14471454_640_360_30fps.mp4"
          ></video>
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-diagonal-container">
          <div className="hero-content-left">
            <div className="hero-badge">
              <span className="hero-badge-text">
                The World&apos;s First Cognitive OS for Finance
              </span>
            </div>
            <h1 className="hero-title">
              <span>
                {' '}
                Unifying the Finance
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-gradient-elm1">Multiverse</span>
            </h1>
            <p className="hero-subtitle">
              FinACEverse is a <strong>Cognitive Operating System</strong> for finance - AI software that thinks, 
              learns, and orchestrates your entire financial ecosystem. <strong>Accute</strong> orchestrates workflows, 
              <strong>VAMN</strong> is the brain (an LLM with a cool mind of its own for numbers), and specialized 
              modules handle everything from document verification to process mining. We eliminate fragmentation 
              and restore coherence across all financial operations.
            </p>
            <div className="hero-actions">
              <a href="/request-demo" className="btn btn-primary btn-lg">Request Demo</a>
              <a href="/tailored-pilots" className="btn btn-lg btn-outline">
                Join Pilot Program
              </a>
            </div>
          </div>
          <div className="hero-visual-right">
            <div className="hero-floating-card">
              <div className="card-icon-wrapper">
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
              <div className="card-text">
                <span className="card-label">VAMN Network</span>
                <span className="card-value">Verifiable Streams Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="market-bento">
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>
                {' '}
                The Fragmentation
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-accent-elm1">Crisis</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '600px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              Outdated systems and siloed data are hindering the effectiveness of modern financial professions.
            </p>
          </div>
          <div className="bento-grid">
            <div className="bento-cell cell-wide">
              <div className="cell-content">
                <div className="icon-box">
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
                      d="m2 2l20 20M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71M9.309 3.652A12.3 12.3 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a10 10 0 0 1-.08 1.264"
                    ></path>
                  </svg>
                </div>
                <h3 className="cell-title">Systemic Fragmentation</h3>
                <p className="section-content">
                  Accounting records the past, finance interprets the present,
                  and taxation shapes the future. Yet, they operate in silos,
                  creating massive inefficiencies and compliance blind spots.
                </p>
                <div className="cell-image-overlay">
                  <img
                    src="https://images.pexels.com/photos/30547572/pexels-photo-30547572.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                    alt="Data fragmentation visual"
                  />
                </div>
              </div>
            </div>
            <div className="bento-cell cell-narrow">
              <div className="cell-content">
                <h3 className="cell-title">Compliance Risk</h3>
                <p className="section-content">
                  Manual data reentry and disconnected workflows increase the
                  risk of regulatory failure in an era of tightening pressure.
                </p>
                <div className="cell-footer">
                  <span className="stat-highlight">85%</span>
                  <span className="stat-label">Manual Effort</span>
                </div>
              </div>
            </div>
            <div className="bento-cell cell-narrow">
              <div className="cell-content">
                <h3 className="cell-title">Talent Shortage</h3>
                <p className="section-content">
                  A shrinking workforce is struggling to keep up with rising AI
                  capabilities and data complexity without integrated tools.
                </p>
                <div className="cell-footer">
                  <span className="stat-highlight">Capacity</span>
                  <span className="stat-label">Bottleneck</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="who-its-for" style={{background: 'var(--color-surface)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>Who </span>
              <span className="home-thq-text-gradient-elm2">It&apos;s Built For</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '600px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              Whether you&apos;re a solo practitioner or a global enterprise, FinACEverse scales to your needs
            </p>
          </div>
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-2xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="persona-header" style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)'}}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <div>
                  <h3 className="cell-title">Accounting Firms (5-200+ People)</h3>
                  <p style={{opacity: 0.7, fontSize: 'var(--font-size-sm)'}}>Managing dozens to hundreds of client engagements</p>
                </div>
              </div>
              <p className="section-content">
                <strong>Your Pain Point:</strong> Tax season chaos. Partners buried in data entry instead of advisory. 
                Staff overwhelmed with manual reconciliations. Clients demanding real-time insights you can&apos;t deliver.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Your Solution:</strong> Foundation (VAMN + Accute) + Finaid Hub handles 90% of routine work. 
                Partners shift from data entry to high-value advisory. Add Sumbuddy for white-label client portals.
              </p>
              <div style={{marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderRadius: 'var(--border-radius-md)'}}>
                <strong>Typical ROI:</strong> 70% time savings, 40% capacity increase, 18-month payback period
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="persona-header" style={{marginBottom: 'var(--spacing-md)'}}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: 'var(--spacing-sm)'}}>
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                  <path d="m8 8-4 4 4 4" />
                  <path d="m16 8 4 4-4 4" />
                </svg>
                <h3 className="cell-title" style={{fontSize: 'var(--font-size-xl)'}}>Tax Practitioners (Solo to Small Teams)</h3>
              </div>
              <p className="section-content">
                <strong>Pain:</strong> Turning away clients during tax season. Manual prep taking 10-15 hours per return. No time for proactive planning.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Solution:</strong> Luca + EPI-Q gives you AI-powered tax research and predictive planning. Scale to 3x clients with proactive strategies.
              </p>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="persona-header" style={{marginBottom: 'var(--spacing-md)'}}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: 'var(--spacing-sm)'}}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                </svg>
                <h3 className="cell-title" style={{fontSize: 'var(--font-size-xl)'}}>Corporate Finance Teams</h3>
              </div>
              <p className="section-content">
                <strong>Pain:</strong> Multi-entity chaos. Delayed month-end close (2+ weeks). Fragmented systems across subsidiaries.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Solution:</strong> Accute orchestrates global ops. Finory delivers real-time consolidated dashboards. Close in 2 hours, not 2 weeks.
              </p>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="persona-header" style={{marginBottom: 'var(--spacing-md)'}}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom: 'var(--spacing-sm)'}}>
                  <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />
                  <path d="M12.02 2C6.21 2 2.2 6.2 2.2 12c0 5.8 4.82 10 9.82 10 5.01 0 9.78-4.2 9.78-10S17.02 2 12.02 2" />
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                </svg>
                <h3 className="cell-title" style={{fontSize: 'var(--font-size-xl)'}}>Auditors & Compliance</h3>
              </div>
              <p className="section-content">
                <strong>Pain:</strong> Chasing source documents. Incomplete audit trails. Manual verification taking weeks.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Solution:</strong> Luca + EPI-Q gives you complete audit trails with AI-powered document verification. Every number traces to source. 60% faster audits.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="process-timeline">
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>
                {' '}
                Cognitive OS
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-gradient-elm2">Architecture</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '600px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              How FinACEverse transforms documents into indisputable financial facts
            </p>
          </div>
          <div className="timeline-wrapper">
            <div className="timeline-line"></div>
            <div className="timeline-item left">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>01</span>
                </div>
                <h3 className="step-title">VAMN AI Stream Input</h3>
                <p className="section-content">
                  Financial intelligence begins with our <strong>Verifiable Arithmetic
                  Multi-Stream Network (VAMN)</strong> - think of it as multiple AI specialists 
                  working simultaneously. Each "cognitive stream" is a specialized AI model 
                  that processes specific types of financial data (invoices, receipts, contracts) 
                  with mathematical precision, ensuring every number is traceable and verified.
                </p>
              </div>
            </div>
            <div className="timeline-item right">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>02</span>
                </div>
                <h3 className="step-title">Accute AI Orchestration</h3>
                <p className="section-content">
                  <strong>Accute</strong> is your AI conductor - it creates a <strong>shared 
                  financial language</strong> (what we call a "shared ontology") that ensures 
                  accounting, finance, and tax all speak the same dialect. This AI orchestrator 
                  coordinates workflows across financial reporting, tax prep, and audits, 
                  becoming your firm&apos;s intelligent central hub and single source of truth.
                </p>
              </div>
            </div>
            <div className="timeline-item left">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>03</span>
                </div>
                <h3 className="step-title">EPI-Q Process Discovery</h3>
                <p className="section-content">
                  <strong>EPI-Q</strong> maps how work actually happens in your organization. 
                  Enterprise process, task, and communication mining reveals bottlenecks, 
                  identifies automation opportunities, and creates a <strong>digital twin 
                  of your workflows</strong> - the foundation for intelligent transformation.
                </p>
              </div>
            </div>
            <div className="timeline-item right">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>04</span>
                </div>
                <h3 className="step-title">Compliant Execution</h3>
                <p className="section-content">
                  The Luca module provides domain intelligence, allowing Finaid
                  Hub to execute at scale, delivering accurate, compliant
                  results with zero headcount increase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="features-masonry">
        <div className="full-width-inner">
          <div className="section-header-side">
            <h2 className="section-title">
              <span>
                {' '}
                The Integrated
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-accent-elm2">Modules</span>
            </h2>
            <p className="section-subtitle">
              {showPhase2 ? 'Nine specialized engines working in harmony under one roof.' : 'Phase 1: Five powerful modules launching now.'}
            </p>
          </div>
          <div className="masonry-grid">
            {/* PHASE 1 - Launching Now */}
            <div className="masonry-item item-lg">
              <a href="https://accute.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <div className="module-header">
                    <span className="module-name">Accute</span>
                    <div className="module-tag">
                      <span>Workflow Orchestrator</span>
                    </div>
                  </div>
                  <h3 className="module-benefit">Workflow Orchestration</h3>
                  <p className="section-content">
                    The master conductor of your financial workflows. Accute connects 
                    every process, automates handoffs, and ensures nothing falls through 
                    the cracks. Result: <strong>20+ hours saved per week</strong> on 
                    coordination and reconciliation.
                  </p>
                  <img
                    src="/images/Accute Transparent symbol.png"
                    alt="Accute module"
                    style={{maxWidth: '80px', margin: '20px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
            <div className="masonry-item item-sm">
              <a href="https://askluca.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <span className="module-name">Luca</span>
                  <h3 className="module-benefit">AI Domain Expert</h3>
                  <p className="section-content">
                    Your AI tax and accounting advisor with CPA-level expertise. Luca answers 
                    complex technical questions instantly, suggests optimizations, and provides 
                    scenario analysis. <strong>Cuts research time from hours to seconds</strong> - 
                    like having a senior partner available 24/7.
                  </p>
                  <img
                    src="/images/Luca Transparent symbol (2).png"
                    alt="Luca"
                    style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
            <div className="masonry-item item-sm">
              <a href="https://finaidhub.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <span className="module-name">Finaid Hub</span>
                  <h3 className="module-benefit">AI Workforce Multiplier for Accounting</h3>
                  <p className="section-content">
                    Your AI-powered accounting workforce. Handles bookkeeping, reconciliation, 
                    and financial reporting at machine speed - enabling your team to 
                    <strong>handle 10x more clients without new hires</strong>. Average 
                    ROI: 400% in year one.
                  </p>
                  <img
                    src="/images/Fin(Ai)d Studio Transparent symbol.png"
                    alt="Finaid Hub"
                    style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
            <div className="masonry-item item-sm">
              <a href="https://epi-q.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <span className="module-name">EPI-Q</span>
                  <h3 className="module-benefit">Enterprise Process Mining</h3>
                  <p className="section-content">
                    Enterprise process, task, and communication mining module. EPI-Q analyzes 
                    how work really happens, identifies bottlenecks, and uncovers automation 
                    opportunities - <strong>reduce process inefficiencies by 40%</strong> with 
                    data-driven insights.
                  </p>
                  <img
                    src="/images/EPI-Q Transparent symbol.png"
                    alt="EPI-Q"
                    style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
            
            {/* PHASE 2 - Coming Soon (conditionally rendered) */}
            {showPhase2 && (
              <>
                <div className="masonry-item item-sm">
                  <a href="https://vamn.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                    <div className="module-card secondary" style={{cursor: 'pointer', position: 'relative'}}>
                      <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                      <span className="module-name">VAMN</span>
                      <div className="module-tag">
                        <span>The Brain</span>
                      </div>
                      <h3 className="module-benefit">Financial LLM</h3>
                      <p className="section-content">
                        An LLM with a cool mind of its own - built specifically for numbers. 
                        Unlike generic AI, VAMN thinks in financial logic, catches what others 
                        miss, and delivers <strong>90% fewer audit findings</strong> with 
                        mathematical precision that makes CPAs jealous.
                      </p>
                      <img
                        src="/images/VAMN-7B Transparent logo.png"
                        alt="VAMN"
                        style={{maxWidth: '70px', margin: '15px auto', display: 'block', opacity: 0.9}}
                      />
                    </div>
                  </a>
                </div>
                <div className="masonry-item item-sm">
                  <a href="https://finory.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                    <div className="module-card" style={{cursor: 'pointer', position: 'relative'}}>
                      <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                      <span className="module-name">Finory</span>
                      <h3 className="module-benefit">Self-Constructing ERP</h3>
                      <p className="section-content">
                        The AI-native ERP that builds itself. Finory adapts to your business processes 
                        automatically - no consultants, no 18-month implementations. 
                        <strong>Go live in weeks, not years</strong> with an ERP that evolves with you.
                      </p>
                      <img
                        src="/images/Finory Transparent symbol.png"
                        alt="Finory"
                        style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                      />
                    </div>
                  </a>
                </div>
                <div className="masonry-item item-sm">
                  <div className="module-card" style={{position: 'relative'}}>
                    <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                    <span className="module-name">TaxBlitz</span>
                    <h3 className="module-benefit">AI Workforce Multiplier for Tax</h3>
                    <p className="section-content">
                      Your AI-powered tax workforce. Handles tax preparation, filing, 
                      and compliance at machine speed. <strong>Process 100+ returns per day</strong> with 
                      AI-powered accuracy and complete audit trails.
                    </p>
                    <img
                      src="/images/Fin(Ai)d Studio Transparent symbol.png"
                      alt="TaxBlitz"
                      style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.7}}
                    />
                  </div>
                </div>
                <div className="masonry-item item-sm">
                  <div className="module-card" style={{position: 'relative'}}>
                    <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                    <span className="module-name">Audric</span>
                    <h3 className="module-benefit">AI Workforce Multiplier for Audit</h3>
                    <p className="section-content">
                      Your AI-powered audit workforce. Handles audit procedures, evidence 
                      gathering, and workpaper generation at machine speed. <strong>Cut audit time by 60%</strong> while 
                      improving quality and consistency.
                    </p>
                    <img
                      src="/images/Fin(Ai)d Studio Transparent symbol.png"
                      alt="Audric"
                      style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.7}}
                    />
                  </div>
                </div>
                <div className="masonry-item item-sm">
                  <a href="https://sumbuddy.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                    <div className="module-card" style={{cursor: 'pointer', position: 'relative'}}>
                      <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                      <span className="module-name">Sumbuddy</span>
                      <h3 className="module-benefit">Client Marketplace</h3>
                      <p className="section-content">
                        Your gateway to new business. Sumbuddy is the marketplace where 
                        accounting and finance firms find qualified clients actively seeking 
                        professional services. <strong>Get matched with clients</strong> looking 
                        for your exact expertise.
                      </p>
                      <img
                        src="/images/SumBuddy Transparent symbol.png"
                        alt="Sumbuddy"
                        style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                      />
                    </div>
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="modules-together" style={{background: 'var(--color-surface)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div style={{textAlign: 'center', maxWidth: '900px', margin: '0 auto var(--spacing-3xl)', width: '100%'}}>
            <h2 className="section-title" style={{textAlign: 'center', marginBottom: 'var(--spacing-md)'}}>
              <span>The </span>
              <span className="home-thq-text-gradient-elm2">Cognitive OS Architecture</span>
            </h2>
            <p style={{opacity: 0.85, fontSize: 'var(--font-size-lg)', maxWidth: '700px', margin: '0 auto', textAlign: 'center', lineHeight: 1.6}}>
              FinACEverse is a Cognitive Operating System. Each module serves a distinct purpose in the ecosystem.
            </p>
          </div>
          
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <img src="/images/Accute Transparent symbol.png" alt="Accute" style={{height: '40px', marginBottom: 'var(--spacing-md)', opacity: 0.9}} />
                <h3 className="cell-title" style={{color: 'var(--color-primary)'}}>The Orchestrator: Accute</h3>
                <p className="section-content">
                  <strong>Start here.</strong> Accute is the workflow orchestrator that connects every process. 
                  It's the conductor ensuring all modules work in harmony - routing data, triggering automations, 
                  and maintaining the flow of your financial operations.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <img src="/images/Luca Transparent symbol (2).png" alt="Luca" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                <h3 className="cell-title">Expert Layer: Luca</h3>
                <p className="section-content">
                  AI domain expert with CPA-level knowledge. Answers complex tax and 
                  accounting questions instantly with contextual recommendations.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <img src="/images/Fin(Ai)d Studio Transparent symbol.png" alt="Finaid Hub" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                <h3 className="cell-title">Execution Layer: Finaid Hub</h3>
                <p className="section-content">
                  AI workforce multiplier. Handles routine tasks at machine speed, 
                  enabling your team to handle 10x more clients.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <img src="/images/EPI-Q Transparent symbol.png" alt="EPI-Q" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                <h3 className="cell-title">Discovery Layer: EPI-Q</h3>
                <p className="section-content">
                  Enterprise process, task, and communication mining. Maps your actual 
                  workflows and identifies automation opportunities.
                </p>
              </div>
            </div>
            
            {showPhase2 && (
              <>
                <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', position: 'relative'}}>
                  <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>PHASE 2</div>
                  <div className="cell-content">
                    <img src="/images/Cyloid.png" alt="Cyloid" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    <h3 className="cell-title">Input Layer: Cyloid</h3>
                    <p className="section-content">
                      AI verification engine for document processing. Reads, extracts, and 
                      verifies every document with mathematical precision.
                    </p>
                  </div>
                </div>
                <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', position: 'relative'}}>
                  <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>PHASE 2</div>
                  <div className="cell-content">
                    <img src="/images/VAMN-7B Transparent logo.png" alt="VAMN" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    <h3 className="cell-title">The Brain: VAMN</h3>
                    <p className="section-content">
                      Financial LLM with a cool mind of its own. Unlike generic AI, 
                      VAMN thinks in financial logic with mathematical precision.
                    </p>
                  </div>
                </div>
                <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', position: 'relative'}}>
                  <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>PHASE 2</div>
                  <div className="cell-content">
                    <img src="/images/Finory Transparent symbol.png" alt="Finory" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    <h3 className="cell-title">Systems Layer: Finory</h3>
                    <p className="section-content">
                      Self-constructing AI-native ERP. Adapts to your business 
                      automatically - go live in weeks, not years.
                    </p>
                  </div>
                </div>
                <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', position: 'relative'}}>
                  <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>PHASE 2</div>
                  <div className="cell-content">
                    <img src="/images/SumBuddy Transparent symbol.png" alt="Sumbuddy" style={{height: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    <h3 className="cell-title">Growth Layer: Sumbuddy</h3>
                    <p className="section-content">
                      Client acquisition marketplace. Get matched with qualified 
                      clients seeking your exact services.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div style={{marginTop: 'var(--spacing-3xl)', textAlign: 'center', padding: 'var(--spacing-2xl)', background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))', borderRadius: 'var(--border-radius-lg)'}}>
            <h3 className="section-subtitle" style={{marginBottom: 'var(--spacing-md)', color: 'var(--color-accent)'}}>
              🚀 Phase 1 Launching Now
            </h3>
            <p className="section-content" style={{maxWidth: '700px', margin: '0 auto', fontSize: 'var(--font-size-lg)'}}>
              <strong>Available today:</strong> Accute (orchestration) + Luca (domain expert) 
              + Finaid Hub (workforce multiplier) + EPI-Q (process mining). 
              Start with this powerful stack and achieve <strong>70% time savings</strong> immediately.
            </p>
          </div>
        </div>
      </section>
      <section className="stats-bento">
        <div className="full-width-inner">
          <div className="bento-grid-stats">
            <div className="bento-cell-stats cell-wide-stats">
              <div className="stats-visual">
                <img
                  src="https://images.pexels.com/photos/30547577/pexels-photo-30547577.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  alt="Growth visualization"
                />
                <div className="stats-overlay-content">
                  <h2 className="section-title">
                    <span>
                      {' '}
                      Proven Business
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </span>
                    <span className="home-thq-text-gradient-elm3">Impact</span>
                  </h2>
                  <p className="section-subtitle">
                    Quantified gains from firms integrating the Cognitive OS.
                  </p>
                </div>
              </div>
            </div>
            <div className="bento-cell-stats cell-narrow-stats">
              <div className="stat-item">
                <span className="stat-number">40%</span>
                <h3 className="stat-title">Efficiency Gain</h3>
                <p className="section-content">
                  Average reduction in manual data processing across financial
                  reporting cycles.
                </p>
              </div>
            </div>
            <div className="bento-cell-stats cell-narrow-stats">
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <h3 className="stat-title">Audit Trail</h3>
                <p className="section-content">
                  Mathematically verifiable audit trails for every transaction
                  and tax filing.
                </p>
              </div>
            </div>
            <div className="bento-cell-stats cell-narrow-stats-bottom">
              <div className="stat-item">
                <span className="stat-number">2.5x</span>
                <h3 className="stat-title">Capacity Uplift</h3>
                <p className="section-content">
                  Firms expanded their client base without increasing internal
                  headcount.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="services-bento">
        <div className="full-width-inner">
          <div className="section-header-services">
            <h2 className="section-title">
              <span>
                {' '}
                Built for the
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-accent-elm3">Ecosystem</span>
            </h2>
            <p className="section-subtitle">
              Tailored solutions for every corner of the financial profession.
            </p>
          </div>
          <div className="bento-grid-services">
            <div className="bento-cell-service cell-wide-service">
              <div className="service-content">
                <h3 className="service-title">Accounting Firms</h3>
                <p className="section-content">
                  Transform from traditional record-keeping to a high-capacity
                  cognitive firm. Manage audits, reporting, and advisory through
                  a single ontology.
                </p>
                <ul className="service-list">
                  <li>
                    <span>Unified Workflow Orchestration</span>
                  </li>
                  <li>
                    <span>Automated Fact Verification</span>
                  </li>
                  <li>
                    <span>Advisory Scaling Tools</span>
                  </li>
                </ul>
                <a href="/modules">
                  <button className="btn btn-primary">View Solutions</button>
                </a>
              </div>
              <div className="service-bg">
                <img
                  src="https://images.pexels.com/photos/30547606/pexels-photo-30547606.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  alt="Accounting firm tech"
                />
              </div>
            </div>
            <div className="bento-cell-service cell-narrow-service">
              <div className="service-content">
                <h3 className="service-title">Tax Practitioners</h3>
                <p className="section-content">
                  Ensure compliance causality with VAMN-powered tax preparation
                  and proactive future-shaping strategies.
                </p>
                <a href="/modules">
                  <button className="btn btn-outline btn-sm">Learn More</button>
                </a>
              </div>
            </div>
            <div className="bento-cell-service cell-narrow-service">
              <div className="service-content">
                <h3 className="service-title">Corporate Finance</h3>
                <p className="section-content">
                  In-house teams gain real-time visibility and control across
                  global enterprise operations with Accute.
                </p>
                <a href="/expert-consultation">
                  <button className="btn btn-outline btn-sm">Learn More</button>
                </a>
              </div>
            </div>
            <div className="bento-cell-service cell-narrow-service">
              <div className="service-content">
                <h3 className="service-title">Auditors</h3>
                <p className="section-content">
                  Access complete compliance causality with mathematical audit trails. 
                  Every transaction traces back to source documents with <strong>100% 
                  verification</strong> - reducing audit time by 60%.
                </p>
                <a href="/compliance-privacy">
                  <button className="btn btn-outline btn-sm">Learn More</button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="testimonials-carousel" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>Real-World </span>
              <span className="home-thq-text-gradient-elm4">Case Studies</span>
            </h2>
            <p className="section-subtitle">
              See how firms transformed their operations with FinACEverse
            </p>
          </div>
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-2xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'var(--color-surface)', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)'}}>
              <div className="case-study-header" style={{marginBottom: 'var(--spacing-lg)'}}>
                <span className="badge" style={{background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', color: 'var(--color-primary)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)', fontWeight: '600'}}>Accounting Firm</span>
                <h3 className="cell-title" style={{marginTop: 'var(--spacing-md)'}}>Mid-Size Firm Eliminates 90% of Manual Data Entry</h3>
              </div>
              <div className="case-study-content">
                <p className="section-content">
                  <strong>Challenge:</strong> 50-person accounting firm drowning in client documents during tax season. 
                  Partners spending 30+ hours/week on data entry instead of advisory services.
                </p>
                <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                  <strong>Solution:</strong> Deployed Accute + Luca + Finaid Hub + EPI-Q
                </p>
                <div className="metrics-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-xl)', background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)', borderRadius: 'var(--border-radius-md)'}}>
                  <div className="metric">
                    <div className="metric-value" style={{fontSize: 'var(--font-size-3xl)', fontWeight: '700', color: 'var(--color-primary)'}}>90%</div>
                    <div className="metric-label" style={{fontSize: 'var(--font-size-sm)', opacity: 0.8}}>Reduction in data entry</div>
                  </div>
                  <div className="metric">
                    <div className="metric-value" style={{fontSize: 'var(--font-size-3xl)', fontWeight: '700', color: 'var(--color-primary)'}}>25hrs</div>
                    <div className="metric-label" style={{fontSize: 'var(--font-size-sm)', opacity: 0.8}}>Saved per partner/week</div>
                  </div>
                  <div className="metric">
                    <div className="metric-value" style={{fontSize: 'var(--font-size-3xl)', fontWeight: '700', color: 'var(--color-primary)'}}>$180K</div>
                    <div className="metric-label" style={{fontSize: 'var(--font-size-sm)', opacity: 0.8}}>Annual cost savings</div>
                  </div>
                  <div className="metric">
                    <div className="metric-value" style={{fontSize: 'var(--font-size-3xl)', fontWeight: '700', color: 'var(--color-primary)'}}>40%</div>
                    <div className="metric-label" style={{fontSize: 'var(--font-size-sm)', opacity: 0.8}}>Client capacity increase</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)'}}>
              <span className="badge" style={{background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)', color: 'var(--color-accent)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)', fontWeight: '600'}}>Tax Practitioner</span>
              <h3 className="cell-title" style={{marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xl)'}}>Solo Practitioner Scales to 3X Clients</h3>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Before:</strong> Managing 120 clients, turning away new business, working 70-hour weeks during tax season.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>After:</strong> Using Luca + EPI-Q for predictive tax planning, now serving 350+ clients with proactive strategies. Revenue increased 280%.
              </p>
              <div style={{marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', borderRadius: 'var(--border-radius-sm)'}}>
                <div className="metric-value" style={{fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-accent)'}}>6 months</div>
                <div className="metric-label" style={{fontSize: 'var(--font-size-sm)'}}>ROI payback period</div>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', border: '1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent)'}}>
              <span className="badge" style={{background: 'color-mix(in srgb, var(--color-secondary) 20%, transparent)', color: 'var(--color-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)', fontWeight: '600'}}>Corporate Finance</span>
              <h3 className="cell-title" style={{marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xl)'}}>Multi-Entity Corp Unifies Global Operations</h3>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Challenge:</strong> Manufacturing company with 12 subsidiaries across 8 countries - fragmented systems, delayed reporting, compliance nightmares.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Result:</strong> Accute orchestrating all entities, Finory delivering real-time consolidated dashboards, EPI-Q identifying process inefficiencies across jurisdictions.
              </p>
              <div style={{marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)', borderRadius: 'var(--border-radius-sm)'}}>
                <div className="metric-value" style={{fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-secondary)'}}>2 weeks → 2 hours</div>
                <div className="metric-label" style={{fontSize: 'var(--font-size-sm)'}}>Month-end close time</div>
              </div>
            </div>
          </div>
          
          <div style={{marginTop: 'var(--spacing-2xl)', textAlign: 'center'}}>
            <p className="section-content" style={{opacity: 0.7, fontStyle: 'italic'}}>
              All case studies represent real pilot program implementations. Results may vary based on firm size, complexity, and implementation scope.
            </p>
          </div>
        </div>
      </section>
      <section className="final-cta">
        <div className="full-width-inner">
          <div className="cta-split-container">
            <div className="cta-main-content">
              <h2 className="section-title">
                <span>
                  {' '}
                  Ready to Join the
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </span>
                <span className="home-thq-text-gradient-elm5">Revolution?</span>
              </h2>
              <p className="section-subtitle">
                Shape the future of your financial operations with the Cognitive
                Operating System.
              </p>
              <div className="cta-form-wrapper">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = e.target.elements.email.value;
                    window.location.href = `mailto:vithal@finacegroup.com?subject=Demo Request from ${email}&body=Business email: ${email}%0D%0A%0D%0AI'm interested in scheduling a demo of FinACEverse.`;
                  }}
                  className="cta-form"
                >
                  <input
                    type="email"
                    placeholder="Enter your business email"
                    required="true"
                    id="thq_textinput__w1K"
                    name="email"
                    data-form-field-id="thq_textinput__w1K"
                    className="cta-input"
                  />
                  <button
                    type="submit"
                    id="thq_button_QbF1"
                    name="button"
                    data-form-field-id="thq_button_QbF1"
                    className="btn btn-lg btn-accent"
                  >
                    <a href="/request-demo" style={{color: 'inherit', textDecoration: 'none'}}>Request Demo</a>
                  </button>
                </form>
                <p className="form-disclaimer">
                  Be among the early adopters pioneering the new category.
                </p>
              </div>
            </div>
            <div className="cta-secondary-content">
              <div className="cta-info-box">
                <h3 className="info-title">Tailored Pilots</h3>
                <p className="section-content">
                  Request a custom pilot program for your enterprise or
                  professional service firm.
                </p>
                <a href="/tailored-pilots">
                  <div className="btn btn-link">
                    <span>
                      {' '}
                      Learn about pilots
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h14m-7-7l7 7l-7 7"
                      ></path>
                    </svg>
                  </div>
                </a>
              </div>
              <div className="cta-info-box">
                <h3 className="info-title">Expert Consultation</h3>
                <p className="section-content">
                  Speak with a Cognitive OS architect to map your transition.
                </p>
                <a href="/expert-consultation">
                  <div className="btn btn-link">
                    <span>
                      {' '}
                      Schedule call
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h14m-7-7l7 7l-7 7"
                      ></path>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="home-container2">
        <div className="home-container3">
          <Script
            html={`<style>
        @keyframes float {0%,100% {transform: translateY(0);}
50% {transform: translateY(-20px);}}
        </style> `}
          ></Script>
        </div>
      </div>
      <div className="home-container4">
        <div className="home-container5">
          <Script
            html={`<script defer data-name="finaceverse-interactions">
(function(){
  // Simple Scroll Reveal Animation
  const revealElements = document.querySelectorAll(".bento-cell, .timeline-item, .module-card, .stat-item")

  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
        revealObserver.unobserve(entry.target)
      }
    })
  }, observerOptions)

  revealElements.forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(30px)"
    el.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
    revealObserver.observe(el)
  })

  // Form feedback enhancement
  const ctaForm = document.querySelector(".cta-form")
  if (ctaForm) {
    ctaForm.addEventListener("submit", (e) => {
      // Browsers handle validation via 'required' and 'type="email"'
      // We just provide visual feedback
      const btn = ctaForm.querySelector("button")
      const originalText = btn.textContent

      btn.textContent = "Processing..."
      btn.disabled = true

      // Simulating a brief delay before native submission
      setTimeout(() => {
        // In a real scenario, the form would submit here
        // For this demo, we'll show success
        btn.textContent = "Demo Requested!"
        btn.style.backgroundColor = "#2ecc71"
      }, 800)
    })
  }
})()
</script>`}
          ></Script>
        </div>
      </div>
      <Footer></Footer>
      <a href="/request-demo">
        <div aria-label="FinACEverse" className="home-container6">
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px'}} />
          <span className="home-text28">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  )
}

export default Home
