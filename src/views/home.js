import React, { useState, useEffect } from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './home.css'

// Default SVG icons for products
const DEFAULT_ICONS = {
  accute: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"></path><rect width="16" height="16" x="4" y="4" rx="2"></rect><rect width="8" height="8" x="8" y="8" rx="1"></rect></g></svg>`,
  luca: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12z"/><path d="M12 2v10h10a10 10 0 0 0-10-10z"/></g></svg>`,
  'finaid-hub': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></g></svg>`,
  'epi-q': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></g></svg>`,
  vamn: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14a9 3 0 0 0 18 0V5"></path><path d="M3 12a9 3 0 0 0 18 0"></path></g></svg>`,
  cyloid: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>`,
  taxblitz: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8m6 4H8m2 4H8"/></g></svg>`,
  audric: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></g></svg>`,
  sumbuddy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect width="18" height="18" x="3" y="4" rx="2"/><circle cx="12" cy="10" r="2"/><path d="M8 2v2m8-2v2"/></g></svg>`,
  finory: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></g></svg>`,
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8m-4-4h8"/></g></svg>`
};

// Product image URLs mapped by slug
const PRODUCT_IMAGES = {
  accute: '/images/Accute Transparent symbol.png',
  luca: '/images/Luca Transparent symbol (2).png',
  'finaid-hub': '/images/Fin(Ai)d Studio Transparent symbol.png',
  'epi-q': '/images/EPI-Q Transparent symbol.png',
  vamn: '/images/VAMN-7B Transparent logo.png',
  cyloid: '/images/Cyloid.png',
  finory: '/images/Finory Transparent symbol.png',
  sumbuddy: '/images/SumBuddy Transparent symbol.png'
};

