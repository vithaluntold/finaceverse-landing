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
                <a href="#" aria-label="LinkedIn">
                  <div className="footer-social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2a2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6M2 9h4v12H2z"></path>
                        <circle cx="4" cy="4" r="2"></circle>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#" aria-label="X (Twitter)">
                  <div className="footer-social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                </a>
                <a href="#" aria-label="Facebook">
                  <div className="footer-social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </div>
                </a>
                <a href="#" aria-label="Instagram">
                  <div className="footer-social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8A4 4 0 0 1 16 11.37m1.5-4.87h.01"></path>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#" aria-label="YouTube">
                  <div className="footer-social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                        <path d="M2.5 17a24.12 24.12 0 0 1 0-10a2 2 0 0 1 1.4-1.4a49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10a2 2 0 0 1-1.4 1.4a49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
                        <path d="m10 15l5-3l-5-3z"></path>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#" aria-label="WhatsApp">
                  <div className="footer-social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01m-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18l-3.12.82l.83-3.04l-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24c2.2 0 4.27.86 5.82 2.42a8.183 8.183 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23m4.52-6.16c-.25-.12-1.47-.72-1.69-.81c-.23-.08-.39-.12-.56.12c-.17.25-.64.81-.78.97c-.14.17-.29.19-.54.06c-.25-.12-1.05-.39-1.99-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.14-.25-.02-.38.11-.51c.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31c-.22.25-.86.85-.86 2.07c0 1.22.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74c.59.26 1.05.41 1.41.52c.59.19 1.13.16 1.56.1c.48-.07 1.47-.6 1.67-1.18c.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28"/>
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
            </div>
          </div>
          <div className="footer-bottom-bar">
            <div className="footer-legal-links">
              <a href="/compliance-privacy">
                <div className="footer-legal-link">
                  <span>Privacy Protocol</span>
                </div>
              </a>
              <a href="/compliance-privacy">
                <div className="footer-legal-link">
                  <span>Terms of Operation</span>
                </div>
              </a>
              <a href="/compliance-privacy">
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
