// Shared crypto helpers for the build tools. Mirrors js/vault.js in the browser.
// File format: 12-byte IV followed by AES-256-GCM ciphertext (tag appended).
import { webcrypto as crypto } from 'node:crypto';

const enc = new TextEncoder();

export async function deriveKeyBytes(passphrase, saltB64, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC').trim().toLowerCase()), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: Buffer.from(saltB64, 'base64'), iterations },
    base, 256);
  return Buffer.from(bits);
}

export async function importKey(keyBytes) {
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return Buffer.concat([Buffer.from(iv), Buffer.from(ct)]);
}

export async function decrypt(key, buf) {
  const iv = buf.subarray(0, 12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf.subarray(12));
  return Buffer.from(pt);
}
