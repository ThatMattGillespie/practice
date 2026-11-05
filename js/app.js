import * as V from './vault.js';

/* ---------------- small helpers ---------------- */
const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
const clock = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
const mb = (b) => `${Math.round(b / 1048576)} MB`;
const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<]+[^\s<.,;:)\]'"]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 38)}…</a>`);

const I = {
  practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/></svg>',
  path: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 19l5.5-9 4 6 3-4.5L21 19z"/><circle cx="16.5" cy="6" r="1.6"/></svg>',
  sangha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M2.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5M13.5 15c.9-.9 1.9-1.4 3-1.4 2.2 0 3.9 1.6 4.5 4.4"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/><text x="12" y="15" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system">15</text></svg>',
  fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4h-4"/><text x="12" y="15" font-size="7" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system">15</text></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  body: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="5" r="2"/><path d="M12 8v6M6 19c1.5-2.5 3.5-4 6-4s4.5 1.5 6 4M8 11.5h8"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 18l4.5-12L12 18M4.6 14h5.8M14 18l3-8 3 8M15 15.5h4"/></svg>',
  enso: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M78 30A36 36 0 1 0 84 55" stroke-width="5"/></svg>',
};

/* ---------------- state ---------------- */
let KEY = null;
let C = null;           // decrypted content
let EVENTS = null;      // decrypted calendar events
let BOOK = null;        // decrypted book
const audio = new Audio();
audio.preload = 'auto';

/* ---------------- boot / lock ---------------- */
boot();
async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  applyTheme();
  KEY = await V.restoreKey();
  if (KEY) {
    try { C = await V.loadJSON(KEY, 'vault/content.bin'); }
    catch (e) { if (e.name === 'OperationError') { V.forgetKey(); KEY = null; } else return renderLock('Could not reach the site. Check your connection.'); }
  }
  if (!C) return renderLock();
  start();
}

function renderLock(msg = '') {
  app.innerHTML = `
  <main class="lock">
    <form id="unlock" autocomplete="on">
      <div class="enso">${I.enso}</div>
      <h1>Practice</h1>
      <p class="muted" style="margin:0">Private practice materials. Enter your passphrase once on this device.</p>
      <input type="text" name="username" value="practice" autocomplete="username" hidden>
      <label class="visually-hidden" for="pass">Passphrase</label>
      <input class="field" id="pass" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="passphrase" required>
      <button class="btn block" type="submit">Unlock</button>
      <p class="error" role="alert">${esc(msg)}</p>
    </form>
  </main>`;
  const form = document.getElementById('unlock');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Unlocking…';
    try {
      const bytes = await V.deriveKeyBytes(form.pass.value);
      const key = await V.importKey(bytes);
      C = await V.loadJSON(key, 'vault/content.bin');
      KEY = key; V.saveKey(bytes);
      navigator.storage?.persist?.().catch(() => {});
      start();
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Unlock';
      form.querySelector('.error').textContent = err.name === 'OperationError' ? 'That passphrase didn’t match.' : 'Could not unlock. Check your connection.';
    }
  });
}

function start() {
  V.loadJSON(KEY, 'vault/events.bin').then((d) => { EVENTS = d.events; if (route() === 'sangha') render(); }).catch(() => { EVENTS = []; });
  const h = location.hash;
  if (h.startsWith('#return=')) {
    const id = h.slice(8);
    history.replaceState(null, '', '#practice');
    render();
    const item = findItem(id);
    if (item) openSession(item);
    return;
  }
  render();
}
addEventListener('hashchange', () => { if (C) render(); });

/* ---------------- routing + shell ---------------- */
const TABS = [['practice', 'Practice'], ['path', 'Path'], ['sangha', 'Sangha'], ['library', 'Library']];
const route = () => { const r = location.hash.slice(1); return TABS.some(([k]) => k === r) ? r : 'practice'; };

function render() {
  const r = route();
  const views = { practice: viewPractice, path: viewPath, sangha: viewSangha, library: viewLibrary };
  app.innerHTML = `
    <div class="app"><main class="view" id="view">${views[r]()}</main></div>
    <nav class="tabbar" aria-label="Sections">
      ${TABS.map(([k, label]) => `<a href="#${k}" ${k === r ? 'aria-current="page"' : ''}>${I[k]}<span>${label}</span></a>`).join('')}
    </nav>`;
  scrollTo(0, 0);
  after[r]?.();
}
const topbar = (eyebrow) => `<div class="topbar"><p class="eyebrow">${esc(eyebrow)}</p><button class="icon-btn" data-open-settings aria-label="Settings">${I.gear}</button></div>`;
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-open-settings],[data-rec],[data-open-book]');
  if (!t) return;
  if (t.hasAttribute('data-open-settings')) openSettings(t.dataset.openSettings);
  else if (t.dataset.rec) openSession(findItem(t.dataset.rec));
  else if (t.hasAttribute('data-open-book')) openReader();
});

/* ---------------- practice ---------------- */
const SIT_MINUTES = [10, 20, 30, 45, 60];
function findItem(id) {
  if (id?.startsWith('sit-')) {
    const m = Number(id.slice(4));
    return { kind: 'sit', id, title: 'Silent sit', kicker: `${m} minutes`, about: 'A bell to begin. Three bells to close. Nothing in between.', minutes: m, url: `audio/sit-${m}.mp3` };
  }
  const r = C.recordings.find((x) => x.id === id);
  return r && { kind: 'rec', ...r, url: `vault/${r.id}.bin` };
}

