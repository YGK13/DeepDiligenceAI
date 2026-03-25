// ============================================================================
// lib/security/headers.js — Security Headers Configuration for next.config.mjs
// ============================================================================
// WHY: Security headers are the FIRST LINE OF DEFENSE against common web attacks.
// They tell browsers to enforce security policies that prevent XSS, clickjacking,
// MIME sniffing, and other attack vectors. Without these, the app is vulnerable
// to attacks that modern browsers can trivially block with the right headers.
//
// These headers are added to EVERY response from the Next.js server via the
// `headers()` function in next.config.mjs. They cost nothing in performance
// and dramatically improve the security posture.
//
// USAGE in next.config.mjs:
//   import { securityHeaders } from './lib/security/headers.js';
//   const nextConfig = {
//     async headers() {
//       return [{ source: '/(.*)', headers: securityHeaders }];
//     },
//   };
// ============================================================================

// ============ CONTENT SECURITY POLICY (CSP) ============
// The most powerful security header. It controls which resources the browser
// is allowed to load, execute, and connect to. A well-configured CSP prevents
// most XSS attacks by blocking inline scripts and unauthorized resource loading.
//
// We build it as an array of directives for readability, then join with '; '.
const cspDirectives = [
  // default-src: Fallback for any directive not explicitly set.
  // 'self' = only allow resources from our own origin.
  "default-src 'self'",

  // script-src: Where JavaScript can be loaded from.
  // 'self' — our own bundled scripts
  // 'unsafe-inline' — needed for Next.js inline scripts (hydration, etc.)
  // 'unsafe-eval' — needed for Next.js dev mode (hot reload); consider removing in production
  // Stripe.js — loaded from js.stripe.com for payment processing
  // Vercel Analytics — loaded from vercel's CDN for usage tracking
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",

  // style-src: Where CSS can be loaded from.
  // 'unsafe-inline' is REQUIRED for Tailwind CSS — it injects styles via <style> tags
  // and uses inline style attributes extensively. Without this, Tailwind breaks completely.
  "style-src 'self' 'unsafe-inline'",

  // img-src: Where images can be loaded from.
  // 'self' — local images
  // data: — base64-encoded images (common in React apps, avatars, etc.)
  // blob: — dynamically created image URLs (canvas exports, file previews)
  // https: — allow images from any HTTPS source (company logos from external sites)
  "img-src 'self' data: blob: https:",

  // font-src: Where fonts can be loaded from.
  // 'self' — local fonts bundled with the app
  // data: — base64-encoded fonts (some icon libraries use this)
  "font-src 'self' data:",

  // connect-src: Where fetch/XHR/WebSocket can connect to.
  // This is CRITICAL for our AI proxy routes and Supabase integration.
  // 'self' — our own API routes (/api/ai/research, /api/ai/autofill, etc.)
  // Supabase — for auth and database operations (*.supabase.co covers all projects)
  // Vercel Analytics — for sending analytics data
  // AI providers are NOT listed here because all AI calls go through our server-side
  // API routes — the browser never directly contacts Perplexity/Anthropic/OpenAI/Groq.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",

  // frame-src: What can be loaded in <iframe> elements.
  // Stripe uses iframes for its payment form (PCI compliance requirement).
  "frame-src 'self' https://js.stripe.com",

  // object-src: Blocks <object>, <embed>, <applet> — legacy plugin vectors for attacks.
  // 'none' = completely blocked. No modern app needs these.
  "object-src 'none'",

  // base-uri: Restricts what <base href="..."> can be set to.
  // 'self' prevents attackers from injecting a <base> tag that redirects all
  // relative URLs to a malicious domain.
  "base-uri 'self'",

  // form-action: Where forms can submit data to.
  // 'self' prevents form hijacking — an attacker can't inject a form that
  // submits data to their server.
  "form-action 'self'",

  // frame-ancestors: Who can embed our site in an iframe.
  // 'none' = nobody can iframe us. This prevents clickjacking attacks where
  // an attacker overlays our UI with transparent iframes to steal clicks.
  // Note: This is the modern replacement for X-Frame-Options.
  "frame-ancestors 'none'",

  // upgrade-insecure-requests: Automatically upgrades HTTP requests to HTTPS.
  // Prevents mixed-content issues when the page is served over HTTPS but
  // some resources accidentally use http:// URLs.
  'upgrade-insecure-requests',
];

const contentSecurityPolicy = cspDirectives.join('; ');

// ============ SECURITY HEADERS ARRAY ============
// Exported as an array of { key, value } objects — the format Next.js expects
// in the headers() config function.
const securityHeaders = [
  // ---- Content-Security-Policy ----
  // The comprehensive policy defined above. This is the MOST IMPORTANT header.
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },

  // ---- X-Frame-Options ----
  // LEGACY clickjacking protection. Modern browsers use frame-ancestors from CSP,
  // but we include this for older browsers (IE11, older Edge) that don't support CSP.
  // DENY = no one can embed this page in an iframe, period.
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },

  // ---- X-Content-Type-Options ----
  // Prevents MIME type sniffing. Without this, browsers might execute a file
  // as JavaScript even if the server says it's text/plain, enabling XSS attacks
  // via uploaded files or misconfigured content types.
  // nosniff = trust the Content-Type header, don't guess.
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },

  // ---- Referrer-Policy ----
  // Controls how much URL information is sent in the Referer header when
  // navigating away from our site. This prevents leaking sensitive URL paths
  // (e.g., /company/stripe/research) to third-party sites.
  // strict-origin-when-cross-origin:
  //   - Same origin: sends full URL (useful for our own analytics)
  //   - Cross origin: sends only the origin (https://duedrill.com, no path)
  //   - Downgrade (HTTPS→HTTP): sends nothing
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },

  // ---- Permissions-Policy ----
  // Restricts which browser features our site can use. We don't need camera,
  // microphone, or geolocation — disabling them prevents malicious scripts
  // from silently accessing these sensitive APIs.
  // () = disabled for all origins, including our own.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },

  // ---- Strict-Transport-Security (HSTS) ----
  // Tells browsers to ONLY connect to our site over HTTPS for the next 2 years.
  // After a user visits once over HTTPS, the browser will refuse HTTP connections
  // entirely, preventing SSL stripping attacks.
  // max-age=63072000 = 2 years (standard recommendation)
  // includeSubDomains = applies to all subdomains too
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },

  // ---- X-XSS-Protection ----
  // LEGACY XSS protection for older browsers (IE, older Chrome/Safari).
  // Modern browsers have deprecated this in favor of CSP, but it doesn't hurt
  // to include it for defense-in-depth.
  // 1; mode=block = enable the XSS filter and BLOCK the page (don't try to sanitize)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

// ============ EXPORTS ============
export { securityHeaders, contentSecurityPolicy };
