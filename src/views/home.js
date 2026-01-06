import React from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './home.css'

const Home = (props) => {
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
              FinACEverse is a <strong>Cognitive Operating System</strong> - AI software that thinks, 
              learns, and orchestrates your entire financial ecosystem. Unlike traditional tools that 
              just store data, our system actively integrates accounting, finance, and taxation into 
              a single intelligent platform. Powered by <strong>VAMN AI</strong> (our multi-stream 
              verification engine) and <strong>Accute</strong> (the orchestration layer), we eliminate 
              fragmentation and restore coherence across all financial operations.
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
          <div className="section-header">
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
            <p className="section-subtitle">
              Outdated systems and siloed data are hindering the effectiveness
              of modern financial professions.
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
            <p className="section-subtitle">
              Whether you&apos;re a solo practitioner or a global enterprise, FinACEverse scales to your needs
            </p>
          </div>
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-2xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="persona-header" style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)'}}>
                <div style={{fontSize: '2.5rem'}}>👔</div>
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
                <strong>Your Solution:</strong> Foundation (VAMN + Accute) + Cyloid + Finaid Hub handles 90% of routine work. 
                Partners shift from data entry to high-value advisory. Add Sumbuddy for white-label client portals.
              </p>
              <div style={{marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderRadius: 'var(--border-radius-md)'}}>
                <strong>Typical ROI:</strong> 70% time savings, 40% capacity increase, 18-month payback period
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="persona-header" style={{marginBottom: 'var(--spacing-md)'}}>
                <div style={{fontSize: '2rem', marginBottom: 'var(--spacing-sm)'}}>⚖️</div>
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
                <div style={{fontSize: '2rem', marginBottom: 'var(--spacing-sm)'}}>🏢</div>
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
                <div style={{fontSize: '2rem', marginBottom: 'var(--spacing-sm)'}}>🔍</div>
                <h3 className="cell-title" style={{fontSize: 'var(--font-size-xl)'}}>Auditors & Compliance</h3>
              </div>
              <p className="section-content">
                <strong>Pain:</strong> Chasing source documents. Incomplete audit trails. Manual verification taking weeks.
              </p>
              <p className="section-content" style={{marginTop: 'var(--spacing-md)'}}>
                <strong>Solution:</strong> Cyloid&apos;s compliance causality gives you complete audit trails. Every number traces to source. 60% faster audits.
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
            <p className="section-subtitle">
              How FinACEverse transforms documents into indisputable financial
              facts.
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
                <h3 className="step-title">Cyloid AI Verification</h3>
                <p className="section-content">
                  <strong>Cyloid</strong> is the eyes of the system - an AI that mathematically 
                  verifies every document entering your ecosystem. It transforms messy, unstructured 
                  data (PDFs, emails, scans) into verified, structured facts with complete 
                  <strong>compliance causality</strong> - meaning every number traces back to its 
                  original source document, creating an unbreakable audit trail that regulators love.
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
              Seven specialized engines working in harmony under one roof.
            </p>
          </div>
          <div className="masonry-grid">
            <div className="masonry-item item-lg">
              <a href="https://accute.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <div className="module-header">
                    <span className="module-name">Accute</span>
                    <div className="module-tag">
                      <span>AI Orchestrator</span>
                    </div>
                  </div>
                  <h3 className="module-benefit">Intelligent Orchestration</h3>
                  <p className="section-content">
                    The AI conductor of your financial symphony. Accute orchestrates every 
                    financial cycle with unified compliance logic - automatically handling 
                    tax filing, financial reporting, and audits in one system. Result: 
                    <strong>20+ hours saved per week</strong> on coordination and reconciliation.
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
              <a href="https://vamn.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card secondary" style={{cursor: 'pointer'}}>
                  <span className="module-name">VAMN</span>
                  <div className="module-tag">
                    <span>AI Core</span>
                  </div>
                  <h3 className="module-benefit">The Cognitive Brain</h3>
                  <p className="section-content">
                    The neural network at FinACEverse's core. VAMN delivers rigorous 
                    financial intelligence through multiple AI models that catch errors, 
                    flag compliance issues, and suggest optimizations in real-time. 
                    <strong>Reduces audit findings by 90%</strong> with mathematical precision.
                  </p>
                  <img
                    src="/images/VAMN-7B Transparent logo.png"
                    alt="VAMN"
                    style={{maxWidth: '70px', margin: '15px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
            <div className="masonry-item item-md">
              <a href="https://cyloid.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card accent" style={{cursor: 'pointer'}}>
                  <span className="module-name">Cyloid</span>
                  <h3 className="module-benefit">AI Verification Engine</h3>
                  <p className="section-content">
                    The intelligent scanner that never blinks. Cyloid AI reads, extracts, 
                    and verifies every document with mathematical precision - processing 
                    <strong>500+ invoices per hour</strong> while maintaining complete audit 
                    trails. Turns 3 days of manual data entry into 30 minutes.
                  </p>
                  <img
                    src="/images/Cyloid.png"
                    alt="Cyloid"
                    style={{maxWidth: '75px', margin: '20px auto', display: 'block', opacity: 0.9}}
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
                  <h3 className="module-benefit">AI Workforce Multiplier</h3>
                  <p className="section-content">
                    Your AI-powered execution engine that handles routine tasks at machine speed. 
                    Automates data entry, reconciliation, and report generation - enabling your 
                    team to <strong>handle 10x more clients without new hires</strong>. Average 
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
              <a href="https://finory.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <span className="module-name">Finory</span>
                  <h3 className="module-benefit">Real-Time Reporting</h3>
                  <p className="section-content">
                    Live financial dashboards that update automatically. See your 
                    entire financial picture in real-time - from cash flow to P&L - 
                    <strong>updated every 15 minutes</strong> without manual data entry.
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
              <a href="https://epi-q.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <span className="module-name">EPI-Q</span>
                  <h3 className="module-benefit">Predictive Tax Intelligence</h3>
                  <p className="section-content">
                    AI that forecasts tax liabilities 6 months ahead. Identifies optimization 
                    opportunities and recommends proactive strategies - <strong>average tax 
                    savings of 15-20%</strong> through early planning.
                  </p>
                  <img
                    src="/images/EPI-Q Transparent symbol.png"
                    alt="EPI-Q"
                    style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
            <div className="masonry-item item-sm">
              <a href="https://sumbuddy.io" target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="module-card" style={{cursor: 'pointer'}}>
                  <span className="module-name">Sumbuddy</span>
                  <h3 className="module-benefit">Smart Collaboration</h3>
                  <p className="section-content">
                    Unified communication layer for clients and internal teams.
                  </p>
                  <img
                    src="/images/SumBuddy Transparent symbol.png"
                    alt="Sumbuddy"
                    style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: 0.9}}
                  />
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="market-bento" style={{background: 'var(--color-surface)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div className="section-header" style={{textAlign: 'center', maxWidth: '800px', margin: '0 auto var(--spacing-3xl)'}}>
            <h2 className="section-title">
              <span>How the </span>
              <span className="home-thq-text-gradient-elm2">7 Modules Work Together</span>
            </h2>
            <p className="section-subtitle">
              Each module solves a specific problem. Together, they create an intelligent ecosystem 
              where the whole is greater than the sum of its parts.
            </p>
          </div>
          
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <h3 className="cell-title" style={{color: 'var(--color-primary)'}}>The Foundation: VAMN + Accute</h3>
                <p className="section-content">
                  <strong>Start here.</strong> VAMN provides the AI brain (data processing, verification, intelligence), 
                  while Accute orchestrates workflows. These two form the core operating system. Without them, 
                  the other modules can't function. Think: Windows or macOS for finance.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <h3 className="cell-title">Input Layer: Cyloid</h3>
                <p className="section-content">
                  Handles all incoming documents. Can work standalone for document processing, 
                  but reaches full power when feeding verified data into VAMN.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <h3 className="cell-title">Intelligence Layer: Luca</h3>
                <p className="section-content">
                  Provides expert guidance on complex scenarios. Uses VAMN's data to give 
                  contextual recommendations. Optional but highly valuable for tax optimization.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <h3 className="cell-title">Execution Layer: Finaid Hub</h3>
                <p className="section-content">
                  Automates routine tasks using VAMN's intelligence. Essential for firms 
                  wanting to scale without hiring. Works best with full system integration.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <h3 className="cell-title">Insights Layer: Finory + EPI-Q</h3>
                <p className="section-content">
                  Finory provides real-time dashboards. EPI-Q predicts future tax scenarios. 
                  Both read from VAMN's verified data for accurate forecasting.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <h3 className="cell-title">Communication Layer: Sumbuddy</h3>
                <p className="section-content">
                  Client portal and team collaboration. Shares insights from all modules. 
                  Optional but recommended for client-facing firms.
                </p>
              </div>
            </div>
          </div>
          
          <div style={{marginTop: 'var(--spacing-3xl)', textAlign: 'center', padding: 'var(--spacing-2xl)', background: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))', borderRadius: 'var(--border-radius-lg)'}}>
            <h3 className="section-subtitle" style={{marginBottom: 'var(--spacing-md)', color: 'var(--color-accent)'}}>
              💡 Can You Use Just One Module?
            </h3>
            <p className="section-content" style={{maxWidth: '700px', margin: '0 auto', fontSize: 'var(--font-size-lg)'}}>
              <strong>Short answer: No.</strong> You need the Foundation (VAMN + Accute) at minimum. 
              From there, add modules based on your needs: Cyloid for document chaos, Luca for complex 
              tax scenarios, Finaid Hub for scaling, Finory/EPI-Q for insights, Sumbuddy for clients. 
              Most firms start with Foundation + Cyloid + Finaid Hub = <strong>70% time savings</strong>.
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
                <button className="btn btn-primary">View Solutions</button>
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
                <button className="btn btn-outline btn-sm">Learn More</button>
              </div>
            </div>
            <div className="bento-cell-service cell-narrow-service">
              <div className="service-content">
                <h3 className="service-title">Corporate Finance</h3>
                <p className="section-content">
                  In-house teams gain real-time visibility and control across
                  global enterprise operations with Accute.
                </p>
                <button className="btn btn-outline btn-sm">Learn More</button>
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
                <button className="btn btn-outline btn-sm">Learn More</button>
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
                  <strong>Solution:</strong> Deployed Foundation (VAMN + Accute) + Cyloid + Finaid Hub
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
                <strong>Result:</strong> Accute orchestrating all entities, Finory delivering real-time consolidated dashboards, Cyloid ensuring compliance causality across jurisdictions.
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
      <a href="/">
        <div aria-label="FinACEverse" className="home-container6">
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px', marginRight: '10px'}} />
          <span className="home-text28">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  )
}

export default Home
