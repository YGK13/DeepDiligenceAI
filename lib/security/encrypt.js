// ============================================================================
// lib/security/encrypt.js — AES-256-GCM Encryption for API Keys at Rest
// ============================================================================
// WHY: Users store their AI provider API keys (Perplexity, Anthropic, OpenAI,
// Groq) in the app settings. If we store these as plaintext in localStorage,
// Supabase, or any database, a single data breach exposes every user's keys.
//
// AES-256-GCM is the gold standard for symmetric encryption:
//   - AES-256: 256-bit key = computationally infeasible to brute force
//   - GCM mode: Provides both encryption AND authentication (detects tampering)
//   - IV (Initialization Vector): Ensures identical plaintexts produce different
//     ciphertexts, preventing pattern analysis
//   - Auth Tag: 16-byte tag that verifies the ciphertext wasn't modified
//
// STORAGE FORMAT: base64(iv):base64(authTag):base64(ciphertext)
//   - Three colon-separated base64 strings
//   - Easy to store in any text field (database, env var, JSON)
//   - Easy to detect with isEncrypted() check
//
// KEY MANAGEMENT:
//   - The encryption key lives in process.env.ENCRYPTION_KEY
//   - It MUST be a 32-byte (64-character) hex string
//   - Generate one with: generateEncryptionKey() or `openssl rand -hex 32`
//   - NEVER commit this key to source control
//   - In production (Vercel), set it as an environment variable
//
// USAGE:
//   import { encrypt, decrypt, isEncrypted } from '@/lib/security/encrypt';
//   const encrypted = encrypt('sk-ant-api03-...', process.env.ENCRYPTION_KEY);
//   const decrypted = decrypt(encrypted, process.env.ENCRYPTION_KEY);
// ============================================================================

import crypto from 'crypto';

// ============ CONSTANTS ============
// AES-256-GCM requires exactly these sizes — non-negotiable per the spec
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // 12 bytes (96 bits) is the recommended IV size for GCM
const AUTH_TAG_LENGTH = 16;  // 16 bytes (128 bits) authentication tag
const KEY_LENGTH = 32;       // 32 bytes (256 bits) for AES-256

// ============ KEY VALIDATION ============
// Ensures the provided key is a valid 32-byte hex string.
// Called before every encrypt/decrypt operation to fail fast with a clear message.
function validateKey(secretKey) {
  if (!secretKey) {
    throw new Error(
      'Encryption key is required. Set ENCRYPTION_KEY environment variable. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Convert hex string to buffer and verify length
  const keyBuffer = Buffer.from(secretKey, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `Encryption key must be exactly ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters). ` +
      `Got ${keyBuffer.length} bytes (${secretKey.length} hex characters).`
    );
  }

  return keyBuffer;
}

// ============ ENCRYPT ============
// Takes a plaintext string and returns an encrypted string in the format:
//   base64(iv):base64(authTag):base64(ciphertext)
//
// Each call generates a UNIQUE random IV, so encrypting the same plaintext
// twice produces different ciphertexts. This is critical for security —
// it prevents attackers from detecting duplicate API keys by comparing encrypted values.
function encrypt(plaintext, secretKey) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string.');
  }

  const keyBuffer = validateKey(secretKey);

  // Generate a cryptographically random IV for this encryption operation.
  // NEVER reuse an IV with the same key — GCM security completely breaks down if you do.
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create the cipher with our algorithm, key, and IV
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt the plaintext
  // update() processes the data, final() flushes any remaining bytes
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get the authentication tag AFTER encryption is complete.
  // This tag is used during decryption to verify the ciphertext wasn't tampered with.
  const authTag = cipher.getAuthTag();

  // Combine into our storage format: iv:authTag:ciphertext (all base64-encoded)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

// ============ DECRYPT ============
// Takes an encrypted string (iv:authTag:ciphertext format) and returns the original plaintext.
// Throws if the ciphertext was tampered with (GCM auth tag verification fails).
function decrypt(encryptedString, secretKey) {
  if (!encryptedString || typeof encryptedString !== 'string') {
    throw new Error('Encrypted string must be a non-empty string.');
  }

  const keyBuffer = validateKey(secretKey);

  // Split the encrypted string into its three components
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted string format. Expected base64(iv):base64(authTag):base64(ciphertext).'
    );
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;

  // Decode all three parts from base64 back to Buffers
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');

  // Validate IV length — wrong IV size means the data is corrupted or not our format
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}.`);
  }

  // Create the decipher and set the auth tag for verification
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  // Decrypt the ciphertext.
  // If the auth tag doesn't match (data was tampered with), final() will throw:
  //   "Unsupported state or unable to authenticate data"
  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (error) {
    // Re-throw with a more helpful message
    throw new Error(
      'Decryption failed — the data may have been tampered with, or the encryption key is wrong. ' +
      `Original error: ${error.message}`
    );
  }
}

// ============ IS ENCRYPTED CHECK ============
// Quickly checks if a string looks like our encrypted format (iv:authTag:ciphertext).
// Used to avoid double-encrypting already-encrypted values, and to decide whether
// a stored API key needs decryption before use.
//
// This is a FORMAT check, not a cryptographic verification. It checks:
//   1. String contains exactly two colons (three parts)
//   2. Each part is valid base64
//   3. The IV part decodes to the expected length
function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  try {
    const [ivBase64, authTagBase64, ciphertextBase64] = parts;

    // Check that all parts are valid base64 and have reasonable lengths
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    // IV must be exactly 12 bytes, auth tag must be 16 bytes, ciphertext must exist
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH && ciphertext.length > 0;
  } catch {
    return false;
  }
}

// ============ KEY GENERATION HELPER ============
// Generates a cryptographically secure 32-byte (256-bit) key as a hex string.
// Run this ONCE during initial setup and store the result in your .env.local:
//   ENCRYPTION_KEY=<output of this function>
//
// IMPORTANT: This key is the MASTER SECRET. If you lose it, all encrypted data
// becomes permanently unrecoverable. Back it up securely.
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// ============ EXPORTS ============
export { encrypt, decrypt, isEncrypted, generateEncryptionKey };
