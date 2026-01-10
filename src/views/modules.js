import React, { useState, useEffect } from 'react'

import Script from 'dangerous-html/react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './modules.css'

// Default SVG icons for products without custom icons
const DEFAULT_ICONS = {
  accute: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 20v2m0-20v2m5 16v2m0-20v2M2 12h2m-2 5h2M2 7h2m16 5h2m-2 5h2M20 7h2M7 20v2M7 2v2"></path><rect width="16" height="16" x="4" y="4" rx="2"></rect><rect width="8" height="8" x="8" y="8" rx="1"></rect></g></svg>`,
  vamn: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14a9 3 0 0 0 18 0V5"></path><path d="M3 12a9 3 0 0 0 18 0"></path></g></svg>`,
  cyloid: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>`,
  luca: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12z"/><path d="M12 2v10h10a10 10 0 0 0-10-10z"/></g></svg>`,
  'finaid-hub': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></g></svg>`,
  sumbuddy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect width="18" height="18" x="3" y="4" rx="2"/><circle cx="12" cy="10" r="2"/><path d="M8 2v2m8-2v2"/></g></svg>`,
  'epi-q': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></g></svg>`,
  taxblitz: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M14 8H8m6 4H8m2 4H8"/></g></svg>`,
  audric: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></g></svg>`,
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></g></svg>`
};

// Product image URLs mapped by slug
const PRODUCT_IMAGES = {
  accute: '/images/Accute Transparent symbol.png',
  vamn: '/images/VAMN-7B Transparent logo.png',
  cyloid: '/images/Cyloid.png',
  luca: '/images/Luca Transparent symbol (2).png',
  'finaid-hub': '/images/Fin(Ai)d Studio Transparent symbol.png',
  sumbuddy: '/images/SumBuddy Transparent symbol.png',
  'epi-q': '/images/EPI-Q Transparent symbol.png',
  finory: '/images/Finory Transparent symbol.png'
};

