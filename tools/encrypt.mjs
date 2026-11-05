// Encrypts the private content and recordings into ./vault for publishing.
//
//   node tools/encrypt.mjs            uses the passphrase saved in ../private/secret.json
//   PASSPHRASE=new-words node tools/encrypt.mjs --new-salt   changes the passphrase
//
// Plain files never enter this repo. They live in ../private and ../ (the MP3 folder).
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveKeyBytes, importKey, encrypt } from './vault-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = path.resolve(root, '../private');
const audioDir = path.resolve(root, '..');
const vault = path.join(root, 'vault');
const secretPath = path.join(privateDir, 'secret.json');
const metaPath = path.join(vault, 'meta.json');

const ITERATIONS = 600000;
const secret = existsSync(secretPath) ? JSON.parse(await readFile(secretPath, 'utf8')) : {};
const passphrase = process.env.PASSPHRASE || secret.passphrase;
if (!passphrase) throw new Error('Set PASSPHRASE or create ../private/secret.json');

let meta = existsSync(metaPath) ? JSON.parse(await readFile(metaPath, 'utf8')) : null;
if (!meta || process.argv.includes('--new-salt') || process.env.PASSPHRASE) {
  meta = { v: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: randomBytes(16).toString('base64') };
}
const keyBytes = await deriveKeyBytes(passphrase, meta.salt, meta.iterations);
const key = await importKey(keyBytes);

await mkdir(vault, { recursive: true });
const content = JSON.parse(await readFile(path.join(privateDir, 'content.json'), 'utf8'));

// Only re-encrypt audio when the key changed or a file is missing.
const keyChanged = secret.key !== keyBytes.toString('base64');
for (const r of content.recordings) {
  const out = path.join(vault, `${r.id}.bin`);
  const src = await readFile(path.join(audioDir, r.source));
  r.bytes = src.length + 28;
  if (!keyChanged && existsSync(out)) continue;
  await writeFile(out, await encrypt(key, src));
  console.log('encrypted', r.id, r.source);
  delete r.source;
}
for (const r of content.recordings) delete r.source; // filenames stay private

// The book (made by tools/book2json.py) is optional.
const bookPath = path.join(privateDir, 'book.json');
if (existsSync(bookPath)) {
  await writeFile(path.join(vault, 'book.bin'), await encrypt(key, await readFile(bookPath)));
  content.hasBook = true;
}
await writeFile(path.join(vault, 'content.bin'), await encrypt(key, Buffer.from(JSON.stringify(content))));
await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n');

// Clear out recordings that were removed from content.json.
const keep = new Set(content.recordings.map((r) => `${r.id}.bin`).concat(['content.bin', 'meta.json', 'events.bin', 'book.bin']));
for (const f of await readdir(vault)) if (!keep.has(f)) { await unlink(path.join(vault, f)); console.log('removed', f); }

await writeFile(secretPath, JSON.stringify({ ...secret, passphrase, key: keyBytes.toString('base64') }, null, 2) + '\n');
console.log('content encrypted. Key (for the VAULT_KEY GitHub secret) is in ../private/secret.json');
if (keyChanged) console.log('KEY CHANGED: update the VAULT_KEY secret and run tools/events.mjs again.');
