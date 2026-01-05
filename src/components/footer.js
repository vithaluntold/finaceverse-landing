import React from 'react'

import Script from 'dangerous-html/react'

import './footer.css'

const Footer = (props) => {
  return (
    <div className="footer-container1">
      <footer className="footer-root">
        <div className="footer-container">
          <div className="footer-bento-grid">
            <div className="footer-bento-cell footer-brand-cell">
              <div className="footer-logo-wrapper">
                <span className="footer-logo-text">FinACEverse</span>
                <div className="footer-brand-tagline">
                  <span>Cognitive Operating System for Finance</span>
                </div>
              </div>
              <p className="footer-brand-description section-content">
                Revolutionizing the finance, accounting, and taxation landscape
                through our unique Verifiable Arithmetic Multi-Stream Network
                (VAMN). We unify the past, present, and future of financial
                operations into a single, cohesive intelligence ecosystem.
              </p>
              <div className="footer-social-links">
                <a href="#">
                  <div aria-label="LinkedIn" className="footer-social-icon">
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
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2a2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6M2 9h4v12H2z"></path>
                        <circle cx="4" cy="4" r="2"></circle>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="Twitter" className="footer-social-icon">
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
                        d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6c2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4c-.9-4.2 4-6.6 7-3.8c1.1 0 3-1.2 3-1.2"
                      ></path>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="Facebook" className="footer-social-icon">
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
                        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
                      ></path>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
            <div className="footer-bento-cell footer-nav-cell">
              <h2 className="footer-column-title section-subtitle">
                Ecosystem
              </h2>
              <nav className="footer-nav-list">
                <a href="/">
                  <div className="footer-nav-link">
                    <span>Home</span>
                  </div>
                </a>
                <a href="/modules">
                  <div className="footer-nav-link">
                    <span>Modules</span>
                  </div>
                </a>
                <a href="/tailored-pilots">
                  <div className="footer-nav-link">
                    <span>Pilot Programs</span>
                  </div>
                </a>
                <a href="/expert-consultation">
                  <div className="footer-nav-link">
                    <span>Expert Consultation</span>
                  </div>
                </a>
              </nav>
            </div>
            <div className="footer-bento-cell footer-action-cell">
              <h2 className="footer-column-title section-subtitle">
                Stay Intelligent
              </h2>
              <p className="footer-newsletter-text section-content">
                Subscribe to our Cognitive Insights newsletter.
              </p>
              <form
                action="/subscribe"
                method="POST"
                data-form-id="9a6831b2-b560-4e7b-b51e-be491c8b0777"
                className="footer-newsletter-form"
              >
                <div className="footer-input-group">
                  <input
                    type="email"
                    placeholder="Professional Email"
                    required="true"
                    id="thq_textinput_Qrui"
                    name="textinput"
                    data-form-field-id="thq_textinput_Qrui"
                    className="footer-email-input"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    id="thq_button_ncH0"
                    name="button"
                    data-form-field-id="thq_button_ncH0"
                    className="footer-submit-btn"
                  >
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
                        d="M5 12h14m-7-7l7 7l-7 7"
                      ></path>
                    </svg>
                  </button>
                </div>
              </form>
              <div className="footer-contact-info">
                <div className="footer-contact-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <path d="m22 7l-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    </g>
                  </svg>
                  <span className="section-content">
                    vithal@finacegroup.com
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-bottom-bar">
            <div className="footer-legal-links">
              <a href="#">
                <div className="footer-legal-link">
                  <span>Privacy Protocol</span>
                </div>
              </a>
              <a href="#">
                <div className="footer-legal-link">
                  <span>Terms of Operation</span>
                </div>
              </a>
              <a href="#">
                <div className="footer-legal-link">
                  <span>Security Standards</span>
                </div>
              </a>
            </div>
            <div className="footer-copyright">
              <span>
                &amp;copy; 2026 FinACEverse. Shaping the future of financial
                coherence.
              </span>
            </div>
          </div>
        </div>
      </footer>
      <div className="footer-container2">
        <div className="footer-container3">
          <Script
            html={`<style>
@media (prefers-reduced-motion: reduce) {
.footer-social-icon, .footer-nav-link, .footer-submit-btn {
  transition: none !important;
  transform: none !important;
}
}
</style>`}
          ></Script>
        </div>
      </div>
      <div className="footer-container4">
        <div className="footer-container5">
          <Script
            html={`<script defer data-name="footer-interactions">
(function(){
  // Real-time validation visual feedback
  const footerEmailInput = document.querySelector(".footer-email-input")
  const footerInputGroup = document.querySelector(".footer-input-group")

  if (footerEmailInput) {
    footerEmailInput.addEventListener("blur", () => {
      if (footerEmailInput.value !== "" && !footerEmailInput.checkValidity()) {
        footerInputGroup.style.borderColor = "#e74c3c"
      } else if (footerEmailInput.checkValidity() && footerEmailInput.value !== "") {
        footerInputGroup.style.borderColor = "#2ecc71"
      } else {
        footerInputGroup.style.borderColor = "var(--color-border)"
      }
    })

    footerEmailInput.addEventListener("input", () => {
      footerInputGroup.style.borderColor = "var(--color-secondary)"
    })
  }

  // Handle form submission feedback (UX only)
  const footerForm = document.querySelector(".footer-newsletter-form")
  if (footerForm) {
    footerForm.addEventListener("submit", (e) => {
      // In a real scenario, the form would submit normally to the action URL
      // This is just to show we can intercept for immediate visual feedback
      const btn = footerForm.querySelector(".footer-submit-btn")
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      btn.style.background = "#2ecc71"
    })
  }
})()
</script>`}
          ></Script>
        </div>
      </div>
    </div>
  )
}

export default Footer