function stats(log) {
  const days = new Set(log.map((l) => dayKey(l.at)));
  let streak = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const weekAgo = Date.now() - 7 * 86400e3;
  const week = log.filter((l) => l.at > weekAgo).reduce((a, l) => a + l.minutes, 0);
  const strip = [];
  for (let i = 13; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); strip.push(days.has(dayKey(x))); }
  return { streak, week, total: log.length, strip };
}

const GROUPS = [['one-pointedness', 'One-Pointedness'], ['one-taste', 'One Taste'], ['non-meditation', 'Non-Meditation'], ['compassion', 'Compassion']];
function recButton(r) {
  return `<button class="rec" data-rec="${r.id}">
    <span><span class="kicker">${esc(r.kicker)}</span><span class="title">${esc(r.title)}</span></span>
    <span class="meta"><span>${r.minutes} min</span><i class="saved-dot off" data-saved="${r.id}" title="Not saved offline"></i></span>
  </button>`;
}
function viewPractice() {
  const log = store.get('log', []);
  const s = stats(log);
  const h = new Date().getHours();
  const greet = h < 5 ? 'The quiet hours' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const last = log[log.length - 1];
  const sitMin = store.get('sitMin', 20);
  return `${topbar(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}
  <h1 class="hello">${greet}</h1>
  <p class="lede">${last ? `Last sat: ${esc(last.title)}, ${relDay(last.at)}.` : 'Find a quiet place, settle the body, and begin.'}</p>
  <div class="stats">
    <div class="stat"><b>${s.streak}</b><span>day streak</span></div>
    <div class="stat"><b>${s.week}</b><span>min this week</span></div>
    <div class="stat"><b>${s.total}</b><span>sessions</span></div>
  </div>
  <div class="days" aria-label="Last 14 days">${s.strip.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('')}</div>

  <section class="section">
    <p class="eyebrow">Guided meditations</p>
    ${GROUPS.map(([k, label]) => {
      const rs = C.recordings.filter((r) => r.yoga === k);
      return rs.length ? `<p class="group-label">${label}</p><div class="rec-list">${rs.map(recButton).join('')}</div>` : '';
    }).join('')}
  </section>

  <section class="section">
    <p class="eyebrow">Silent sit</p>
    <div class="sit">
      <p style="margin:0">Unguided practice with a bell to begin and three to close.</p>
      <div class="seg" role="group" aria-label="Duration">${SIT_MINUTES.map((m) => `<button type="button" data-min="${m}" aria-pressed="${m === sitMin}">${m}</button>`).join('')}</div>
      <button class="btn block" id="sit-go">Begin ${sitMin} minute sit</button>
    </div>
  </section>`;
}
function relDay(t) {
  const d = Math.round((new Date(dayKey(Date.now())) - new Date(dayKey(t))) / 86400e3);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}