const Modules = () => {
  const [viewMode, setViewMode] = useState('current');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageContent, setPageContent] = useState({});

  // Fetch page content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/content/modules');
        const data = await response.json();
        setPageContent(data.content || {});
      } catch (err) {
        console.error('Failed to fetch content:', err);
      }
    };
    fetchContent();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products?view=${viewMode}`);
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [viewMode]);

  // Get content value with fallback
  const getContent = (section, key, fallback = '') => {
    return pageContent[section]?.[key] || fallback;
  };

  // Get icon for a product
  const getIcon = (product) => {
    if (product.icon_svg) {
      return <div dangerouslySetInnerHTML={{ __html: product.icon_svg }} />;
    }
    const defaultIcon = DEFAULT_ICONS[product.slug] || DEFAULT_ICONS.default;
    return <div dangerouslySetInnerHTML={{ __html: defaultIcon }} />;
  };

  // Get image for a product
  const getProductImage = (slug) => {
    return PRODUCT_IMAGES[slug] || null;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      launched: <span className="product-status-badge launched">Live</span>,
      launching: <span className="product-status-badge launching">Launching Soon</span>,
      coming_soon: <span className="product-status-badge coming-soon">Coming Soon</span>,
      planned: <span className="product-status-badge planned">In Development</span>
    };
    return badges[status] || badges.planned;
  };

  // Filter products by type
  const heroProducts = products.filter(p => p.is_hero);
  const capabilityProducts = products.filter(p => !p.is_hero || products.length <= 3);

  // Render a hero card
  const renderHeroCard = (product) => {
    const cardContent = (
      <div className={`modules-hero-card modules-hero-${product.slug}`} style={{cursor: product.external_url ? 'pointer' : 'default'}}>
        {getStatusBadge(product.status)}
        <div className="modules-hero-card-icon">
          {getIcon(product)}
        </div>
        <h3 className="section-subtitle">{product.name}</h3>
        <p className="section-content">{product.tagline}</p>
      </div>
    );

    if (product.external_url) {
      return (
        <a 
          key={product.id} 
          href={product.external_url} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{textDecoration: 'none', color: 'inherit'}}
        >
          {cardContent}
        </a>
      );
    }
    return <div key={product.id}>{cardContent}</div>;
  };

  // Render a capability cell
  const renderCapabilityCell = (product) => {
    const cellClass = `capabilities-cell cell-${product.cell_size || 'medium'}`;
    const image = getProductImage(product.slug);
    const features = Array.isArray(product.features) ? product.features : [];

    return (
      <div key={product.id} className={cellClass}>
        <div className="cell-content">
          {product.cell_tag && <span className="cell-tag">{product.cell_tag}</span>}
          {image && (
            <img 
              src={image} 
              alt={product.name} 
              style={{height: '32px', opacity: 0.9, marginBottom: '8px'}} 
            />
          )}
          <h3 className="section-subtitle">{product.name}</h3>
          <p className="section-content">{product.description || product.tagline}</p>
          {features.length > 0 && (
            <ul className="cell-list">
              {features.map((feature, idx) => (
                <li key={idx} className="section-content">
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}
          {getStatusBadge(product.status)}
        </div>
      </div>
    );
  };

  return (
    <div className="modules-container1">
      <Helmet>
        <title>FinACEverse Modules - AI-Powered Financial Solutions</title>
        <meta name="description" content="Explore FinACEverse's specialized modules: cognitive intelligence, orchestration, verification, and more. Transform your financial operations." />
        <meta name="keywords" content={products.map(p => p.name).join(', ') + ', financial modules, AI finance tools'} />
        <meta property="og:title" content="FinACEverse Modules - AI-Powered Financial Solutions" />
        <meta property="og:description" content="Specialized modules working in harmony to transform your financial operations." />
        <meta property="og:url" content="https://finaceverse.io/modules" />
        <link rel="canonical" href="https://finaceverse.io/modules" />
      </Helmet>
      
      <Navigation />
      
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

      {/* Hero Section */}
      <section className="modules-hero">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.pexels.com/videos/34127887/pictures/preview-0.jpg"
          src="https://videos.pexels.com/video-files/34127887/14471394_640_360_30fps.mp4"
          className="modules-hero-video"
        />
        <div className="modules-hero-overlay"></div>
        <div className="modules-hero-container">
          <div className="modules-hero-bento">
            <div className="modules-hero-main">
              <h1 className="hero-title">{getContent('hero', 'title', 'Unified Cognitive Intelligence')}</h1>
              <p className="hero-subtitle">
                {getContent('hero', 'subtitle', 'Experience the future of finance with FinACEverse. Our integrated Cognitive Operating System harmonizes accounting, finance, and taxation into a single source of truth.')}
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
            
            {/* Dynamic Hero Cards */}
            {loading ? (
              <div className="modules-hero-loading">Loading products...</div>
            ) : (
              heroProducts.slice(0, 3).map(renderHeroCard)
            )}
          </div>
        </div>
      </section>

      {/* Capabilities Section - Dynamic */}
      <section id="capabilities" className="capabilities-grid">
        <div className="capabilities-header">
          <h2 className="section-title">{getContent('capabilities', 'title', 'Modular Capabilities')}</h2>
          <p className="section-content">
            {getContent('capabilities', 'subtitle', 
              products.length > 0 
                ? `Our ${products.length} specialized modules work in perfect synchronicity to redefine your capacity.`
                : 'Our specialized modules work in perfect synchronicity to redefine your capacity.'
            )}
          </p>
        </div>
        <div className="capabilities-bento">
          {loading ? (
            <div className="capabilities-loading">Loading capabilities...</div>
          ) : products.length > 0 ? (
            products.map(renderCapabilityCell)
          ) : (
            <div className="capabilities-empty">
              <p>No products available. Please seed products from SuperAdmin.</p>
            </div>
          )}
        </div>
      </section>

      {/* Integration Timeline */}
      <section id="integration" className="integration-section">
        <div className="integration-container">
          <h2 className="section-title">{getContent('integration', 'title', 'Integration Journey')}</h2>
          <p className="section-content integration-subtitle">
            {getContent('integration', 'subtitle', 'A structured approach to transforming your financial operations')}
          </p>
          <div className="modules-timeline">
            <div className="modules-timeline-item left">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">{getContent('timeline', 'phase1_title', 'Phase 1: Discovery')}</h3>
                <p className="section-content">
                  {getContent('timeline', 'phase1_description', 'Analysis of existing tech stack and workflow fragmentation. Identification of key module bundles.')}
                </p>
                <span className="timeline-time">{getContent('timeline', 'phase1_time', 'Week 1-2')}</span>
              </div>
            </div>
            <div className="modules-timeline-item right">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">{getContent('timeline', 'phase2_title', 'Phase 2: Core Integration')}</h3>
                <p className="section-content">
                  {getContent('timeline', 'phase2_description', 'Establishing the data layer and connecting specialized cognitive streams to your core systems.')}
                </p>
                <span className="timeline-time">{getContent('timeline', 'phase2_time', 'Week 3-5')}</span>
              </div>
            </div>
            <div className="modules-timeline-item left">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">{getContent('timeline', 'phase3_title', 'Phase 3: Module Activation')}</h3>
                <p className="section-content">
                  {getContent('timeline', 'phase3_description', 'Sequential rollout of modules with tailored training programs.')}
                </p>
                <span className="timeline-time">{getContent('timeline', 'phase3_time', 'Week 6-8')}</span>
              </div>
            </div>
            <div className="modules-timeline-item right">
              <div className="modules-timeline-dot"></div>
              <div className="modules-timeline-content">
                <h3 className="section-subtitle">{getContent('timeline', 'phase4_title', 'Phase 4: Optimization')}</h3>
                <p className="section-content">
                  {getContent('timeline', 'phase4_description', 'Success milestone review and performance tuning for maximum efficiency gains.')}
                </p>
                <span className="timeline-time">{getContent('timeline', 'phase4_time', 'Week 9+')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="modules-cta">
        <div className="cta-container">
          <div className="cta-grid">
            <div className="cta-main">
              <h2 className="section-title">
                {getContent('cta', 'title', 'Ready to Transform Your Operations?')}
              </h2>
              <p className="section-content">
                {getContent('cta', 'subtitle', "Join the pioneers of the Cognitive Operating System. Whether you're a professional firm or an enterprise department, FinACEverse is built for your scale.")}
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
                    <span>{getContent('cta', 'bundle1', 'Audit Excellence Pack')}</span>
                  </li>
                  <li className="section-content">
                    <span>{getContent('cta', 'bundle2', 'Tax Scale Accelerator')}</span>
                  </li>
                  <li className="section-content">
                    <span>{getContent('cta', 'bundle3', 'Corporate OS Suite')}</span>
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
// Dynamic modules page
</script>`}
          ></Script>
        </div>
      </div>
      
      <Footer />
      
      <a href="/request-demo">
        <div aria-label="Request Demo" className="modules-container4">
          <img src="/logo.svg" alt="FinACEverse" style={{width: '24px', height: '24px'}} />
          <span className="modules-text29">Propel Past Paradigms</span>
        </div>
      </a>
    </div>
  );
};

export default Modules;
