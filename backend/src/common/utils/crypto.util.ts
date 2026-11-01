import * as crypto from 'crypto';

/**
 * Enterprise AES-256-GCM Cryptographic Storage Utility
 * Encrypts confidential secrets (DKIM private keys, webhook secrets, integration keys)
 * at rest in the PostgreSQL database.
 */

// 32-byte master encryption key derived from environment or secure master seed
const MASTER_ENCRYPTION_SECRET =
  process.env.DB_ENCRYPTION_KEY ||
  process.env.ENCRYPTION_SECRET ||
  'dispatchhub_aes_256_gcm_master_key_super_secret_seed_2026';

// Derive exact 32-byte key using SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_ENCRYPTION_SECRET).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

/**
 * Encrypts a confidential string using AES-256-GCM.
 * Output format: `iv:authTag:ciphertext` (all hex encoded)
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Verifies the authentication tag to ensure zero tampering or corruption.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return '';

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // If plaintext legacy or not encrypted, return as is safely
    return cipherText;
  }

  const [ivHex, authTagHex, encryptedDataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks sensitive keys (e.g., API keys, auth tokens) for safe display in UI/Logs.
 * Example: `sk_live_8113ebbe-4d9b...` -> `sk_live_8113...ae67a`
 */
export function maskSecret(secret: string, visibleChars = 4): string {
  if (!secret || secret.length <= visibleChars * 2) {
    return '••••••••';
  }
  const prefix = secret.slice(0, visibleChars + 6);
  const suffix = secret.slice(-visibleChars);
  return `${prefix}••••${suffix}`;
}
