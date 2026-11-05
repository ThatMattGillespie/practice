// Pulls the Rigdzin community calendar, expands recurring events for the next
// 45 days, and writes them encrypted to vault/events.bin.
// Runs daily in GitHub Actions (secrets: VAULT_KEY, CAL_URL), or locally.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ICAL from 'ical.js';
import { importKey, encrypt, decrypt } from './vault-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'vault', 'events.bin');
const secretPath = path.resolve(root, '../private/secret.json');
const local = existsSync(secretPath) ? JSON.parse(await readFile(secretPath, 'utf8')) : {};
const keyB64 = process.env.VAULT_KEY || local.key;
const calUrl = process.env.CAL_URL || local.calUrl;
if (!keyB64 || !calUrl) throw new Error('VAULT_KEY and CAL_URL are required');
const key = await importKey(Buffer.from(keyB64, 'base64'));

const res = await fetch(calUrl);
if (!res.ok) throw new Error(`calendar fetch failed: ${res.status}`);
const cal = new ICAL.Component(ICAL.parse(await res.text()));
for (const tz of cal.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);

const now = Date.now();
const from = now - 3 * 3600e3;
const until = now + 45 * 86400e3;

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function clean(desc = '') {
  const text = decode(String(desc)
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n').trim();
  return text;
}
const zoomRe = /https?:\/\/[\w.-]*zoom\.us\/[^\s"'<>)\]]+/i;

const masters = new Map();
const exceptions = [];
for (const vevent of cal.getAllSubcomponents('vevent')) {
  const ev = new ICAL.Event(vevent);
  if (ev.isRecurrenceException()) exceptions.push(ev); else masters.set(ev.uid, ev);
}
for (const ex of exceptions) masters.get(ex.uid)?.relateException(ex);

const items = [];
function push(item, start, end) {
  const s = start.toJSDate().getTime();
  const e = end.toJSDate().getTime();
  if (e < from || s > until) return;
  if ((item.component.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED') return;
  const raw = `${item.description || ''}\n${item.location || ''}`;
  const zoom = (raw.match(zoomRe) || [])[0] || null;
  items.push({
    title: (item.summary || 'Event').replace(/\\n/g, '').trim(),
    start: new Date(s).toISOString(),
    end: new Date(e).toISOString(),
    allDay: start.isDate,
    zoom,
    notes: clean(item.description).slice(0, 900),
  });
}

for (const ev of masters.values()) {
  if (!ev.isRecurring()) { push(ev, ev.startDate, ev.endDate); continue; }
  const it = ev.iterator();
  let next, guard = 0;
  while ((next = it.next()) && guard++ < 2000) {
    const t = next.toJSDate().getTime();
    if (t > until) break;
    const d = ev.getOccurrenceDetails(next);
    push(d.item, d.startDate, d.endDate);
  }
}

items.sort((a, b) => a.start.localeCompare(b.start));
const payload = { events: items };
const body = JSON.stringify(payload);

if (existsSync(out)) {
  try {
    const prev = (await decrypt(key, await readFile(out))).toString();
    if (prev === body) { console.log('events unchanged'); process.exit(0); }
  } catch { /* key changed: rewrite */ }
}
await writeFile(out, await encrypt(key, Buffer.from(body)));
console.log(`wrote ${items.length} events`);