const Home = (props) => {
  // Dynamic content state
  const [products, setProducts] = useState([]);
  const [pageContent, setPageContent] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Fetch products and content on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsRes = await fetch('/api/products?view=current');
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
        
        // Fetch page content
        const contentRes = await fetch('/api/content/home');
        const contentData = await contentRes.json();
        setPageContent(contentData.content || {});
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // Get content value with fallback
  const getContent = (section, key, fallback = '') => {
    return pageContent[section]?.[key] || fallback;
  };
  
  // Get icon for a product
  const getProductIcon = (product) => {
    if (product.icon_svg) {
      return <div dangerouslySetInnerHTML={{ __html: product.icon_svg }} />;
    }
    const defaultIcon = DEFAULT_ICONS[product.slug] || DEFAULT_ICONS.default;
    return <div dangerouslySetInnerHTML={{ __html: defaultIcon }} />;
  };
  
  // Get image for a product
  const getProductImage = (product) => {
    return product.image_url || PRODUCT_IMAGES[product.slug] || null;
  };
  
  // Filter products by phase
  const phase1Products = products.filter(p => p.phase === 1 || p.phase === '1');
  const phase2Products = products.filter(p => p.phase === 2 || p.phase === '2');
  // Show Phase 2 if there are products AND admin setting allows (default to true if there are phase 2 products)
  const showPhase2Setting = getContent('modules_header', 'show_phase2', 'true');
  const showPhase2 = phase2Products.length > 0 && (showPhase2Setting === 'true' || showPhase2Setting === true);
  
  return (
    <div className="home-container1">
      <Helmet>
        <title>FinACEverse - Cognitive Operating System for Autonomous Enterprises | Futurus</title>
        <meta name="description" content="We see what others don't. FinACEverse is the world's first Cognitive Operating System for Autonomous Enterprises — enabling organizational autonomy through understanding, execution, structure, and optimization." />
        <meta name="keywords" content="cognitive OS, autonomous enterprises, VAMN-70B, organizational autonomy, AI finance, Futurus, Accute, Luca, EPI-Q, Finory" />
        <meta property="og:title" content="FinACEverse - Cognitive Operating System for Autonomous Enterprises" />
        <meta property="og:description" content="We are Futurus. We build the Cognitive Operating System for Autonomous Enterprises. FinACEverse is only the beginning." />
        <meta property="og:url" content="https://finaceverse.io/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://finaceverse.io/logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FinACEverse - Cognitive OS for Autonomous Enterprises" />
        <meta name="twitter:description" content="The question is no longer 'How will AI fit into the enterprise?' The question is 'What becomes possible when the enterprise itself becomes intelligent?'" />
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
                The World&apos;s First Cognitive OS for Autonomous Enterprises
              </span>
            </div>
            <h1 className="hero-title">
              <span>
                {' '}
                Powering the Path to
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-gradient-elm1">Autonomous Enterprises</span>
            </h1>
            <p className="hero-subtitle">
              We see what others don&apos;t. The enterprise is reaching cognitive exhaustion. <strong>FinACEverse</strong> is the world&apos;s first 
              <strong>Cognitive Operating System for Autonomous Enterprises</strong> — the foundational layer that 
              unifies cognition, execution, optimization, and structural evolution. Not an app. Not a bot. 
              A full-stack cognitive infrastructure where <strong>Understanding → Execution → Structure → Optimization</strong> becomes 
              the continuous cycle of enterprise intelligence.
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
                Built for Stability.
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-accent-elm1">Facing Complexity.</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '700px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              Legacy enterprise software assumed the world would remain slow, linear, predictable. It assumed humans would always be the cognitive center. These assumptions are obsolete.
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
                <h3 className="cell-title">Intelligence Lives in Heads</h3>
                <p className="section-content">
                  Organizations run on human memory, tribal knowledge, and manual coordination. 
                  An enterprise cannot call itself digital if its intelligence still lives in people&apos;s heads. 
                  This fragility is unsustainable.
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
                <h3 className="cell-title">Systems Don&apos;t Reason</h3>
                <p className="section-content">
                  ERP, workflows, documents, emails — they were built to record, route, and store. 
                  Never to reason, infer, adapt, or evolve. Humans fill the cognitive gaps.
                </p>
                <div className="cell-footer">
                  <span className="stat-highlight">Record</span>
                  <span className="stat-label">Not Reason</span>
                </div>
              </div>
            </div>
            <div className="bento-cell cell-narrow">
              <div className="cell-content">
                <h3 className="cell-title">Scale Exceeds Limits</h3>
                <p className="section-content">
                  The world demands more decisions than people can make, more accuracy than 
                  people can maintain, more continuity than teams can provide.
                </p>
                <div className="cell-footer">
                  <span className="stat-highlight">Exponential</span>
                  <span className="stat-label">Complexity</span>
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
              <span>Who&apos;s Building the </span>
              <span className="home-thq-text-gradient-elm2">Future With Us</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '750px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              Finance is the proving ground — the most regulated, numerical, and audit-bound domain in the enterprise. 
              We start here with the professionals who understand this complexity. Once organizational autonomy is proven in finance, it scales across the entire enterprise.
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
            
            {/* Bridge Card - Enterprise Expansion */}
            <div className="bento-cell cell-wide" style={{background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, var(--color-surface-elevated)) 0%, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface-elevated)) 100%)', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)', border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)'}}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <div>
                  <h3 className="cell-title" style={{color: 'var(--color-primary)'}}>And Then... The Entire Enterprise</h3>
                </div>
              </div>
              <p className="section-content" style={{fontSize: 'var(--font-size-lg)', lineHeight: 1.7}}>
                The Cognitive OS is built to replicate across domains. Each domain becomes a universe within the <strong>Futurus Multiverse</strong>. 
                Marketing, Legal, HR, Supply Chain — all inheriting the same architecture: <em>Understanding → Execution → Structure → Optimization</em>. 
                These early adopters are proving what becomes possible when the enterprise itself becomes intelligent.
              </p>
              <div style={{marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap'}}>
                <span style={{padding: 'var(--spacing-sm) var(--spacing-md)', background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)'}}>🎯 Marketing Universe</span>
                <span style={{padding: 'var(--spacing-sm) var(--spacing-md)', background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)'}}>⚖️ Legal Universe</span>
                <span style={{padding: 'var(--spacing-sm) var(--spacing-md)', background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)'}}>👥 HR Universe</span>
                <span style={{padding: 'var(--spacing-sm) var(--spacing-md)', background: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-sm)'}}>🔗 Supply Chain Universe</span>
              </div>
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
                The Cognitive
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-gradient-elm2">Cycle</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '700px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              To enable organizational autonomy, four capabilities must converge. We have built all four.
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
                <h3 className="step-title">Cognitive Understanding</h3>
                <p className="section-content">
                  <strong>VAMN-70B</strong> is our neuro-symbolic foundation model — integrating 
                  neural language reasoning, symbolic numeric logic, and grounded citation generation. 
                  It reads with legal-grade accuracy, interprets with accountant-grade precision, 
                  and calculates with mathematical determinism. <em>Coming Soon.</em>
                </p>
              </div>
            </div>
            <div className="timeline-item right">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>02</span>
                </div>
                <h3 className="step-title">Understanding Layer</h3>
                <p className="section-content">
                  <strong>Intellexion</strong> provides document intelligence for financial, legal, 
                  and operational documents. <strong>Synapse</strong> delivers retrieval and semantic 
                  indexing across structured and unstructured data. Together, they give the OS complete 
                  visibility into the information fabric of your enterprise.
                </p>
              </div>
            </div>
            <div className="timeline-item left">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>03</span>
                </div>
                <h3 className="step-title">Execution Layer</h3>
                <p className="section-content">
                  Understanding without execution is incomplete. <strong>Fin(Ai)d Studio</strong> enables 
                  AI agent creation. <strong>Luca</strong> delivers accounting superintelligence. 
                  <strong>TaxBlitz</strong> and <strong>Audric</strong> will power autonomous tax and audit 
                  operations. This is where cognition becomes action. <em>(TaxBlitz & Audric coming soon)</em>
                </p>
              </div>
            </div>
            <div className="timeline-item right">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>04</span>
                </div>
                <h3 className="step-title">Self-Optimization</h3>
                <p className="section-content">
                  An autonomous enterprise must understand how work actually flows. 
                  <strong>EPI-Q</strong> provides process mining, task mining, and communication mining. 
                  It reveals bottlenecks, shadow processes, and deviations — becoming the continuous 
                  feedback loop for enterprise evolution. The OS perceives, acts, adapts, and improves — endlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="ai-maturity-stages" style={{background: 'var(--color-surface)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>The Five Stages of </span>
              <span className="home-thq-text-gradient-elm2">AI Maturity</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '600px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              The future demands autonomous enterprises. FinACEverse enables Stage 5.
            </p>
          </div>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap', marginTop: 'var(--spacing-2xl)'}}>
            <div style={{padding: 'var(--spacing-lg)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', minWidth: '140px', opacity: 0.6}}>
              <div style={{fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-muted)'}}>Stage 1</div>
              <div style={{fontSize: 'var(--font-size-lg)', fontWeight: '700', marginTop: 'var(--spacing-xs)'}}>Automation</div>
              <div style={{fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)'}}>✓ Complete</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{opacity: 0.5}}><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            <div style={{padding: 'var(--spacing-lg)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', minWidth: '140px', opacity: 0.6}}>
              <div style={{fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-muted)'}}>Stage 2</div>
              <div style={{fontSize: 'var(--font-size-lg)', fontWeight: '700', marginTop: 'var(--spacing-xs)'}}>Assistance</div>
              <div style={{fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)'}}>✓ Complete</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{opacity: 0.5}}><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            <div style={{padding: 'var(--spacing-lg)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', minWidth: '140px', opacity: 0.6}}>
              <div style={{fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-muted)'}}>Stage 3</div>
              <div style={{fontSize: 'var(--font-size-lg)', fontWeight: '700', marginTop: 'var(--spacing-xs)'}}>Augmentation</div>
              <div style={{fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)'}}>✓ Complete</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{opacity: 0.5}}><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            <div style={{padding: 'var(--spacing-lg)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', minWidth: '140px', opacity: 0.7}}>
              <div style={{fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-muted)'}}>Stage 4</div>
              <div style={{fontSize: 'var(--font-size-lg)', fontWeight: '700', marginTop: 'var(--spacing-xs)'}}>Functional Autonomy</div>
              <div style={{fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)'}}>✓ Complete</div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
            <div style={{padding: 'var(--spacing-lg)', background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', borderRadius: 'var(--border-radius-md)', textAlign: 'center', minWidth: '160px', color: 'white', boxShadow: '0 4px 20px rgba(var(--color-primary-rgb), 0.4)'}}>
              <div style={{fontSize: 'var(--font-size-sm)', fontWeight: '600', opacity: 0.9}}>Stage 5</div>
              <div style={{fontSize: 'var(--font-size-xl)', fontWeight: '700', marginTop: 'var(--spacing-xs)'}}>Organizational Autonomy</div>
              <div style={{fontSize: 'var(--font-size-xs)', marginTop: 'var(--spacing-xs)', fontWeight: '600'}}>→ FinACEverse</div>
            </div>
          </div>
          <div style={{marginTop: 'var(--spacing-2xl)', textAlign: 'center', maxWidth: '800px', margin: 'var(--spacing-2xl) auto 0'}}>
            <p style={{fontSize: 'var(--font-size-lg)', lineHeight: 1.7, opacity: 0.9}}>
              Enterprises that can <strong>sense change</strong>, <strong>interpret it</strong>, <strong>decide on action</strong>, 
              <strong>execute end-to-end</strong>, <strong>evaluate results</strong>, and <strong>improve</strong> — continuously, 
              without depending on human orchestration. This is organizational autonomy.
            </p>
          </div>
        </div>
      </section>
      <section className="futurus-multiverse" style={{background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, var(--color-background)) 0%, var(--color-background) 100%)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>The Futurus </span>
              <span className="home-thq-text-accent-elm2">Multiverse</span>
            </h2>
            <p className="section-subtitle" style={{maxWidth: '700px', margin: 'var(--spacing-md) auto 0', textAlign: 'center'}}>
              Finance is only the first universe. The Cognitive OS replicates across domains.
            </p>
          </div>
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-2xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-accent) 70%, var(--color-primary)))', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)', color: 'white'}}>
              <div className="cell-content" style={{textAlign: 'center'}}>
                <h3 className="cell-title" style={{color: 'white', fontSize: 'var(--font-size-2xl)'}}>FinACEverse</h3>
                <p style={{opacity: 0.95, fontSize: 'var(--font-size-lg)', maxWidth: '600px', margin: '0 auto'}}>
                  The first universe. Finance is the proving ground because it is the most regulated, 
                  numerical, interdependent, document-heavy, audit-bound domain in the enterprise. 
                  <strong> If autonomy can be achieved here, it can be achieved anywhere.</strong>
                </p>
                <div style={{marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--border-radius-sm)', display: 'inline-block'}}>
                  <span style={{fontWeight: '600'}}>🚀 Live Now</span>
                </div>
              </div>
            </div>
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', opacity: 0.7}}>
              <h3 className="cell-title">Marketing Universe</h3>
              <p className="section-content">Autonomous marketing operations, campaign orchestration, and performance optimization.</p>
              <span style={{fontSize: 'var(--font-size-sm)', opacity: 0.6}}>Coming Soon</span>
            </div>
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', opacity: 0.7}}>
              <h3 className="cell-title">Legal Universe</h3>
              <p className="section-content">Contract intelligence, compliance automation, and legal workflow orchestration.</p>
              <span style={{fontSize: 'var(--font-size-sm)', opacity: 0.6}}>Coming Soon</span>
            </div>
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', opacity: 0.7}}>
              <h3 className="cell-title">HR Universe</h3>
              <p className="section-content">Talent intelligence, workforce planning, and people operations automation.</p>
              <span style={{fontSize: 'var(--font-size-sm)', opacity: 0.6}}>Coming Soon</span>
            </div>
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', opacity: 0.7}}>
              <h3 className="cell-title">Supply Chain Universe</h3>
              <p className="section-content">Procurement intelligence, logistics optimization, and supply network orchestration.</p>
              <span style={{fontSize: 'var(--font-size-sm)', opacity: 0.6}}>Coming Soon</span>
            </div>
          </div>
          <div style={{marginTop: 'var(--spacing-2xl)', textAlign: 'center', padding: 'var(--spacing-xl)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--border-radius-lg)', maxWidth: '800px', margin: 'var(--spacing-2xl) auto 0'}}>
            <p style={{fontSize: 'var(--font-size-xl)', fontStyle: 'italic', lineHeight: 1.6}}>
              &quot;The goal is not to automate industries. It is to create ecosystems where organizations evolve themselves.&quot;
            </p>
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
              {showPhase2 ? 'Tools do tasks. Operating systems run worlds.' : 'Phase 1: The foundation of the Cognitive OS.'}
            </p>
          </div>
          <div className="masonry-grid">
            {loading ? (
              <div style={{textAlign: 'center', padding: 'var(--spacing-2xl)', width: '100%'}}>
                <p>Loading modules...</p>
              </div>
            ) : (
              <>
                {/* PHASE 1 - Dynamic Product Cards */}
                {phase1Products.map((product, index) => {
                  const productImage = getProductImage(product);
                  const isLarge = index === 0;
                  const productUrl = product.website_url || `https://${product.slug}.io`;
                  const hasExternalUrl = !!product.website_url;
                  
                  const CardContent = (
                    <div className={`module-card${product.status === 'coming_soon' ? ' secondary' : ''}`} style={{cursor: hasExternalUrl ? 'pointer' : 'default', position: 'relative'}}>
                      {product.status === 'coming_soon' && (
                        <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                      )}
                      {isLarge && product.tag ? (
                        <div className="module-header">
                          <span className="module-name">{product.name}</span>
                          <div className="module-tag">
                            <span>{product.tag}</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="module-name">{product.name}</span>
                          {product.tag && (
                            <div className="module-tag">
                              <span>{product.tag}</span>
                            </div>
                          )}
                        </>
                      )}
                      <h3 className="module-benefit">{product.tagline || product.short_description}</h3>
                      <p className="section-content" dangerouslySetInnerHTML={{ __html: product.description }} />
                      {productImage && (
                        <img
                          src={productImage}
                          alt={product.name}
                          style={{
                            maxWidth: isLarge ? '80px' : '60px',
                            margin: isLarge ? '20px auto' : '15px auto',
                            display: 'block',
                            opacity: product.status === 'coming_soon' ? 0.7 : 0.9
                          }}
                        />
                      )}
                    </div>
                  );
                  
                  return (
                    <div key={product.id} className={`masonry-item ${isLarge ? 'item-lg' : 'item-sm'}`}>
                      {hasExternalUrl ? (
                        <a href={productUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                          {CardContent}
                        </a>
                      ) : (
                        CardContent
                      )}
                    </div>
                  );
                })}
                
                {/* PHASE 2 - Dynamic Coming Soon Cards */}
                {showPhase2 && phase2Products.map((product) => {
                  const productImage = getProductImage(product);
                  const productUrl = product.website_url || `https://${product.slug}.io`;
                  const hasExternalUrl = !!product.website_url;
                  
                  const CardContent = (
                    <div className={`module-card${product.status === 'coming_soon' ? ' secondary' : ''}`} style={{cursor: hasExternalUrl ? 'pointer' : 'default', position: 'relative'}}>
                      {product.status === 'coming_soon' && (
                        <div style={{position: 'absolute', top: '10px', right: '10px', background: 'var(--color-accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>COMING SOON</div>
                      )}
                      <span className="module-name">{product.name}</span>
                      {product.tag && (
                        <div className="module-tag">
                          <span>{product.tag}</span>
                        </div>
                      )}
                      <h3 className="module-benefit">{product.tagline || product.short_description}</h3>
                      <p className="section-content" dangerouslySetInnerHTML={{ __html: product.description }} />
                      {productImage && (
                        <img
                          src={productImage}
                          alt={product.name}
                          style={{maxWidth: '60px', margin: '15px auto', display: 'block', opacity: product.status === 'coming_soon' ? 0.7 : 0.9}}
                        />
                      )}
                    </div>
                  );
                  
                  return (
                    <div key={product.id} className="masonry-item item-sm">
                      {hasExternalUrl ? (
                        <a href={productUrl} target="_blank" rel="noopener noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
                          {CardContent}
                        </a>
                      ) : (
                        CardContent
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </section>
      <section className="modules-together" style={{background: 'var(--color-surface)', padding: 'var(--spacing-4xl) 0'}}>
        <div className="container-wrapper">
          <div style={{textAlign: 'center', maxWidth: '900px', margin: '0 auto var(--spacing-3xl)', width: '100%'}}>
            <h2 className="section-title" style={{textAlign: 'center', marginBottom: 'var(--spacing-md)'}}>
              <span>Understanding → Execution → </span>
              <span className="home-thq-text-gradient-elm2">Structure → Optimization</span>
            </h2>
            <p style={{opacity: 0.85, fontSize: 'var(--font-size-lg)', maxWidth: '700px', margin: '0 auto', textAlign: 'center', lineHeight: 1.6}}>
              This is the cognitive cycle of an autonomous enterprise. Each module serves a distinct purpose in the ecosystem.
            </p>
          </div>
          
          <div className="bento-grid" style={{gap: 'var(--spacing-xl)'}}>
            <div className="bento-cell cell-wide" style={{background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))', padding: 'var(--spacing-2xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <picture>
                  <source srcSet="/images/Accute Transparent symbol.webp" type="image/webp" />
                  <img src="/images/Accute Transparent symbol.png" alt="Accute" width="40" height="40" loading="lazy" decoding="async" style={{height: '40px', width: '40px', marginBottom: 'var(--spacing-md)', opacity: 0.9}} />
                </picture>
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
                <picture>
                  <source srcSet="/images/Luca Transparent symbol (2).webp" type="image/webp" />
                  <img src="/images/Luca Transparent symbol (2).png" alt="Luca" width="35" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                </picture>
                <h3 className="cell-title">Expert Layer: Luca</h3>
                <p className="section-content">
                  AI domain expert with CPA-level knowledge. Answers complex tax and 
                  accounting questions instantly with contextual recommendations.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <picture>
                  <source srcSet="/images/Fin(Ai)d Studio Transparent symbol.webp" type="image/webp" />
                  <img src="/images/Fin(Ai)d Studio Transparent symbol.png" alt="Finaid Hub" width="35" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                </picture>
                <h3 className="cell-title">Execution Layer: Finaid Hub</h3>
                <p className="section-content">
                  AI workforce multiplier. Handles routine tasks at machine speed, 
                  enabling your team to handle 10x more clients.
                </p>
              </div>
            </div>
            
            <div className="bento-cell cell-narrow" style={{background: 'var(--color-surface-elevated)', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)'}}>
              <div className="cell-content">
                <picture>
                  <source srcSet="/images/EPI-Q Transparent symbol.webp" type="image/webp" />
                  <img src="/images/EPI-Q Transparent symbol.png" alt="EPI-Q" width="35" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                </picture>
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
                    <picture>
                      <source srcSet="/images/Cyloid.webp" type="image/webp" />
                      <img src="/images/Cyloid.png" alt="Cyloid" width="35" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    </picture>
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
                    <picture>
                      <source srcSet="/images/VAMN-7B Transparent logo.webp" type="image/webp" />
                      <img src="/images/VAMN-7B Transparent logo.png" alt="VAMN" width="53" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '53px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    </picture>
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
                    <picture>
                      <source srcSet="/images/Finory Transparent symbol.webp" type="image/webp" />
                      <img src="/images/Finory Transparent symbol.png" alt="Finory" width="35" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    </picture>
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
                    <picture>
                      <source srcSet="/images/SumBuddy Transparent symbol.webp" type="image/webp" />
                      <img src="/images/SumBuddy Transparent symbol.png" alt="Sumbuddy" width="35" height="35" loading="lazy" decoding="async" style={{height: '35px', width: '35px', marginBottom: 'var(--spacing-sm)', opacity: 0.9}} />
                    </picture>
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
                <a href="/modules" aria-label="Explore tax practitioner solutions">
                  <button className="btn btn-outline btn-sm">Explore Tax Solutions</button>
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
                <a href="/expert-consultation" aria-label="Consult our corporate finance experts">
                  <button className="btn btn-outline btn-sm">Consult Our Experts</button>
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
                <a href="/compliance-privacy" aria-label="View compliance and audit features">
                  <button className="btn btn-outline btn-sm">View Compliance Features</button>
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
                  What Becomes Possible When the Enterprise
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </span>
                <span className="home-thq-text-gradient-elm5">Becomes Intelligent?</span>
              </h2>
              <p className="section-subtitle">
                We are Futurus. We build the Cognitive Operating System for Autonomous Enterprises.
              </p>
              <div className="cta-form-wrapper">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = e.target.elements.email.value;
                    window.location.href = `mailto:info@finacegroup.com?subject=Demo Request from ${email}&body=Business email: ${email}%0D%0A%0D%0AI'm interested in scheduling a demo of FinACEverse.`;
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
