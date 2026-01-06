import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

const API_ENDPOINT = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Track Core Web Vitals
export const initPerformanceTracking = () => {
  const sendToAnalytics = ({ name, delta, value, id }) => {
    const metrics = {
      name,
      delta,
      value,
      id,
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: getConnectionInfo(),
    };

    // Send to backend
    fetch(`${API_ENDPOINT}/track-performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    }).catch(err => console.error('Performance tracking failed:', err));
  };

  // Track Web Vitals (v5 API - INP replaced FID)
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics); // Interaction to Next Paint (replaced FID)
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);

  // Track custom metrics
  if (window.performance && window.performance.timing) {
    trackNavigationTiming();
  }

  // Track scroll depth
  trackScrollDepth();
  
  // Track JS errors
  trackErrors();
};

// Get connection information
const getConnectionInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  return null;
};

// Track Navigation Timing
const trackNavigationTiming = () => {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (navigation) {
        const metrics = {
          type: 'navigation',
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        };

        fetch(`${API_ENDPOINT}/track-performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metrics),
        }).catch(err => console.error('Navigation timing failed:', err));
      }
    }, 0);
  });
};

// Track scroll depth
const trackScrollDepth = () => {
  const depths = [25, 50, 75, 100];
  const tracked = new Set();

  const checkScrollDepth = () => {
    const scrolled = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;
    
    depths.forEach(depth => {
      if (scrolled >= depth && !tracked.has(depth)) {
        tracked.add(depth);
        
        fetch(`${API_ENDPOINT}/track-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'scroll_depth',
            depth,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
          }),
        }).catch(err => console.error('Scroll tracking failed:', err));
      }
    });
  };

  window.addEventListener('scroll', checkScrollDepth, { passive: true });
};

// Track JavaScript errors
const trackErrors = () => {
  window.addEventListener('error', (event) => {
    fetch(`${API_ENDPOINT}/track-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(err => console.error('Error tracking failed:', err));
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    fetch(`${API_ENDPOINT}/track-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        type: 'promise_rejection',
      }),
    }).catch(err => console.error('Promise rejection tracking failed:', err));
  });
};

// Track geographic info (called once per session)
export const trackVisit = async () => {
  try {
    const response = await fetch(`${API_ENDPOINT}/track-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: window.location.pathname,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      console.error('Visit tracking failed');
    }
  } catch (err) {
    console.error('Visit tracking error:', err);
  }
};
