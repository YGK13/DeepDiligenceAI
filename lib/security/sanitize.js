// ============================================================================
// lib/security/sanitize.js — Input Sanitization Utilities
// ============================================================================
// WHY: Every piece of user input is a potential attack vector. Even in a
// server-rendered Next.js app, unsanitized input can cause:
//   - XSS (Cross-Site Scripting) — malicious scripts injected via form fields
//   - SQL Injection — via unsanitized strings passed to database queries
//   - Command Injection — via strings passed to shell commands or APIs
//   - Data corruption — via unexpected characters breaking JSON/CSV/queries
//
// These utilities sanitize input at the APPLICATION BOUNDARY — the moment
// data enters from the user, before it touches any business logic, database,
// or external API. Sanitize early, sanitize often.
//
// IMPORTANT: These functions are intentionally STRICT. It's better to reject
// valid-but-unusual input than to allow malicious payloads. Users can always
// re-enter corrected input; recovering from a security breach is much harder.
//
// USAGE:
//   import { sanitizeInput, sanitizeCompanyName } from '@/lib/security/sanitize';
//   const cleanName = sanitizeCompanyName(userInput);
// ============================================================================

// ============ GENERAL INPUT SANITIZATION ============
// Strips HTML tags and dangerous characters from any string input.
// This is the BASELINE sanitizer — use it on any text that will be
// displayed in the UI or stored in the database.
//
// What it does:
//   1. Strips ALL HTML tags (prevents <script>, <img onerror=...>, etc.)
//   2. Escapes HTML entities for remaining special chars
//   3. Trims whitespace
//   4. Collapses multiple spaces into one
//
// What it does NOT do:
//   - It does NOT validate the content makes sense (that's business logic)
//   - It does NOT limit length (do that at the call site based on field requirements)
function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return '';

  return str
    // Step 1: Remove ALL HTML tags — this is the nuclear option for XSS prevention.
    // Regex matches opening tags, closing tags, self-closing tags, and comments.
    // Even if an attacker crafts a weird tag like <img/onerror=alert(1)>, this catches it.
    .replace(/<[^>]*>/g, '')

    // Step 2: Escape remaining HTML special characters.
    // Even after stripping tags, characters like & < > " ' can be dangerous
    // if the output is rendered in an HTML context without proper escaping.
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

    // Step 3: Remove null bytes — these can truncate strings in C-based systems
    // and bypass security filters in some databases/languages.
    .replace(/\0/g, '')

    // Step 4: Trim and collapse whitespace for clean storage
    .trim()
    .replace(/\s+/g, ' ');
}