const after = {
  practice() {
    markSaved();
    document.querySelectorAll('.seg [data-min]').forEach((b) => b.addEventListener('click', () => {
      store.set('sitMin', Number(b.dataset.min));
      document.querySelectorAll('.seg [data-min]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      document.getElementById('sit-go').textContent = `Begin ${b.dataset.min} minute sit`;
    }));
    document.getElementById('sit-go').addEventListener('click', () => openSession(findItem(`sit-${store.get('sitMin', 20)}`)));
  },
  sangha() {
    document.querySelectorAll('.filter button').forEach((b) => b.addEventListener('click', () => { store.set('evFilter', b.dataset.f); render(); }));
  },
};
async function markSaved() {
  for (const el of document.querySelectorAll('[data-saved]')) {
    if (await V.isSaved(`vault/${el.dataset.saved}.bin`)) { el.classList.remove('off'); el.title = 'Saved for offline'; }
  }
}

/* ---------------- session ---------------- */
let S = null; // current session
const SILENT = (() => {
  const n = 800, b = new ArrayBuffer(44 + n), v = new DataView(b);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
})();

function openSession(item) {
  if (!item) return;
  closeSession(true);
  S = { item, state: 'ready', listened: 0, lastT: 0, blobUrl: null, saved: false };
  const el = document.createElement('div');
  el.className = 'session'; el.id = 'session';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', item.title);
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  el.addEventListener('pointerdown', wake);
  el.addEventListener('click', onSessionClick);
  V.isSaved(item.url).then((s) => { if (S) { S.saved = s; drawSession(); } });
  drawSession();
}

function quietRow() {
  const until = store.get('quietUntil', 0);
  if (until > Date.now()) return `<div class="row done">${I.check}<span>Notifications silenced<small>Do Not Disturb until ${fmtTime(until)}</small></span></div>`;
  if (store.get('quietOn', false)) return `<button class="row" data-act="quiet">${I.moon}<span>Silence notifications<small>Do Not Disturb for ${S.item.minutes + 5} minutes, then back here</small></span></button>`;
  return `<button class="row" data-act="setup-quiet">${I.moon}<span>Silence notifications<small>Set up one-tap Do Not Disturb</small></span></button>`;
}

function drawSession() {
  const el = document.getElementById('session');
  if (!el || !S) return;
  const it = S.item;
  const head = `<div class="topbar fadeable"><button class="icon-btn" data-act="close" aria-label="Close">${I.close}</button><span class="eyebrow">${esc(it.kicker)}</span><span style="width:44px"></span></div>`;
  if (S.state === 'ready' || S.state === 'loading') {
    const size = it.bytes ? mb(it.bytes) : '';
    el.innerHTML = `${head}
    <div class="center">
      <h2>${esc(it.title)}</h2>
      <p class="about">${esc(it.about)}</p>
      <div class="prep">
        ${quietRow()}
        <details class="row" style="display:block">
          <summary style="display:flex;gap:12px;align-items:center;list-style:none;cursor:pointer">${I.body}<span>Seven points of posture<small>Feet, spine, trunk, chin, hands, eyes, tongue</small></span></summary>
          <ol class="posture">${C.path.posture.map(([a, b]) => `<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join('')}</ol>
        </details>
      </div>
      ${S.state === 'loading'
        ? `<div style="display:grid;gap:10px;min-height:88px;align-content:center"><div class="loading-bar"><i id="load-i"></i></div><span class="muted small" id="load-t">Preparing…</span></div>`
        : `<button class="play" data-act="begin" aria-label="Begin">${I.play}</button>`}
      <p class="muted small" style="margin:0">${it.minutes} min${!S.saved && size ? ` · first play downloads ${size}` : ''}<br>Your screen can lock once it begins.</p>
    </div><div></div>`;
  } else if (S.state === 'playing') {
    el.innerHTML = `${head}
    <div class="center">
      <div class="ring">
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="48"/><circle class="bar" id="bar" cx="50" cy="50" r="48" stroke-dasharray="301.6" stroke-dashoffset="301.6"/></svg>
        <div class="inner"><span class="time" id="remain">${clock(it.minutes * 60)}</span><span class="muted small fadeable">remaining</span></div>
      </div>
      <div class="controls fadeable">
        <button class="icon-btn" data-act="back" aria-label="Back 15 seconds">${I.back}</button>
        <button class="play" data-act="toggle" id="toggle" aria-label="Pause">${audio.paused ? I.play : I.pause}</button>
        <button class="icon-btn" data-act="fwd" aria-label="Forward 15 seconds">${I.fwd}</button>
      </div>
    </div>
    <div class="fadeable" style="text-align:center"><button class="btn ghost" data-act="end">End session</button></div>`;
    tick();
    wake();
  } else if (S.state === 'done') {
    const mins = Math.max(1, Math.round(S.listened / 60));
    el.innerHTML = `<div></div>
    <div class="center">
      <div class="enso" style="color:var(--accent)">${I.enso}</div>
      <h2>${S.logged ? 'Session complete' : 'Session ended'}</h2>
      <p class="about">${S.logged ? `${mins} minute${mins > 1 ? 's' : ''} of practice, added to your log.` : 'Under a minute, so it wasn’t logged.'}</p>
      ${S.logged ? `<label class="visually-hidden" for="note">Note</label><textarea id="note" class="note" placeholder="A note on what arose (optional)"></textarea>` : ''}
      <button class="btn" data-act="close" style="min-width:160px">Done</button>
    </div><div></div>`;
  }
}

async function onSessionClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b || !S) return;
  const act = b.dataset.act;
  if (act === 'close') {
    if (S.state === 'done' && S.logged) {
      const note = document.getElementById('note')?.value.trim();
      if (note) { const log = store.get('log', []); log[log.length - 1].note = note; store.set('log', log); }
    }
    closeSession();
    if (route() === 'practice') render();
  }
  if (act === 'setup-quiet') { closeSession(); openSettings('quiet'); }
  if (act === 'quiet') runQuiet();
  if (act === 'begin') begin();
  if (act === 'toggle') { audio.paused ? audio.play() : audio.pause(); }
  if (act === 'back') audio.currentTime = Math.max(0, audio.currentTime - 15);
  if (act === 'fwd') audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
  if (act === 'end') finish();
}

function runQuiet() {
  const minutes = S.item.minutes + 5;
  store.set('quietUntil', Date.now() + minutes * 60000);
  const name = store.get('quietName', 'Meditate');
  let url = `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${minutes}`;
  if (!standalone) url += `&x-success=${encodeURIComponent(`${location.origin}${location.pathname}#return=${S.item.id}`)}`;
  location.href = url;
  setTimeout(drawSession, 800);
}

async function begin() {
  // Unlock audio inside the tap so iOS allows playback after the async download.
  audio.src = SILENT;
  audio.play().catch(() => {});
  S.state = 'loading'; drawSession();
  try {
    const bytes = await V.getBytes(S.item.url, (p) => {
      const i = document.getElementById('load-i'), t = document.getElementById('load-t');
      if (i) i.style.width = `${Math.round(p * 100)}%`;
      if (t) t.textContent = p < 1 ? `Downloading ${Math.round(p * 100)}%` : 'Preparing…';
    }, S.item.bytes);
    const data = S.item.kind === 'rec' ? await V.decrypt(KEY, bytes) : bytes;
    if (!S) return;
    S.blobUrl = URL.createObjectURL(new Blob([data], { type: 'audio/mpeg' }));
    audio.src = S.blobUrl;
    S.lastT = 0;
    S.state = 'playing';
    setMedia();
    await audio.play();
    drawSession();
  } catch (err) {
    if (!S) return;
    S.state = 'ready'; drawSession();
    const p = document.querySelector('#session .center');
    p?.insertAdjacentHTML('beforeend', `<p class="error">${err.name === 'NotAllowedError' ? 'Tap play to start.' : 'Couldn’t load the recording. Check your connection and try again.'}</p>`);
    if (err.name === 'NotAllowedError' && S.blobUrl) { S.state = 'playing'; drawSession(); }
  }
}

function setMedia() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: S.item.title, artist: S.item.kicker, album: 'Practice',
    artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
  const h = { play: () => audio.play(), pause: () => audio.pause(),
    seekbackward: () => { audio.currentTime -= 15; }, seekforward: () => { audio.currentTime += 15; } };
  for (const [k, f] of Object.entries(h)) { try { navigator.mediaSession.setActionHandler(k, f); } catch {} }
}

function tick() {
  if (!S || S.state !== 'playing') return;
  const dur = audio.duration && isFinite(audio.duration) ? audio.duration : S.item.minutes * 60;
  const r = document.getElementById('remain'), bar = document.getElementById('bar');
  if (r) r.textContent = clock(dur - audio.currentTime);
  if (bar) bar.style.strokeDashoffset = String(301.6 * (1 - audio.currentTime / dur));
}
audio.addEventListener('timeupdate', () => {
  if (!S || S.state !== 'playing') return;
  const d = audio.currentTime - S.lastT;
  if (!audio.paused && d > 0 && d < 2) S.listened += d;
  S.lastT = audio.currentTime;
  tick();
});
audio.addEventListener('seeked', () => { if (S) S.lastT = audio.currentTime; });
audio.addEventListener('play', () => { const t = document.getElementById('toggle'); if (t) { t.innerHTML = I.pause; t.setAttribute('aria-label', 'Pause'); } });
audio.addEventListener('pause', () => { const t = document.getElementById('toggle'); if (t) { t.innerHTML = I.play; t.setAttribute('aria-label', 'Play'); } wake(); });
audio.addEventListener('ended', () => { if (S?.state === 'playing') finish(); });

let dimTimer;
function wake() {
  const el = document.getElementById('session');
  if (!el) return;
  el.classList.remove('dim');
  clearTimeout(dimTimer);
  if (S?.state === 'playing') dimTimer = setTimeout(() => { if (!audio.paused) el.classList.add('dim'); }, 6000);
}

function finish() {
  audio.pause();
  S.logged = S.listened >= 60;
  if (S.logged) {
    const log = store.get('log', []);
    log.push({ at: Date.now(), id: S.item.id, title: S.item.title, minutes: Math.max(1, Math.round(S.listened / 60)) });
    store.set('log', log);
  }
  if (store.get('quietUntil', 0) > Date.now()) store.set('quietUntil', 0);
  S.state = 'done';
  drawSession();
}

function closeSession(silent) {
  audio.pause();
  if (S?.blobUrl) URL.revokeObjectURL(S.blobUrl);
  audio.removeAttribute('src'); audio.load();
  S = null;
  document.getElementById('session')?.remove();
  document.body.style.overflow = '';
  if (!silent) clearTimeout(dimTimer);
}

/* ---------------- path ---------------- */
function viewPath() {
  const P = C.path;
  const recsFor = (id) => C.recordings.filter((r) => r.yoga === id);
  const chip = (r) => `<button class="chip" data-rec="${r.id}">${I.play}${esc(r.title)} · ${r.minutes}m</button>`;
  const log = store.get('log', []).slice().reverse();
  return `${topbar('The Four Yogas of Mahamudra')}
  <h1>The path</h1>
  <p class="lede">${esc(P.sequence)}</p>
  <p class="source">${esc(P.sequenceSource)}</p>
  <section class="section">
    ${P.yogas.map((y, i) => `
      <div class="yoga">
        <span class="num">Yoga ${i + 1}</span>
        <h2>${esc(y.name)}</h2>
        <p class="quote">“${esc(y.gampopa)}”</p>
        ${y.stages ? `<details class="fold"><summary>${esc(y.stagesTitle)}</summary><div><ol class="stages">${y.stages.map(([a, b]) => `<li><span><b>${esc(a)}</b><span>${esc(b)}</span></span></li>`).join('')}</ol><p class="source">${esc(y.source)}</p></div></details>` : ''}
        ${y.groups ? y.groups.map(([g, items]) => `<p style="margin:12px 0 4px;font-weight:600">${esc(g)}</p><ul class="plain">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('') : ''}
        ${y.list ? `<ul class="plain">${y.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${recsFor(y.id).length ? `<div class="chips">${recsFor(y.id).map(chip).join('')}</div>` : ''}
      </div>`).join('')}
    <div class="yoga"><span class="num">Heart practice</span><h2>Compassion</h2><div class="chips">${recsFor('compassion').map(chip).join('')}</div></div>
  </section>
  <section class="section">
    <p class="eyebrow">Reference</p>
    <details class="fold"><summary>Seven key points of the body</summary><div><ol class="stages">${P.posture.map(([a, b]) => `<li><span><b>${esc(a)}</b><span>${esc(b)}</span></span></li>`).join('')}</ol><p class="source">${esc(P.postureSource)}</p></div></details>
    <details class="fold"><summary>Three tools of concentration</summary><div><ul class="plain">${P.tools.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="muted small">Two types: ${P.concentrationTypes.map(esc).join(' and ')}.</p></div></details>
    <details class="fold"><summary>Four types of mental engagement</summary><div><ol class="plain">${P.engagement.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div></details>
    <details class="fold"><summary>Distractions and signs</summary><div><p style="margin:0 0 4px;font-weight:600">Ordinary distractions</p><ul class="plain">${P.distractions.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p style="margin:12px 0 4px;font-weight:600">Extraordinary distractions / signs</p><ul class="plain">${P.signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></details>
    <details class="fold"><summary>Ground, path, fruition · Three keys</summary><div><p class="muted" style="margin:0">Three phases: ${P.phases.map(esc).join(', ')}.<br>Three keys: ${P.keys.map(esc).join(', ')}.</p></div></details>
  </section>
  <section class="section">
    <p class="eyebrow">Practice log</p>
    ${log.length ? `<ul class="link-list">${log.slice(0, 40).map((l) => `<li style="padding:12px 0"><b style="font-weight:500">${esc(l.title)}</b> <span class="muted small">· ${l.minutes} min · ${new Date(l.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>${l.note ? `<p class="muted small" style="margin:4px 0 0;white-space:pre-line">${esc(l.note)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Sessions you complete appear here, with any notes you add.</p>'}
  </section>`;
}

/* ---------------- sangha ---------------- */
const LEVELS = [
  [/global sangha/i, true, 'Open to Intro graduates · registration required'],
  [/concentration|emptiness/i, true, 'Concentration & Emptiness · Intro graduates'],
  [/dream|sleep/i, true, 'Dream & Sleep · Intro graduates'],
  [/foundations|4 thoughts/i, true, 'Community sit'],
  [/dialogue|conversation/i, true, 'Community conversation'],
  [/recognizing|one taste|non-meditation/i, false, 'For One Taste / Non-Meditation practitioners'],
  [/stabilizing/i, false, 'For Stabilizing Awakening'],
  [/radiance|differentiation/i, false, 'After the Advanced retreat'],
  [/immeasurables|perfections/i, false, 'After the Intermediate retreat'],
  [/inner fire|tummo|tsa lung/i, false, 'After the Inner Fire retreat'],
];
const level = (t) => LEVELS.find(([re]) => re.test(t)) || [null, true, ''];

function viewSangha() {
  const f = store.get('evFilter', 'you');
  const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || '';
  let list = '<p class="muted">Loading the community calendar…</p>';
  if (EVENTS) {
    const now = Date.now();
    const evs = EVENTS.filter((e) => new Date(e.end) > now && (f === 'all' || level(e.title)[1]));
    const days = new Map();
    for (const e of evs) { const k = dayKey(e.start); if (!days.has(k)) days.set(k, []); days.get(k).push(e); }
    list = evs.length ? [...days.values()].slice(0, 21).map((items) => `
      <div class="day"><h3>${dayLabel(items[0].start)}</h3>
        ${items.map((e) => {
          const [, open, tag] = level(e.title);
          const live = new Date(e.start) <= now && new Date(e.end) > now;
          const reg = (e.notes.match(/https?:\/\/[^\s]*(regfox|list-manage|eventbrite|register)[^\s]*/i) || [])[0];
          return `<div class="event ${live ? 'now' : ''}">
            <time datetime="${e.start}">${live ? 'Now' : fmtTime(e.start)}</time>
            <div><div class="name">${esc(e.title)}</div>${tag ? `<span class="tag ${open ? 'open' : ''}">${esc(tag)}</span>` : ''}
              ${(e.zoom || reg) ? `<div class="actions">${e.zoom ? `<a class="btn ${live ? '' : 'quiet'}" href="${esc(e.zoom)}" target="_blank" rel="noopener">Join Zoom</a>` : ''}${reg ? `<a class="btn ghost" href="${esc(reg)}" target="_blank" rel="noopener">Register</a>` : ''}</div>` : ''}
              ${e.notes ? `<details><summary>Details</summary><p>${linkify(e.notes)}</p></details>` : ''}
            </div></div>`;
        }).join('')}
      </div>`).join('') : '<p class="muted">Nothing on the calendar in the next few weeks.</p>';
  }
  return `${topbar('Rigdzin community')}
  <h1>Sangha</h1>
  <p class="lede">Practicing with others. Times are in your time zone (${esc(tz)}), synced daily from the community calendar.</p>
  <div class="btn-row" style="margin-top:16px">
    <a class="btn quiet" href="${esc(C.links.calendarSubscribe)}">Add calendar to iPhone</a>
    <a class="btn ghost" href="${esc(C.links.offeringsDoc)}" target="_blank" rel="noopener">Retreats & eligibility</a>
  </div>
  <section class="section">
    <div class="filter" role="group" aria-label="Filter events">
      <button data-f="you" aria-pressed="${f === 'you'}">Open to you</button>
      <button data-f="all" aria-pressed="${f === 'all'}">All sessions</button>
    </div>
    ${list}
  </section>
  <section class="section">
    <p class="eyebrow">Work one-on-one</p>
    <p class="muted" style="margin-top:0">Sessions of 25 or 50 minutes with a Teaching Assistant. Working 1:1 also opens community meditations and the WhatsApp community.</p>
    <div class="cards">${C.teachers.map((t) => `
      <div class="card teacher"><h3>${esc(t.name)}</h3><span class="where">${esc(t.place)}</span><p>${esc(t.bio)}</p>
        <div class="btn-row"><a class="btn" href="${esc(t.calendly)}" target="_blank" rel="noopener">Book a session</a><a class="btn ghost" href="mailto:${esc(t.email)}">Email</a></div></div>`).join('')}
    </div>
  </section>
  <section class="section">
    <p class="eyebrow">Ways to continue</p>
    <ul class="link-list">${C.offerings.map((o) => `<li style="padding:14px 0"><b style="font-weight:600">${esc(o.name)}</b><p class="muted small" style="margin:4px 0 0">${esc(o.detail)}</p></li>`).join('')}</ul>
  </section>`;
}
function dayLabel(d) {
  const k = dayKey(d), t = new Date(); const tm = new Date(); tm.setDate(t.getDate() + 1);
  if (k === dayKey(t)) return 'Today';
  if (k === dayKey(tm)) return 'Tomorrow';
  return new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/* ---------------- library ---------------- */
function viewLibrary() {
  const pos = store.get('readPos', null);
  const L = C.links;
  const ext = (href, title, sub) => `<li><a href="${esc(href)}" target="_blank" rel="noopener"><span>${esc(title)}<small>${esc(sub)}</small></span></a></li>`;
  return `${topbar('Study')}
  <h1>Library</h1>
  ${C.hasBook ? `<section class="section">
    <p class="eyebrow">Reading</p>
    <button class="book-hero" data-open-book>
      <div class="cover">Lamp of Wisdom</div>
      <div><span class="muted small">Dustin DiPerna</span><h3 style="margin-top:2px">Lamp of Wisdom</h3>
        <span class="muted small">${pos ? `Continue · ${pos.ch < 0 ? 'Contents' : pos.label}` : 'A Modern Guide to the Gradual Path of Enlightenment'}</span>
        <div class="progress"><i style="width:${Math.round((pos?.total || 0) * 100)}%"></i></div></div>
    </button>
  </section>` : ''}
  <section class="section">
    <p class="eyebrow">From the retreat</p>
    <ul class="link-list">
      ${ext(L.lineagePdf, 'Transmission Lineage', 'Lineage, posture, Nine Stages (PDF)')}
      ${ext(L.offeringsDoc, 'Upcoming offerings', 'Retreats, 1:1 sessions, groups')}
      ${ext(L.healing, 'Healing & integration support', 'Recommended practitioners')}
      ${ext(L.followUpDoc, 'Follow-up resources', 'The original document')}
    </ul>
  </section>
  <section class="section">
    <p class="eyebrow">Recommended reading</p>
    ${['Introductory', 'Intermediate'].map((lv) => `<p class="group-label">${lv}</p><ul class="link-list">${C.books.filter((b) => b.level === lv).map((b) => ext(b.url, b.title, b.author)).join('')}</ul>`).join('')}
  </section>
  <section class="section">
    <p class="eyebrow">Questions</p>
    <p style="margin:0">Write to <a href="mailto:${esc(L.support)}">${esc(L.support)}</a>.</p>
  </section>`;
}

/* ---------------- reader ---------------- */
const TONES = [['auto', 'Auto'], ['paper', 'Paper'], ['sepia', 'Sepia'], ['night', 'Night']];
async function openReader() {
  const el = document.createElement('div');
  el.className = 'reader'; el.id = 'reader';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Lamp of Wisdom');
  el.innerHTML = '<p class="muted" style="text-align:center;margin-top:40vh">Opening…</p>';
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  applyReaderPrefs();
  try { BOOK ||= await V.loadJSON(KEY, 'vault/book.bin'); }
  catch { el.innerHTML = `<div class="reader-bar"><button class="icon-btn" data-r="close" aria-label="Close">${I.close}</button></div><p style="text-align:center">Couldn’t open the book. Check your connection.</p>`; bindReader(); return; }
  const pos = store.get('readPos', { ch: -1, y: 0 });
  drawChapter(pos.ch, pos.y);
  bindReader();
}
function applyReaderPrefs() {
  const el = document.getElementById('reader'); if (!el) return;
  const p = store.get('readPrefs', { fs: 19, tone: 'auto' });
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  el.dataset.tone = p.tone === 'auto' ? (dark ? 'night' : 'paper') : p.tone;
  el.style.setProperty('--fs', `${p.fs}px`);
}
function blockHtml(b, ch) {
  if (b.t === 'img') return b.emblem ? `<img class="emblem" src="${BOOK.images[b.src]}" alt="">` : `<figure><img src="${BOOK.images[b.src]}" alt="Illustration from the book" loading="lazy"></figure>`;
  if (b.t === 'table') return `<div class="table-wrap"><table><thead><tr>${b.rows[0].map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (b.t === 'h2' || b.t === 'h3') return `<${b.t}>${b.html}</${b.t}>`;
  if (b.t === 'li') return `<li>${b.html}</li>`;
  return `<p>${b.html}</p>`;
}
function drawChapter(ci, frac = 0) {
  const el = document.getElementById('reader');
  const n = BOOK.chapters.length;
  ci = Math.max(-1, Math.min(n - 1, ci));
  el.dataset.ch = ci;
  const ch = BOOK.chapters[ci];
  const label = ci < 0 ? 'Contents' : ch.n ? `Ch. ${ch.n} · ${ch.title}` : ch.title;
  let body = '';
  if (ci < 0) {
    const cur = store.get('readPos', null)?.ch;
    body = `<p class="ch-num">Dustin DiPerna</p><h1>${esc(BOOK.title)}</h1>
      <p style="text-align:center;font-style:italic;text-indent:0;color:var(--read-muted)">${esc(BOOK.subtitle)}</p>
      <p style="text-indent:0;margin:28px 0;font-size:.82em;color:var(--read-muted);font-family:var(--sans);line-height:1.5">A restricted text for students who have completed a Rigdzin introductory retreat. Please do not distribute or share. © 2025 Dustin DiPerna.</p>
      ${BOOK.dedication ? `<p style="text-indent:0;font-style:italic;text-align:center;margin-bottom:32px">${esc(BOOK.dedication)}</p>` : ''}
      <ol class="toc">${BOOK.chapters.map((c, i) => `<li><button data-go="${i}" ${i === cur ? 'aria-current="true"' : ''}><span>${c.n ?? '·'}</span><span>${esc(c.title)}</span></button></li>`).join('')}</ol>`;
  } else {
    let inList = false;
    const parts = [];
    for (const b of ch.blocks) {
      if (b.t === 'li' && !inList) { parts.push('<ul>'); inList = true; }
      if (b.t !== 'li' && inList) { parts.push('</ul>'); inList = false; }
      parts.push(blockHtml(b, ch));
    }
    if (inList) parts.push('</ul>');
    body = `<p class="ch-num">${ch.n ? `Chapter ${ch.n}` : 'Lamp of Wisdom'}</p><h1>${esc(ch.title)}</h1>${parts.join('')}
      <div class="chapter-nav">
        ${ci < n - 1 ? `<button class="btn" data-go="${ci + 1}">Next: ${esc(BOOK.chapters[ci + 1].title)}</button>` : ''}
        <button class="btn" data-go="-1">Contents</button>
      </div>`;
  }
  el.innerHTML = `
    <div class="reader-bar">
      <button class="icon-btn" data-r="close" aria-label="Close book">${I.close}</button>
      <span class="where">${esc(label)}</span>
      <button class="icon-btn" data-r="type" aria-label="Text settings">${I.type}</button>
      <button class="icon-btn" data-go="-1" aria-label="Contents">${I.list}</button>
    </div>
    <article class="page">${body}</article>
    <div class="reader-progress"><i id="rp"></i></div>`;
  el.dataset.notes = ci >= 0 ? JSON.stringify(ch.notes || {}) : '{}';
  requestAnimationFrame(() => { el.scrollTop = frac * Math.max(0, el.scrollHeight - el.clientHeight); savePos(); });
}
function savePos() {
  const el = document.getElementById('reader'); if (!el || !BOOK) return;
  const ci = Number(el.dataset.ch);
  const max = Math.max(1, el.scrollHeight - el.clientHeight);
  const y = Math.min(1, el.scrollTop / max);
  const n = BOOK.chapters.length;
  const ch = BOOK.chapters[ci];
  const prev = store.get('readPos', {});
  const total = ci < 0 ? (prev.total || 0) : (ci + y) / n;
  store.set('readPos', { ch: ci, y, total, label: ci < 0 ? 'Contents' : ch.n ? `Chapter ${ch.n} · ${Math.round(y * 100)}%` : ch.title });
  const rp = document.getElementById('rp'); if (rp) rp.style.width = `${y * 100}%`;
}
function bindReader() {
  const el = document.getElementById('reader');
  let lastY = 0, t;
  el.addEventListener('scroll', () => {
    const y = el.scrollTop;
    el.classList.toggle('hide-chrome', y > lastY + 4 && y > 80);
    if (y < lastY - 4) el.classList.remove('hide-chrome');
    lastY = y;
    clearTimeout(t); t = setTimeout(savePos, 250);
  }, { passive: true });
  el.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    const r = e.target.closest('[data-r]');
    const sup = e.target.closest('sup[data-fn]');
    document.querySelector('.footnote-pop')?.remove();
    if (go) { drawChapter(Number(go.dataset.go), 0); document.querySelector('.type-panel')?.remove(); return; }
    if (sup) {
      const note = JSON.parse(el.dataset.notes || '{}')[sup.dataset.fn];
      if (note) el.insertAdjacentHTML('beforeend', `<div class="footnote-pop" role="note"><b style="font-family:var(--sans);font-size:13px">${esc(sup.dataset.fn)}.</b> ${note}</div>`);
      return;
    }
    if (r?.dataset.r === 'close') { savePos(); el.remove(); document.body.style.overflow = ''; if (route() === 'library') render(); return; }
    if (r?.dataset.r === 'type') { toggleTypePanel(); return; }
    const tp = e.target.closest('.type-panel');
    if (tp) {
      const p = store.get('readPrefs', { fs: 19, tone: 'auto' });
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fs) p.fs = Math.max(15, Math.min(26, p.fs + Number(b.dataset.fs)));
      if (b.dataset.tone) p.tone = b.dataset.tone;
      store.set('readPrefs', p); applyReaderPrefs(); toggleTypePanel(true);
      return;
    }
    document.querySelector('.type-panel')?.remove();
  });
}
function toggleTypePanel(refresh) {
  const el = document.getElementById('reader');
  const open = el.querySelector('.type-panel');
  if (open) { open.remove(); if (!refresh) return; }
  const p = store.get('readPrefs', { fs: 19, tone: 'auto' });
  el.insertAdjacentHTML('beforeend', `<div class="type-panel">
    <div class="seg" role="group" aria-label="Text size"><button data-fs="-1" aria-label="Smaller text">A−</button><button disabled>${p.fs}px</button><button data-fs="1" aria-label="Larger text">A+</button></div>
    <div class="seg" role="group" aria-label="Page tone">${TONES.map(([k, l]) => `<button data-tone="${k}" aria-pressed="${p.tone === k}">${l}</button>`).join('')}</div>
  </div>`);
}

/* ---------------- settings ---------------- */
function applyTheme() {
  const t = store.get('theme', 'system');
  if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14120f' : '#f4efe6');
}

async function openSettings(focus) {
  const el = document.createElement('div');
  el.className = 'sheet'; el.id = 'settings';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Settings');
  const name = store.get('quietName', 'Meditate');
  const theme = store.get('theme', 'system');
  el.innerHTML = `<div class="view">
    <div class="topbar"><p class="eyebrow">Settings</p><button class="icon-btn" data-s="close" aria-label="Close">${I.close}</button></div>

    <section class="section" id="quiet" style="margin-top:12px">
      <h2>Quiet mode</h2>
      <p class="muted">A website can’t switch on Do Not Disturb by itself, but it can ask an iPhone Shortcut to. Set this up once, and every session gets a “Silence notifications” button that turns on Do Not Disturb for the length of the meditation plus five minutes, then brings you back here.</p>
      <ol class="steps">
        <li>Open the <b>Shortcuts</b> app and tap <b>+</b>. Name the shortcut <span class="code">${esc(name)}</span>.</li>
        <li>Add the action <b>Adjust Date</b>. Set it to <b>Add</b>, tap the number and choose <b>Shortcut Input</b>, set the unit to <b>minutes</b>, and the date to <b>Current Date</b>.</li>
        <li>Add the action <b>Set Focus</b>. Make it read: <i>Turn Do Not Disturb On until Time</i>, and pick <b>Adjusted Date</b> as the time.</li>
        <li>Tap <b>Done</b>. (A “Receive input” line may appear at the top. Leave it as it is.)</li>
        <li>Come back here and switch on quiet mode below. The first time you use it, iOS asks permission to run the shortcut; choose <b>Always Allow</b>.</li>
      </ol>
      <p class="muted small">If Adjust Date won’t accept Shortcut Input, add <b>Get Numbers from Input</b> first and use its result. To let true emergencies through, open Settings › Focus › Do Not Disturb and allow calls from Favorites and repeated calls.</p>
      <div class="toggle"><span>Quiet mode button<br><small class="muted">I’ve created the shortcut</small></span>
        <label class="switch"><input type="checkbox" id="quietOn" ${store.get('quietOn', false) ? 'checked' : ''} aria-label="Quiet mode button"><span></span></label></div>
      <label class="small muted" for="quietName" style="display:block;margin-top:14px">Shortcut name</label>
      <input class="field" id="quietName" value="${esc(name)}" style="text-align:left;margin-top:6px" autocapitalize="none">
      <p class="muted small">No shortcut? Swipe down from the top right, tap <b>Focus</b>, then the <b>…</b> beside Do Not Disturb, and choose <b>For 1 hour</b>.</p>
    </section>

    <section class="section">
      <h2>Offline</h2>
      <p class="muted">Each recording saves itself after its first play. You can save them all now, on Wi-Fi, so practice works anywhere.</p>
      <div class="btn-row"><button class="btn" data-s="save-all">Save all recordings</button><button class="btn ghost" data-s="clear">Remove downloads</button></div>
      <p class="muted small" id="store-info"></p>
      <p class="muted small">Tip: if you don’t open this site for a few weeks, Safari may clear its downloads. Bookmark it in Safari’s Favorites to reach it in one tap.</p>
    </section>

    <section class="section">
      <h2>Appearance</h2>
      <div class="seg" role="group" aria-label="Theme">${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button data-theme="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div>
    </section>

    <section class="section">
      <h2>Privacy</h2>
      <p class="muted">Everything on this site is stored encrypted. Your passphrase is remembered only on this device.</p>
      <button class="btn ghost" data-s="lock">Lock and forget on this device</button>
    </section>
  </div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  if (focus) el.querySelector(`#${focus}`)?.scrollIntoView();
  const info = el.querySelector('#store-info');
  const refreshInfo = async () => { const u = await V.storageUsed(); info.textContent = u ? `Using about ${mb(u)} on this device.` : ''; };
  refreshInfo();

  el.querySelector('#quietOn').addEventListener('change', (e) => store.set('quietOn', e.target.checked));
  el.querySelector('#quietName').addEventListener('change', (e) => store.set('quietName', e.target.value.trim() || 'Meditate'));
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.theme) {
      store.set('theme', b.dataset.theme); applyTheme();
      el.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    }
    const s = b.dataset.s;
    if (s === 'close') { el.remove(); document.body.style.overflow = ''; render(); }
    if (s === 'clear') { await V.clearAudio(); refreshInfo(); b.textContent = 'Removed'; }
    if (s === 'lock') { V.forgetKey(); await V.clearAudio(); location.reload(); }
    if (s === 'save-all') {
      b.disabled = true;
      try {
        for (const [i, r] of C.recordings.entries()) {
          await V.getBytes(`vault/${r.id}.bin`, (p) => { b.textContent = `Saving ${i + 1} of ${C.recordings.length} · ${Math.round(p * 100)}%`; }, r.bytes);
        }
        b.textContent = 'All saved';
      } catch { b.textContent = 'Stopped. Try again on Wi-Fi'; b.disabled = false; }
      refreshInfo();
    }
  });
}
