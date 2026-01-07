import React from 'react'

import Script from 'dangerous-html/react'

import './navigation.css'

const Navigation = (props) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="navigation-container1">
      <nav className="navigation-wrapper">
        <div className="navigation-container">
          <a href="/">
            <div aria-label="FinACEverse Homepage" className="navigation-brand">
              <div className="navigation-logo-icon">
                <img src="/logo.svg" alt="FinACEverse Logo" style={{width: '100%', height: '100%'}} />
              </div>
              <span className="navigation-brand-text section-title">
                FinACEverse
              </span>
            </div>
          </a>
          <div className="navigation-desktop-menu">
            <ul className="navigation-links">
              <li className="navigation-item">
                <a href="/">
                  <div className="navigation-link">
                    <span>Home</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item">
                <a href="/modules">
                  <div className="navigation-link">
                    <span>Modules</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item">
                <a href="/tailored-pilots">
                  <div className="navigation-link">
                    <span>Pilot Programs</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item">
                <a href="/expert-consultation">
                  <div className="navigation-link">
                    <span>Consultation</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item">
                <a href="/blog">
                  <div className="navigation-link">
                    <span>Blog</span>
                  </div>
                </a>
              </li>
            </ul>
            <div className="navigation-actions">
              <button 
                onClick={toggleTheme}
                className="theme-toggle-btn"
                aria-label="Toggle theme"
                title="Toggle light/dark mode"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12t-1.463 3.538T12 17m-7-4H1v-2h4zm18 0h-4v-2h4zM11 5V1h2v4zm0 18v-4h2v4zM6.4 7.75L3.875 5.325L5.3 3.85l2.4 2.5zm12.3 12.4l-2.425-2.525L17.6 16.25l2.525 2.425zM16.25 6.4l2.425-2.525L20.15 5.3l-2.5 2.4zM3.85 18.7l2.525-2.425L7.75 17.6l-2.425 2.525z"/>
                </svg>
              </button>
              <a href="/request-demo">
                <div className="btn btn-sm btn-primary">
                  <span>Request Demo</span>
                </div>
              </a>
            </div>
          </div>
          <div className="navigation-mobile-actions">
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn mobile-theme-toggle"
              aria-label="Toggle theme"
              title="Toggle light/dark mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12t-1.463 3.538T12 17m-7-4H1v-2h4zm18 0h-4v-2h4zM11 5V1h2v4zm0 18v-4h2v4zM6.4 7.75L3.875 5.325L5.3 3.85l2.4 2.5zm12.3 12.4l-2.425-2.525L17.6 16.25l2.525 2.425zM16.25 6.4l2.425-2.525L20.15 5.3l-2.5 2.4zM3.85 18.7l2.525-2.425L7.75 17.6l-2.425 2.525z"/>
              </svg>
            </button>
            <button
              onClick={toggleMobileMenu}
              id="navToggle"
              aria-label="Toggle Menu"
              aria-expanded={mobileMenuOpen}
              className={`navigation-mobile-toggle mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
          <div className={`navigation-mobile-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul className="navigation-mobile-links nav-links">
              <li className="navigation-item-mobile">
                <a href="/" onClick={closeMobileMenu}>
                  <div className="navigation-link">
                    <span>Home</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item-mobile">
                <a href="/modules" onClick={closeMobileMenu}>
                  <div className="navigation-link">
                    <span>Modules</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item-mobile">
                <a href="/tailored-pilots" onClick={closeMobileMenu}>
                  <div className="navigation-link">
                    <span>Pilot Programs</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item-mobile">
                <a href="/expert-consultation" onClick={closeMobileMenu}>
                  <div className="navigation-link">
                    <span>Consultation</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item-mobile">
                <a href="/blog" onClick={closeMobileMenu}>
                  <div className="navigation-link">
                    <span>Blog</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item-mobile">
                <a href="/request-demo" onClick={closeMobileMenu}>
                  <div className="btn btn-primary" style={{width: '100%', textAlign: 'center'}}>
                    <span>Request Demo</span>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div id="mobileOverlay" className="navigation-mobile-overlay">
        <div className="navigation-overlay-header">
          <a href="/">
            <div className="navigation-brand">
              <div className="navigation-logo-icon">
                <img src="/logo.svg" alt="FinACEverse Logo" style={{width: '100%', height: '100%'}} />
              </div>
              <span className="navigation-brand-text section-title">
                FinACEverse
              </span>
            </div>
          </a>
          <button
            id="navClose"
            aria-label="Close Menu"
            className="navigation-mobile-close"
          >
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
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M3 9h18M9 16l3-3l3 3"></path>
              </g>
            </svg>
          </button>
        </div>
        <div className="navigation-overlay-content">
          <ul className="navigation-mobile-links">
            <li className="navigation-mobile-item">
              <a href="/">
                <div className="navigation-mobile-link">
                  <span>Home</span>
                </div>
              </a>
            </li>
            <li className="navigation-mobile-item">
              <a href="/modules">
                <div className="navigation-mobile-link">
                  <span>Modules</span>
                </div>
              </a>
            </li>
            <li className="navigation-mobile-item">
              <a href="/tailored-pilots">
                <div className="navigation-mobile-link">
                  <span>Pilot Programs</span>
                </div>
              </a>
            </li>
            <li className="navigation-mobile-item">
              <a href="/expert-consultation">
                <div className="navigation-mobile-link">
                  <span>Consultation</span>
                </div>
              </a>
            </li>
          </ul>
          <div className="navigation-mobile-actions">
            <a href="mailto:vithal@finacegroup.com?subject=Demo Request">
              <div className="btn btn-primary btn-lg">
                <span>Request Demo</span>
              </div>
            </a>
          </div>
          <div className="navigation-overlay-footer">
            <p className="section-content">
              Redefining the financial truth through verifiable intelligence.
            </p>
          </div>
        </div>
      </div>
      <div className="navigation-container2">
        <div className="navigation-container3">
          <Script
            html={`<style>
@media (prefers-reduced-motion: reduce) {
.navigation-mobile-overlay {
  transition: none;
}
.navigation-wrapper {
  transition: none;
}
}
</style>`}
          ></Script>
        </div>
      </div>
      <div className="navigation-container4">
        <div className="navigation-container5">
          <Script
            html={`<script defer data-name="navigation-logic">
(function(){
  const navToggle = document.getElementById("navToggle")
  const navClose = document.getElementById("navClose")
  const mobileOverlay = document.getElementById("mobileOverlay")
  const body = document.body

  const openMenu = () => {
    mobileOverlay.classList.add("is-active")
    navToggle.setAttribute("aria-expanded", "true")
    body.style.overflow = "hidden"
  }

  const closeMenu = () => {
    mobileOverlay.classList.remove("is-active")
    navToggle.setAttribute("aria-expanded", "false")
    body.style.overflow = ""
  }

  navToggle.addEventListener("click", openMenu)
  navClose.addEventListener("click", closeMenu)

  // Close menu when a link is clicked
  const mobileLinks = document.querySelectorAll(".navigation-mobile-link")
  mobileLinks.forEach((link) => {
    link.addEventListener("click", closeMenu)
  })

  // Handle escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileOverlay.classList.contains("is-active")) {
      closeMenu()
    }
  })

  // Simple scroll effect for header transparency/elevation
  window.addEventListener("scroll", () => {
    const wrapper = document.querySelector(".navigation-wrapper")
    if (window.scrollY > 50) {
      wrapper.style.boxShadow = "0 10px 30px -10px rgba(0,0,0,0.3)"
      wrapper.style.padding = "var(--spacing-xs) 0"
    } else {
      wrapper.style.boxShadow = "none"
      wrapper.style.padding = "0"
    }
  })
})()
</script>`}
          ></Script>
        </div>
      </div>
    </div>
  )
}

export default Navigation
