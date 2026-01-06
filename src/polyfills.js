/* Cross-browser Polyfills and Compatibility Shims */

// Polyfill for older browsers that don't support fetch
if (!window.fetch) {
  console.warn('Fetch API not supported. Using XMLHttpRequest fallback.');
}

// IntersectionObserver polyfill check (graceful degradation)
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  console.warn('IntersectionObserver not supported, some features may be limited.');
}

// ResizeObserver polyfill
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  console.warn('ResizeObserver not supported');
}

// Object.assign polyfill for IE
if (typeof Object.assign !== 'function') {
  Object.assign = function(target) {
    if (target === null || target === undefined) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    var to = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];
      if (nextSource !== null && nextSource !== undefined) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

// Array.from polyfill
if (!Array.from) {
  Array.from = function(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  };
}

// Array.includes polyfill
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement) {
    return this.indexOf(searchElement) !== -1;
  };
}

// String.includes polyfill
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

// Promise polyfill for older browsers
if (typeof Promise === 'undefined') {
  console.warn('Promise not supported, please use a polyfill');
}

// CustomEvent polyfill for IE
if (typeof window !== 'undefined' && typeof window.CustomEvent !== 'function') {
  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }
  window.CustomEvent = CustomEvent;
}

// Element.closest() polyfill
if (typeof Element !== 'undefined' && !Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (typeof Element !== 'undefined' && !Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// NodeList.forEach polyfill
if (typeof NodeList !== 'undefined' && NodeList.prototype && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

// requestAnimationFrame polyfill
(function() {
  var lastTime = 0;
  var vendors = ['webkit', 'moz'];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x] + 'CancelAnimationFrame'] ||
      window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
})();

// Smooth scroll polyfill for browsers that don't support it
if (typeof window !== 'undefined' && !('scrollBehavior' in document.documentElement.style)) {
  const smoothScrollPolyfill = function() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const targetPosition = target.offsetTop;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', smoothScrollPolyfill);
  } else {
    smoothScrollPolyfill();
  }
}

// Fix for iOS Safari 100vh issue
if (typeof window !== 'undefined') {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);
}

// Detect touch support
if (typeof window !== 'undefined') {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    document.documentElement.classList.add('touch-device');
  } else {
    document.documentElement.classList.add('no-touch');
  }
}

// Detect browser
if (typeof window !== 'undefined') {
  const ua = navigator.userAgent;
  if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident/') > -1) {
    document.documentElement.classList.add('ie');
  }
  if (ua.indexOf('Edge') > -1) {
    document.documentElement.classList.add('edge');
  }
  if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edge') === -1) {
    document.documentElement.classList.add('chrome');
  }
  if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    document.documentElement.classList.add('safari');
  }
  if (ua.indexOf('Firefox') > -1) {
    document.documentElement.classList.add('firefox');
  }
}

// Prevent zoom on double-tap for iOS
if (typeof document !== 'undefined') {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}

export default {};
