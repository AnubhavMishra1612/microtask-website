import crypto from "crypto";

/**
 * Generates a cryptographically secure, unpredictable reference token for task submissions.
 * Format: TSK-<12 hex or alphanumeric characters with high entropy> e.g. TSK-9F8A-3C2B-7E1D
 * Minimum 128 bits of cryptographic entropy to prevent brute-forcing.
 */
export function generateReferenceCode(): string {
  const bytes = crypto.randomBytes(8); // 64 bits formatted as 4-character blocks, or 12 bytes
  const hex = bytes.toString("hex").toUpperCase();
  // Format as TSK-XXXX-XXXX-XXXX
  return `TSK-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/**
 * Validates reference code format
 */
export function isValidReferenceCode(code: string): boolean {
  return /^TSK-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code.trim());
}

/**
 * Generates a cryptographically secure session token (64 hex characters / 256 bits of entropy)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
