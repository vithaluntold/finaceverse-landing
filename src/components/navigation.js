import React from 'react'

import Script from 'dangerous-html/react'

import './navigation.css'

const Navigation = (props) => {
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
                <a href="#cognitive-os">
                  <div className="navigation-link">
                    <span>Cognitive OS</span>
                  </div>
                </a>
              </li>
              <li className="navigation-item">
                <a href="#compliance">
                  <div className="navigation-link">
                    <span>Compliance</span>
                  </div>
                </a>
              </li>
            </ul>
            <div className="navigation-actions">
              <a href="#portal">
                <div className="btn btn-outline btn-sm">
                  <span>Client Portal</span>
                </div>
              </a>
              <a href="#demo">
                <div className="btn btn-sm btn-primary">
                  <span>Request Demo</span>
                </div>
              </a>
            </div>
          </div>
          <button
            id="navToggle"
            aria-label="Toggle Menu"
            aria-expanded="false"
            className="navigation-mobile-toggle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="icon-menu"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 5h16M4 12h16M4 19h16"
              ></path>
            </svg>
          </button>
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
              <a href="#cognitive-os">
                <div className="navigation-mobile-link">
                  <span>Cognitive OS</span>
                </div>
              </a>
            </li>
            <li className="navigation-mobile-item">
              <a href="#compliance">
                <div className="navigation-mobile-link">
                  <span>Compliance</span>
                </div>
              </a>
            </li>
            <li className="navigation-mobile-item">
              <a href="#about">
                <div className="navigation-mobile-link">
                  <span>Our Paradigm</span>
                </div>
              </a>
            </li>
          </ul>
          <div className="navigation-mobile-actions">
            <a href="#portal">
              <div className="btn btn-outline btn-lg">
                <span>Client Portal</span>
              </div>
            </a>
            <a href="#demo">
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
