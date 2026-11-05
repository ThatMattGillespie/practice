// Browser side of the vault: derive the key from the passphrase, decrypt
// content, and fetch + cache encrypted recordings for offline use.
// File format: 12-byte IV followed by AES-256-GCM ciphertext.

const KEY_SLOT = 'vault.key';
const AUDIO_CACHE = 'audio-v1';

const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64e = (u) => btoa(String.fromCharCode(...u));

export async function deriveKeyBytes(passphrase) {
  const meta = await (await fetch('vault/meta.json', { cache: 'no-cache' })).json();
  const pass = new TextEncoder().encode(passphrase.normalize('NFKC').trim().toLowerCase());
  const base = await crypto.subtle.importKey('raw', pass, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64d(meta.salt), iterations: meta.iterations }, base, 256);
  return new Uint8Array(bits);
}

export const importKey = (bytes) => crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);

export function saveKey(bytes) { try { localStorage.setItem(KEY_SLOT, b64e(bytes)); } catch {} }
export function forgetKey() { try { localStorage.removeItem(KEY_SLOT); } catch {} }
export async function restoreKey() {
  try { const s = localStorage.getItem(KEY_SLOT); return s ? await importKey(b64d(s)) : null; } catch { return null; }
}

export function decrypt(key, buf) {
  const u = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(0, 12) }, key, u.subarray(12));
}

export async function loadJSON(key, url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
  return JSON.parse(new TextDecoder().decode(await decrypt(key, await r.arrayBuffer())));
}

async function audioCache() { try { return await caches.open(AUDIO_CACHE); } catch { return null; } }

export async function isSaved(url) {
  const c = await audioCache();
  try { return !!(c && await c.match(url)); } catch { return false; }
}

// Returns the raw bytes for url, from the offline cache when present.
export async function getBytes(url, onProgress = () => {}, expected = 0) {
  const c = await audioCache();
  const hit = c && await c.match(url).catch(() => null);
  if (hit) { onProgress(1); return new Uint8Array(await hit.arrayBuffer()); }

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  const total = Number(r.headers.get('content-length')) || expected;
  let bytes;
  if (r.body && total) {
    const reader = r.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      onProgress(Math.min(got / total, 0.99));
    }
    bytes = new Uint8Array(got);
    let o = 0;
    for (const ch of chunks) { bytes.set(ch, o); o += ch.length; }
  } else {
    bytes = new Uint8Array(await r.arrayBuffer());
  }
  onProgress(1);
  if (c) await c.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } })).catch(() => {});
  return bytes;
}

export async function clearAudio() { try { await caches.delete(AUDIO_CACHE); } catch {} }

export async function storageUsed() {
  try { const e = await navigator.storage.estimate(); return e.usage || 0; } catch { return 0; }
}
