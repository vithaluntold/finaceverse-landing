// AI-powered route prefetching
const API_ENDPOINT = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Route component mapping
const routeComponents = {
  '/modules': () => import('../views/modules'),
  '/request-demo': () => import('../views/request-demo'),
  '/tailored-pilots': () => import('../views/tailored-pilots'),
  '/expert-consultation': () => import('../views/expert-consultation'),
  '/blog': () => import('../views/blog'),
  '/compliance-privacy': () => import('../views/compliance-privacy'),
};

// Track navigation history
let navigationHistory = [];
const MAX_HISTORY = 5;

// Track user's navigation pattern
export const trackNavigation = (path) => {
  navigationHistory.push(path);
  if (navigationHistory.length > MAX_HISTORY) {
    navigationHistory.shift();
  }
};

// Predict and prefetch next likely routes
export const prefetchLikelyRoutes = async (currentPath) => {
  try {
    const response = await fetch(`${API_ENDPOINT}/predict-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPath,
        history: navigationHistory,
      }),
    });
    
    if (!response.ok) {
      console.warn('Route prediction failed');
      return;
    }
    
    const { predictions } = await response.json();
    
    // Prefetch routes with confidence > 0.6
    predictions.forEach(({ route, confidence }) => {
      if (confidence > 0.6 && routeComponents[route]) {
        console.log(`🔮 Prefetching ${route} (confidence: ${confidence})`);
        
        // Prefetch component in background
        setTimeout(() => {
          routeComponents[route]().catch(err => 
            console.warn(`Prefetch failed for ${route}:`, err.message)
          );
        }, 1000); // Small delay to not interfere with current page
      }
    });
  } catch (err) {
    console.error('Prefetch error:', err);
  }
};

// Smart image lazy loading with intersection observer
export const initSmartImageLoading = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px', // Load images 50px before they enter viewport
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};

// Predict scroll direction and preload images
let lastScrollY = 0;
let scrollDirection = 'down';

export const initScrollPrediction = () => {
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
    lastScrollY = currentScrollY;
    
    // If scrolling down fast, aggressively preload images below
    if (scrollDirection === 'down' && Math.abs(currentScrollY - lastScrollY) > 100) {
      preloadNearbyImages();
    }
  }, { passive: true });
};

const preloadNearbyImages = () => {
  const viewportHeight = window.innerHeight;
  const scrollTop = window.scrollY;
  const preloadRange = viewportHeight * 2; // Preload 2 viewports ahead
  
  document.querySelectorAll('img[data-src]').forEach(img => {
    const imgTop = img.getBoundingClientRect().top + scrollTop;
    
    if (imgTop < scrollTop + preloadRange) {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
    }
  });
};

// Monitor connection quality and adjust prefetching
export const adaptToConnection = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    // Disable prefetching on slow connections or data saver mode
    if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      console.log('📶 Slow connection detected, disabling prefetch');
      return false;
    }
  }
  
  return true;
};

// Memory-based adaptive loading
export const shouldPrefetch = () => {
  // Check device memory (if available)
  if ('deviceMemory' in navigator) {
    // Don't prefetch on low-memory devices (<4GB)
    if (navigator.deviceMemory < 4) {
      console.log('🧠 Low memory detected, limiting prefetch');
      return false;
    }
  }
  
  // Check connection
  if (!adaptToConnection()) {
    return false;
  }
  
  return true;
};
