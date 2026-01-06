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
        <title>FinACEverse - Cognitive Operating System for Finance</title>
        <meta property="og:title" content="FinACEverse - Cognitive Operating System for Finance" />
        <link
          rel="canonical"
          href="https://scary-impeccable-ibex-vzbllw.teleporthq.app/"
        />
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
              FinACEverse integrates accounting, finance, and taxation into a
              single cognitive ecosystem. Powered by VAMN and Accute, we
              eliminate fragmentation to restore coherence in financial
              operations.
            </p>
            <div className="hero-actions">
              <a href="mailto:vithal@finacegroup.com?subject=Demo Request&body=I'm interested in scheduling a demo of FinACEverse." className="btn btn-primary btn-lg">Request Demo</a>
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
                <h3 className="step-title">VAMN Stream Input</h3>
                <p className="section-content">
                  Financial intelligence begins with our Verifiable Arithmetic
                  Multi-Stream Network, employing specialized cognitive streams
                  for raw data ingestion.
                </p>
              </div>
            </div>
            <div className="timeline-item right">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>02</span>
                </div>
                <h3 className="step-title">Accute Orchestration</h3>
                <p className="section-content">
                  Accute establishes a shared ontology, orchestrating workflows
                  across financial reporting, tax prep, and audits as the
                  firm&apos;s central source of truth.
                </p>
              </div>
            </div>
            <div className="timeline-item left">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <div className="step-number">
                  <span>03</span>
                </div>
                <h3 className="step-title">Cyloid Verification</h3>
                <p className="section-content">
                  Every document entering the system is mathematically verified
                  by Cyloid, transforming unstructured data into verified facts
                  through compliance causality.
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
              <div className="module-card">
                <div className="module-header">
                  <span className="module-name">Accute</span>
                  <div className="module-tag">
                    <span>Orchestrator</span>
                  </div>
                </div>
                <h3 className="module-benefit">Operational Orchestration</h3>
                <p className="section-content">
                  Orchestrates every financial cycle with unified compliance logic,
                  coordinating VAMN's cognitive intelligence across workflows.
                </p>
                <img
                  src="https://images.pexels.com/photos/30547598/pexels-photo-30547598.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  alt="Accute module visualization"
                />
              </div>
            </div>
            <div className="masonry-item item-sm">
              <div className="module-card secondary">
                <span className="module-name">VAMN</span>
                <div className="module-tag">
                  <span>Core</span>
                </div>
                <h3 className="module-benefit">Cognitive Brain</h3>
                <p className="section-content">
                  The central brain of FinACEverse - multi-stream network for
                  rigorous financial intelligence and calculation accuracy.
                </p>
              </div>
            </div>
            <div className="masonry-item item-md">
              <div className="module-card accent">
                <span className="module-name">Cyloid</span>
                <h3 className="module-benefit">Verification Eyes</h3>
                <p className="section-content">
                  The eyes of FinACEverse - turns every incoming document into an
                  indisputable fact through mathematical verification.
                </p>
                <img
                  src="https://images.pexels.com/photos/30547616/pexels-photo-30547616.jpeg?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  alt="Cyloid verification"
                />
              </div>
            </div>
            <div className="masonry-item item-sm">
              <div className="module-card">
                <span className="module-name">Luca</span>
                <h3 className="module-benefit">Domain Intelligence</h3>
                <p className="section-content">
                  AI-powered expertise for complex accounting and tax decision
                  support.
                </p>
              </div>
            </div>
            <div className="masonry-item item-sm">
              <div className="module-card">
                <span className="module-name">Finaid Hub</span>
                <h3 className="module-benefit">Execution at Scale</h3>
                <p className="section-content">
                  Scale your firm&apos;s capacity without increasing your
                  headcount.
                </p>
              </div>
            </div>
            <div className="masonry-item item-md">
              <div className="module-card elevated">
                <span className="module-name">Finory &amp; EPI-Q</span>
                <h3 className="module-benefit">Reporting &amp; Intelligence</h3>
                <p className="section-content">
                  Real-time reporting and predictive intelligence for proactive
                  taxation strategy.
                </p>
                <img
                  src="https://images.pexels.com/photos/17485707/pexels-photo-17485707.png?auto=compress&amp;cs=tinysrgb&amp;w=1500"
                  alt="Finory intelligence"
                />
              </div>
            </div>
            <div className="masonry-item item-sm">
              <div className="module-card">
                <span className="module-name">Sumbuddy</span>
                <h3 className="module-benefit">Smart Collaboration</h3>
                <p className="section-content">
                  Unified communication layer for clients and internal teams.
                </p>
              </div>
            </div>
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
          </div>
        </div>
      </section>
      <section className="testimonials-carousel">
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>
                {' '}
                Client
                <span
                  dangerouslySetInnerHTML={{
                    __html: ' ',
                  }}
                />
              </span>
              <span className="home-thq-text-gradient-elm4">Testimonials</span>
            </h2>
            <p className="section-subtitle">
              Coming soon - hear from early adopters and pilot program participants
            </p>
          </div>
          <div className="carousel-container">
            <div className="carousel-track">
              <div className="testimonial-card">
                <div className="quote-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12M10 21L10 18C10 16.8954 9.10457 16 8 16H5C4.44772 16 4 15.5523 4 15V9C4 8.44772 4.44772 8 5 8H8C8.55228 8 9 8.44772 9 9V12"
                    ></path>
                  </svg>
                </div>
                <p className="testimonial-text" style={{opacity: 0.5, fontStyle: 'italic'}}>
                  Testimonials from pilot program participants will be featured here as we onboard early adopters.
                </p>
                <div className="testimonial-author">
                  <span className="author-name">Coming Soon</span>
                  <span className="author-role">
                    Pilot Program Participants
                  </span>
                </div>
              </div>
            </div>
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
                    Request Demo
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
