/**
 * SECURE REQUEST UTILITIES
 * ========================
 * Client-side request security features
 * 
 * Features:
 * 1. Request signature generation (HMAC)
 * 2. Automatic timestamp injection
 * 3. Fingerprint header injection
 * 4. Secure fetch wrapper
 * 
 * @module secureRequest
 * @version 1.0.0
 */

import { getBrowserFingerprint, getSecureTokenSync } from './secureStorage';

// ============================================================================
// REQUEST SIGNING
// ============================================================================

/**
 * Generate HMAC signature for request
 * Server validates this to ensure request wasn't tampered in transit
 */
const generateRequestSignature = async (method, path, body, timestamp) => {
  const payload = `${method}:${path}:${timestamp}:${JSON.stringify(body || {})}`;
  
  // Use Web Crypto API for HMAC
  const encoder = new TextEncoder();
  
  // Use a client-side secret derived from fingerprint
  const fingerprint = await getBrowserFingerprint();
  const keyData = encoder.encode(fingerprint || 'finaceverse-client');
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// ============================================================================
// SECURE FETCH WRAPPER
// ============================================================================

/**
 * Secure fetch with automatic security headers
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const secureFetch = async (url, options = {}) => {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  const timestamp = Date.now().toString();
  const path = new URL(url, window.location.origin).pathname;
  
  // Generate request signature
  const signature = await generateRequestSignature(method, path, body, timestamp);
  
  // Get fingerprint
  const fingerprint = await getBrowserFingerprint();
  
  // Get token for Authorization header
  const tokenKey = url.includes('/superadmin') || url.includes('/admin') 
    ? 'superadmin_token' 
    : 'analytics_token';
  const token = getSecureTokenSync(tokenKey);
  
  // Merge headers
  const secureHeaders = {
    ...options.headers,
    'X-Request-Timestamp': timestamp,
    'X-Request-Signature': signature,
    'X-Client-Fingerprint': fingerprint || '',
  };
  
  // Add Authorization if token exists and not already provided
  if (token && !secureHeaders.Authorization && !secureHeaders.authorization) {
    secureHeaders.Authorization = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers: secureHeaders,
  });
};

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Secure GET request
 */
export const secureGet = async (url, headers = {}) => {
  return secureFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

/**
 * Secure POST request
 */
export const securePost = async (url, data, headers = {}) => {
  return secureFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });
};

/**
 * Secure PUT request
 */
export const securePut = async (url, data, headers = {}) => {
  return secureFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });
};

/**
 * Secure DELETE request
 */
export const secureDelete = async (url, headers = {}) => {
  return secureFetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

export default {
  fetch: secureFetch,
  get: secureGet,
  post: securePost,
  put: securePut,
  delete: secureDelete,
};
