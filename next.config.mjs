/** @type {import('next').NextConfig} */

// ============ SECURITY HEADERS ============
// Import the security headers configuration from our centralized security module.
// These headers protect against XSS, clickjacking, MIME sniffing, and more.
// See lib/security/headers.js for detailed documentation on each header.
import { securityHeaders } from './lib/security/headers.js';

const nextConfig = {
  reactStrictMode: true,
  // Pin turbopack root to this project dir — prevents parent directory
  // resolution issues when running via `npm run dev --prefix`
  turbopack: {
    root: '.',
  },

  // ============ RESPONSE HEADERS ============
  // Apply security headers to ALL routes. The '/:path*' pattern matches every
  // page and API route in the app, ensuring consistent security posture.
  async headers() {
    return [
      {
        // Match all routes — pages, API routes, static assets, everything
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
