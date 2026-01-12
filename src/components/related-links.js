import React from 'react';
import { Link } from 'react-router-dom';
import './related-links.css';

/**
 * Related Links component for internal linking SEO
 * Displays contextual links to related content on the site
 */

const LINK_CATEGORIES = {
  demo: [
    { path: '/modules', title: 'Explore Our Modules', description: 'Discover Accute, Luca, EPI-Q, and the full Cognitive OS stack' },
    { path: '/tailored-pilots', title: 'Tailored Pilot Programs', description: 'Customized implementation for your specific needs' },
    { path: '/expert-consultation', title: 'Expert Consultation', description: 'Speak with a Cognitive OS architect' },
    { path: '/blog', title: 'Read Our Insights', description: 'Latest articles on AI accounting and cognitive finance' },
  ],
  modules: [
    { path: '/request-demo', title: 'Request a Demo', description: 'See FinACEverse in action with a personalized demonstration' },
    { path: '/tailored-pilots', title: 'Start a Pilot Program', description: 'Test our modules with your real-world workflows' },
    { path: '/compliance-privacy', title: 'Security & Compliance', description: 'Enterprise-grade security for your financial data' },
    { path: '/blog', title: 'Technical Deep Dives', description: 'In-depth articles on our technology stack' },
  ],
  blog: [
    { path: '/modules', title: 'Explore the Platform', description: 'See how our modules work together' },
    { path: '/request-demo', title: 'Schedule a Demo', description: 'Experience the Cognitive OS firsthand' },
    { path: '/expert-consultation', title: 'Talk to an Expert', description: 'Get personalized guidance for your firm' },
  ],
  pilots: [
    { path: '/modules', title: 'View All Modules', description: 'Explore the full range of FinACEverse capabilities' },
    { path: '/request-demo', title: 'Request Demo First', description: 'See a demonstration before committing to a pilot' },
    { path: '/compliance-privacy', title: 'Data Security', description: 'Understand our security and compliance measures' },
    { path: '/expert-consultation', title: 'Consult Our Team', description: 'Discuss pilot scope with our architects' },
  ],
  consultation: [
    { path: '/modules', title: 'Learn About Our Modules', description: 'Understand the Cognitive OS architecture' },
    { path: '/tailored-pilots', title: 'Explore Pilot Programs', description: 'See pilot implementation options' },
    { path: '/request-demo', title: 'Watch a Demo', description: 'See FinACEverse in action first' },
    { path: '/blog', title: 'Read Case Studies', description: 'Learn from real implementation stories' },
  ],
  compliance: [
    { path: '/modules', title: 'Platform Capabilities', description: 'Explore the full Cognitive OS suite' },
    { path: '/request-demo', title: 'See Security in Action', description: 'Demo our compliance features' },
    { path: '/expert-consultation', title: 'Security Consultation', description: 'Discuss compliance requirements' },
  ],
};

const RelatedLinks = ({ category = 'demo', title = 'Explore More' }) => {
  const links = LINK_CATEGORIES[category] || LINK_CATEGORIES.demo;

  return (
    <section className="related-links-section">
      <div className="container-wrapper">
        <h2 className="section-title related-links-title">{title}</h2>
        <nav className="related-links-grid" aria-label="Related content navigation">
          {links.map((link, index) => (
            <Link key={index} to={link.path} className="related-link-card">
              <h3 className="related-link-title">{link.title}</h3>
              <p className="related-link-description">{link.description}</p>
              <span className="related-link-arrow" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14m-7-7l7 7-7 7"/>
                </svg>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
};

export default RelatedLinks;