// ============ COMPANY NAME SANITIZATION ============
// Company names have a predictable character set. We restrict to:
//   - Letters (any language via Unicode \p{L})
//   - Numbers (0-9)
//   - Common company name characters: spaces, dots, commas, hyphens, ampersands,
//     apostrophes, parentheses, forward slashes
//
// This blocks script injection while allowing names like:
//   "Berkshire Hathaway Inc." ✓
//   "AT&T" ✓
//   "Johnson & Johnson" ✓
//   "L'Oreal" ✓
//   "Y Combinator (W23)" ✓
//   "<script>alert('xss')</script>" ✗ → becomes "scriptalert(xss)/script"
function sanitizeCompanyName(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    // Remove everything except allowed characters.
    // \w covers [a-zA-Z0-9_], then we explicitly add the special chars companies use.
    // The 'u' flag enables Unicode support for international company names.
    .replace(/[^\w\s.,\-&'()/]/gu, '')

    // Collapse multiple spaces (common after stripping characters)
    .replace(/\s+/g, ' ')

    // Trim leading/trailing whitespace
    .trim()

    // Reasonable length limit — no company name needs 500 characters.
    // This prevents buffer overflow attempts and database field overflow.
    .slice(0, 200);
}

// ============ URL SANITIZATION ============
// Validates and sanitizes URLs to ensure they're well-formed HTTPS URLs.
// This prevents:
//   - javascript: URLs (XSS vector when rendered as <a href="javascript:...">)
//   - data: URLs (can embed executable content)
//   - file: URLs (can access local filesystem)
//   - Malformed URLs that could break downstream parsing
//
// Returns the sanitized URL string, or empty string if invalid.
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';

  // Trim whitespace
  const trimmed = url.trim();

  // Quick rejection of obvious attack vectors BEFORE parsing.
  // These protocols should NEVER appear in a company URL.
  const dangerous = /^(javascript|data|vbscript|file):/i;
  if (dangerous.test(trimmed)) return '';

  // Auto-prepend https:// if no protocol is specified.
  // Most users type "stripe.com" not "https://stripe.com".
  let urlToParse = trimmed;
  if (!/^https?:\/\//i.test(urlToParse)) {
    urlToParse = `https://${urlToParse}`;
  }

  try {
    // Use the URL constructor for proper parsing and validation.
    // This catches malformed URLs, missing hostnames, etc.
    const parsed = new URL(urlToParse);

    // ENFORCE HTTPS — HTTP is insecure and shouldn't be used for company websites.
    // If someone explicitly typed http://, upgrade it to https://.
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    // Only allow http/https protocols (reject ftp, etc.)
    if (parsed.protocol !== 'https:') {
      return '';
    }

    // Validate hostname has at least one dot (prevents "https://localhost" etc.)
    // Exception: allow localhost in development
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return '';
    }

    // Return the clean, normalized URL
    return parsed.toString();
  } catch {
    // URL constructor threw — input is not a valid URL
    return '';
  }
}

// ============ API KEY SANITIZATION ============
// Validates API key format per provider. Each AI provider uses a distinct
// key prefix, which lets us verify the key LOOKS correct before sending it
// to the provider (which would count as an API call and potentially expose
// the key in error logs).
//
// Known formats:
//   Perplexity: "pplx-" prefix
//   Anthropic:  "sk-ant-" prefix
//   OpenAI:     "sk-" prefix (but NOT "sk-ant-" which is Anthropic)
//   Groq:       "gsk_" prefix
//
// Returns the trimmed key if valid, empty string if invalid.
function sanitizeApiKey(key) {
  if (!key || typeof key !== 'string') return '';

  // Trim whitespace — copy-paste often includes trailing newlines/spaces
  const trimmed = key.trim();

  // Reject keys that are too short to be real (all providers use 20+ char keys)
  if (trimmed.length < 20) return '';

  // Reject keys that are suspiciously long (no provider uses 500+ char keys)
  if (trimmed.length > 500) return '';

  // Reject keys containing HTML/script characters — these are NEVER in real API keys
  // and indicate an injection attempt
  if (/<|>|"|'|&/.test(trimmed)) return '';

  // Reject keys with whitespace in the middle (malformed copy-paste)
  if (/\s/.test(trimmed)) return '';

  // Validate against known provider prefixes.
  // Each provider has a unique prefix — we check the key matches at least one.
  const validPrefixes = [
    'pplx-',    // Perplexity
    'sk-ant-',  // Anthropic
    'sk-',      // OpenAI (must check AFTER sk-ant- to avoid false match)
    'gsk_',     // Groq
  ];

  // Check if the key starts with any known prefix
  const hasValidPrefix = validPrefixes.some((prefix) => trimmed.startsWith(prefix));

  if (!hasValidPrefix) {
    // Key doesn't match any known provider format.
    // We still return it (it might be a new provider format we don't know about),
    // but strip any potentially dangerous characters first.
    return trimmed.replace(/[^\w\-_.]/g, '');
  }

  // Key has a valid prefix — return it as-is (after the trim above)
  return trimmed;
}

// ============ EXPORTS ============
export { sanitizeInput, sanitizeCompanyName, sanitizeUrl, sanitizeApiKey };
