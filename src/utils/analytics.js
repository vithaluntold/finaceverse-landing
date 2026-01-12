import ReactGA from 'react-ga4';

// Initialize GA4
export const initGA = () => {
  const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-BNY3XNL6KD';
  
  ReactGA.initialize(measurementId, {
    gaOptions: {
      anonymizeIp: true, // GDPR compliance
    },
    gtagOptions: {
      send_page_view: false, // Manual page view tracking
    },
  });
};

// Track page views
export const trackPageView = (path) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// Track custom events
export const trackEvent = (category, action, label = '', value = 0) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

// Track specific events
export const trackRequestDemo = () => {
  trackEvent('Conversion', 'request_demo_click', 'Request Demo Button');
};

export const trackModuleView = (moduleName) => {
  trackEvent('Engagement', 'module_card_view', moduleName);
};

export const trackNewsletterSignup = (email) => {
  trackEvent('Conversion', 'newsletter_signup', 'Newsletter Form');
};

export const trackScrollDepth = (depth) => {
  trackEvent('Engagement', 'scroll_depth', `${depth}%`, depth);
};

export const trackExpertConsultation = () => {
  trackEvent('Conversion', 'expert_consultation_click', 'Book Consultation');
};

export const trackSocialClick = (platform) => {
  trackEvent('Social', 'social_icon_click', platform);
};

export const trackOutboundLink = (url) => {
  trackEvent('Outbound', 'external_link_click', url);
};
