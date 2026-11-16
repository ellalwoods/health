/* Astra: a symptom tracker for period pain and everything that comes with it.
 * Vanilla JS, no build step. Screens live in the URL hash: #today, #pain/2026-11-15/new, #day/2026-11-15,
 * #cal/2026-11, #summary, #doctor, #report, #settings, #hello.
 * State is kept in localStorage and synced through Supabase (see cloud-config.js and supabase/astra.sql). */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const PALS = window.ASTRA_PALETTES, BODY = window.ASTRA_BODY, XL = window.ASTRA_XLSX;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  /* ---------------- dates (local, as 'YYYY-MM-DD' keys) ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const dk = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const kd = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const dn = k => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const addK = (k, n) => { const d = kd(k); d.setDate(d.getDate() + n); return dk(d); };
  const todayK = () => dk(new Date());
  const isKey = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '');
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtShort = k => { const d = kd(k); return `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()].slice(0, 3)}`; };
  const fmtLong = k => { const d = kd(k); return `${WDL[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`; };
  const fmtDM = k => { const d = kd(k); return `${d.getDate()} ${MO[d.getMonth()].slice(0, 3)}`; };
  const fmtDMY = k => { const d = kd(k); return `${d.getDate()} ${MO[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
  const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)}${h < 12 ? 'am' : 'pm'}`; };
  const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  /* ---------------- symptom classes ----------------
   * kind: 'one' (pick one), 'multi' (pick any), 'score' (a number), 'text' (free text).
   * Ids are saved in logs: don't rename them. Labels and options can be changed in the app. */
  const DEFAULT_CLASSES = [
    { id: 'bleed', label: 'Bleeding', kind: 'one', options: ['Spotting', 'Light', 'Medium', 'Heavy'] },
    { id: 'clots', label: 'Clots', kind: 'one', options: ['Small', 'Large'] },
    { id: 'bowel', label: 'Bowel', kind: 'multi', options: ['Loose', 'Urgent', 'Constipated', 'Painful', 'Bloating', 'Gas'] },
    { id: 'urine', label: 'Urinary', kind: 'multi', options: ['Burning', 'Frequent', 'Urgent', 'Pain', 'Cloudy', 'Blood'] },
    { id: 'head', label: 'Headache', kind: 'multi', options: ['Tension', 'Throbbing', 'Migraine', 'Behind the eyes'] },
    { id: 'nausea', label: 'Nausea & dizzy', kind: 'multi', options: ['Nausea', 'Light-headed', 'Cold/Shivering', 'Hot flushes', 'Vomiting', 'Faint'] },
    { id: 'heart', label: 'Heart', kind: 'multi', options: ['Palpitations', 'Racing'], note: 'Heart rate readings, e.g. 97, 103 (4–5pm)' },
    { id: 'sleep', label: 'Sleep', kind: 'score', max: 100, note: 'Sleep score from your watch' },
    { id: 'fatigue', label: 'Fatigue', kind: 'one', options: ['Low', 'Moderate', 'High'] },
    { id: 'stress', label: 'Stress', kind: 'one', options: ['Low', 'Moderate', 'High'] },
    { id: 'food', label: 'Food', kind: 'multi', options: ['Normal', 'Light', 'Skipped meals', 'Sugar/chocolate', 'Caffeine', 'Alcohol'] },
    { id: 'act', label: 'Activity', kind: 'one', options: ['None', 'Light', 'Moderate', 'Hard'] },
    { id: 'treat', label: 'Treatment', kind: 'multi', options: ['Heat wheat', 'Panadol', 'Nurofen', 'Rest', 'Bath', 'Stretching'], note: 'What you took, and whether it helped' },
    { id: 'impact', label: 'Day impact', kind: 'one', options: ['None', 'Minor', 'Moderate', 'Severe — couldn’t function'] },
    { id: 'note', label: 'Notes', kind: 'text' },
  ];
  const DEFAULT_PAIN_TYPES = ['Cramping', 'Sharp', 'Stabbing', 'Dull ache', 'Throbbing', 'Burning', 'Pulling'];
  const SEV = ['Mild', 'Moderate', 'Severe'];
  const FLOW = ['Light', 'Medium', 'Heavy'];

  /* ---------------- state ---------------- */
  const KEY = 'astra.state', SKEY = 'astra.sync', LKEY = 'astra.local';
  const blankCfg = () => ({ palette: 'bright', over: {}, custom: [], painTypes: null, hidden: [], name: '', _at: 0 });
  const blank = () => ({ app: 'astra', v: 1, days: {}, starts: {}, cfg: blankCfg() });
  let S = Object.assign(blank(), store.get(KEY, {}));
  S.cfg = Object.assign(blankCfg(), S.cfg);
  let saveTimer = null;
  function save() { store.set(KEY, S); cloudPush(); }
  function touchCfg() { S.cfg._at = Date.now(); save(); }
  const day = k => S.days[k];
  function dayW(k) { // a day to write to
    if (!S.days[k]) S.days[k] = { pain: [], sym: {}, _at: 0 };
    S.days[k].pain = S.days[k].pain || []; S.days[k].sym = S.days[k].sym || {};
    return S.days[k];
  }
  function touchDay(k) { const d = dayW(k); d._at = Date.now(); save(); }
  const hasData = d => d && ((d.pain && d.pain.length) || (d.sym && Object.keys(d.sym).length));

  function classes() {
    const list = DEFAULT_CLASSES.map(c => Object.assign({}, c, S.cfg.over[c.id] || {}));
    for (const c of S.cfg.custom || []) list.push(Object.assign({ kind: 'multi', options: [] }, c, S.cfg.over[c.id] || {}));
    return list;
  }
  const cls = id => classes().find(c => c.id === id);
  const visibleClasses = () => classes().filter(c => !S.cfg.hidden.includes(c.id));
  const painTypes = () => S.cfg.painTypes || DEFAULT_PAIN_TYPES;
  const pal = () => PALS.find(p => p.id === S.cfg.palette) || PALS[0];
  const ccol = id => { const i = classes().findIndex(c => c.id === id); const p = pal(); return id === 'pain' ? p.acc : p.c[(i < 0 ? 0 : i) % p.c.length]; };
  function setOver(id, patch) { // change a class's label/options
    if (id === 'pain') { if (patch.options) S.cfg.painTypes = patch.options; touchCfg(); return; }
    S.cfg.over[id] = Object.assign({}, S.cfg.over[id] || {}, patch);
    const cu = (S.cfg.custom || []).find(c => c.id === id); if (cu) Object.assign(cu, patch);
    touchCfg();
  }

  /* value of a class on a day, as text */
  function symText(id, e) {
    if (!e) return '';
    const c = cls(id) || { kind: 'multi' };
    let v = e.v;
    let t = Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v));
    if (c.kind === 'score' && t) t = `${t}${c.max ? '/' + c.max : ''}`;
    if (e.note) t = t ? `${t} (${e.note})` : e.note;
    return t;
  }
  const flowOf = d => d && d.sym && d.sym.bleed ? d.sym.bleed.v : null;
  const isFlow = d => FLOW.includes(flowOf(d));
  const bleeds = d => !!flowOf(d);
  const maxSev = d => d && d.pain && d.pain.length ? Math.max(...d.pain.map(p => p.sev ?? 0)) : null;

  /* ---------------- cycle ----------------
   * A new cycle starts on the first day of real flow (Light/Medium/Heavy) with no other start in the 15 days before,
   * plus any day you mark as "period started". You can also unmark an automatic start. */
  function cycleStarts() {
    const on = [], off = new Set();
    for (const [k, v] of Object.entries(S.starts)) { if (v && v.on) on.push(k); else off.add(k); }
    const starts = [...new Set(on)].sort();
    for (const k of Object.keys(S.days).filter(k => isFlow(S.days[k])).sort()) {
      if (off.has(k)) continue;
      const n = dn(k);
      if (starts.some(s => { const d = n - dn(s); return d >= 0 && d < 15; })) continue;
      if (starts.some(s => { const d = dn(s) - n; return d > 0 && d <= 4; })) continue;
      starts.push(k); starts.sort();
    }
    return starts;
  }
  function cycleStats(starts) {
    const lens = [];
    for (let i = 1; i < starts.length; i++) { const l = dn(starts[i]) - dn(starts[i - 1]); if (l >= 18 && l <= 45) lens.push(l); }
    const recent = lens.slice(-6);
    const avg = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 28;
    return { lens, avg, known: recent.length > 0 };
  }
  function cycleInfo(k, starts = cycleStarts()) {
    const s = [...starts].reverse().find(x => x <= k);
    if (!s) return null;
    const { avg, known } = cycleStats(starts);
    const day = dn(k) - dn(s) + 1;
    let periodLen = 0;
    for (let i = 0; i < 10; i++) { const kk = addK(s, i); if (bleeds(S.days[kk])) periodLen = i + 1; }
    if (!periodLen) periodLen = 5;
    const ov = avg - 14;
    const phase = day <= periodLen ? 'Period' : day < ov - 1 ? 'Follicular' : day <= ov + 1 ? 'Ovulation (estimate)' : 'Luteal';
    const next = addK(s, avg);
    return { start: s, day, avg, known, periodLen, phase, next, len: Math.max(avg, day) };
  }

  /* ---------------- sync (Supabase) ----------------
   * You sign in with your name, a hot-water bottle and a tea. Only a SHA-256 hash of them is sent, as the row id.
   * Each day, each period start and the settings carry the time they last changed (_at); the newer copy of each wins. */
  const CLOUD = window.ASTRA_CLOUD || {};
  const cloudOn = !!(CLOUD.url && CLOUD.key);
  let SYNC = store.get(SKEY, null);
  let syncState = '';
  const normName = n => String(n || '').toLowerCase().trim().replace(/\s+/g, ' ');
  async function loginId(name, bottle, tea) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('astra:' + normName(name) + '|' + bottle + '-' + tea));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function rpc(fn, args) {
    const r = await fetch(`${CLOUD.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: CLOUD.key, ...(CLOUD.key.startsWith('eyJ') ? { Authorization: `Bearer ${CLOUD.key}` } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) { const e = new Error(`sync ${fn} ${r.status}`); e.status = r.status; throw e; }
    return r.json();
  }
  function merge(remote) {
    if (!remote) return false;
    let changed = false;
    for (const [k, v] of Object.entries(remote.days || {})) if (!S.days[k] || (v._at || 0) > (S.days[k]._at || 0)) { S.days[k] = v; changed = true; }
    for (const [k, v] of Object.entries(remote.starts || {})) if (!S.starts[k] || (v._at || 0) > (S.starts[k]._at || 0)) { S.starts[k] = v; changed = true; }
    if (remote.cfg && (remote.cfg._at || 0) > (S.cfg._at || 0)) { S.cfg = Object.assign(blankCfg(), remote.cfg); changed = true; }
    store.set(KEY, S);
    return changed;
  }
  function localNewer(remote) {
    if (!remote) return true;
    for (const [k, v] of Object.entries(S.days)) if (!remote.days || !remote.days[k] || (v._at || 0) > (remote.days[k]._at || 0)) return true;
    for (const [k, v] of Object.entries(S.starts)) if (!remote.starts || !remote.starts[k] || (v._at || 0) > (remote.starts[k]._at || 0)) return true;
    return (S.cfg._at || 0) > ((remote.cfg && remote.cfg._at) || 0);
  }
  let pushTimer = null, pushing = Promise.resolve();
  function cloudPush(now) {
    if (!cloudOn || !SYNC) return;
    clearTimeout(pushTimer);
    const run = () => (pushing = pushing.then(async () => {
      try { const ok = await rpc('astra_save', { p_id: SYNC.id, p_state: S, p_create: false }); syncDone(ok ? '' : 'error'); }
      catch (e) { syncDone('error'); }
    }));
    if (now) return run();
    pushTimer = setTimeout(run, 1200);
  }
  function syncDone(st) {
    syncState = st;
    if (!st && SYNC) { SYNC.at = Date.now(); store.set(SKEY, SYNC); }
    const el = document.getElementById('syncstat'); if (el) el.innerHTML = syncLine();
  }
  async function cloudPull() {
    if (!cloudOn || !SYNC) return;
    try {
      const res = await rpc('astra_load', { p_id: SYNC.id });
      const remote = res && res.state;
      const changed = merge(remote);
      syncDone('');
      if (changed && !editing()) { applyPalette(); render(); }
      if (localNewer(remote)) cloudPush(true);
    } catch (e) { syncDone('error'); }
  }
  async function signIn(name, bottle, tea, create) {
    const id = await loginId(name, bottle, tea), who = { id, name: name.trim(), bottle, tea };
    if (!create) {
      const res = await rpc('astra_load', { p_id: id });
      if (!res || !res.state) return 'missing';
      merge(res.state); SYNC = who; store.set(SKEY, SYNC); store.del(LKEY); await cloudPush(true); return 'joined';
    }
    S.cfg._at = S.cfg._at || Date.now(); store.set(KEY, S);
    const ok = await rpc('astra_save', { p_id: id, p_state: S, p_create: true });
    if (!ok) throw new Error('exists');
    SYNC = who; store.set(SKEY, SYNC); store.del(LKEY); syncDone(''); return 'created';
  }
  function syncLine() {
    if (!SYNC) return `<span class="sdot"></span>Not syncing: everything stays on this device.`;
    if (syncState === 'error') return `<span class="sdot err"></span>Couldn’t reach the sync server. Changes are kept here and sync when you’re back online.`;
    if (!SYNC.at) return `<span class="sdot"></span>Sync is on.`;
    const mins = Math.round((Date.now() - SYNC.at) / 60000);
    return `<span class="sdot ok"></span>Synced ${mins < 1 ? 'just now' : mins < 60 ? mins + ' min ago' : new Date(SYNC.at).toLocaleString()}.`;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cloudPush(true); else cloudPull(); });
  window.addEventListener('online', () => cloudPull());

  /* ---------------- look ---------------- */
  function applyPalette() {
    const p = pal(), r = document.documentElement.style;
    for (const k of ['bg', 'card', 'ink', 'soft', 'hair', 'acc', 'btn', 'btnFg', 'bleed']) r.setProperty('--' + k, p[k]);
    p.sev.forEach((c, i) => r.setProperty('--sev' + i, c));
    document.documentElement.classList.toggle('dark', p.id === 'night');
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = p.bg;
  }
  const star4 = (cx, cy, r, f) => `<path d="M${cx} ${cy - r} Q${cx + r * .16} ${cy - r * .16} ${cx + r} ${cy} Q${cx + r * .16} ${cy + r * .16} ${cx} ${cy + r} Q${cx - r * .16} ${cy + r * .16} ${cx - r} ${cy} Q${cx - r * .16} ${cy - r * .16} ${cx} ${cy - r}Z" fill="${f}"/>`;
  const logo = (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true">${star4(20, 20, 16, 'var(--acc)')}</svg>`;
  const ICO = {
    today: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>',
    cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    sum: '<path d="M5 19V11M10 19V5M15 19v-6M20 19V9"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 13h5M10 17h5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const icon = (k, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${ICO[k]}</svg>`;
  const TABS = [['today', 'Today', '#today'], ['cal', 'Calendar', '#cal'], ['sum', 'Summary', '#summary'], ['doc', 'Doctor', '#doctor']];
  const tabs = (on, deskOnly) => `<nav class="tabs ${deskOnly ? 'desk-only' : ''}"><a class="side-wm" href="#today">${logo(22)}<span>Astra</span></a>${TABS.map(([k, l, h]) => `<a href="${h}" class="${k === on ? 'on' : ''}">${icon(k, 21)}<span>${l}</span></a>`).join('')}<a href="#settings" class="side-set ${on === 'set' ? 'on' : ''}">${icon('gear', 21)}<span>Settings</span></a></nav>`;
  const header = (right = `<a class="iconbtn" href="#settings" aria-label="Settings">${icon('gear', 20)}</a>`) =>
    `<header class="hd main"><a class="wm" href="#today">${logo(19)}<span>Astra</span></a><span class="r">${right}</span></header>`;
  const sevTag = s => `<span class="sev" style="--s:var(--sev${s})"><i></i>${SEV[s]}</span>`;
  const spotsOf = (logs, side) => {
    const o = {};
    for (const l of logs) for (const r of l.regions || []) if (!side || r[0] === side) o[r] = Math.max(o[r] ?? -1, l.sev ?? 0);
    return o;
  };
  const mini = (log, w = 20, p = pal()) => `<span class="bd">${BODY.svg('F', spotsOf([log]), w, p, { thin: 1 })}${BODY.svg('B', spotsOf([log]), w, p, { thin: 1 })}</span>`;
  const whereText = l => (l.regions || []).slice().sort((a, b) => BODY.ORDER.indexOf(a) - BODY.ORDER.indexOf(b)).map(BODY.label).join(', ');

  function movedLine(logs) {
    const ls = logs.filter(l => (l.regions || []).length).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    if (ls.length < 2) return '';
    const parts = [];
    for (const l of ls) { const w = whereText(l); if (parts[parts.length - 1] !== w) parts.push(w); }
    if (parts.length < 2) return '';
    return `<div class="moved"><span aria-hidden="true">↻</span><span>Moved: ${parts.map(p => `<b>${esc(p)}</b>`).join(' → ')}</span></div>`;
  }

  function ring(info, size = 168) {
    const p = pal(), c = size / 2, r = size / 2 - 13;
    if (!info) {
      let o = ''; for (let i = 0; i < 28; i++) { const a = i / 28 * 2 * Math.PI - Math.PI / 2, x = c + r * Math.cos(a), y = c + r * Math.sin(a);
        o += `<rect x="${(x - 2.7).toFixed(1)}" y="${(y - 2.7).toFixed(1)}" width="5.4" height="5.4" rx="1.8" fill="${p.hair}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }
      return `<svg width="${size}" height="${size}" aria-hidden="true">${o}</svg>`;
    }
    let o = '';
    for (let i = 1; i <= info.len; i++) {
      const a = (i - 1) / info.len * 2 * Math.PI - Math.PI / 2, x = c + r * Math.cos(a), y = c + r * Math.sin(a), k = addK(info.start, i - 1);
      if (i === info.day) { o += star4(+x.toFixed(1), +y.toFixed(1), 11, p.ink); continue; }
      const per = bleeds(S.days[k]) || (i <= info.periodLen && i > info.day);
      const logged = hasData(S.days[k]);
      const s = per ? 8.5 : 6;
      o += `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s}" height="${s}" rx="2" fill="${per ? (i > info.day ? 'none' : p.acc) : logged ? p.soft : p.hair}"${per && i > info.day ? ` stroke="${p.acc}" stroke-width="1.4"` : ''} opacity="${!per && logged ? .55 : 1}" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return `<svg width="${size}" height="${size}" aria-hidden="true">${o}</svg>`;
  }

  /* ---------------- sheets (pop-ups) ---------------- */
  function sheet(html, onClick) {
    closeSheet();
    const w = document.createElement('div');
    w.className = 'sheetwrap';
    w.innerHTML = `<div class="dim" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    document.body.appendChild(w);
    w.addEventListener('click', e => { if (e.target.closest('[data-close]')) { closeSheet(); return; } onClick && onClick(e, w); });
    requestAnimationFrame(() => w.classList.add('in'));
    const f = w.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 50);
    return w;
  }
  function closeSheet() { document.querySelectorAll('.sheetwrap').forEach(x => x.remove()); }
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.classList.add('in'), 10); setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600);
  }
  function confirmSheet(title, body, yes, onYes, danger) {
    sheet(`<h3 class="sh">${esc(title)}</h3><p class="sub">${body}</p><div class="two" style="margin-top:16px"><button class="btn ghost" data-close>Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-yes>${esc(yes)}</button></div>`,
      (e) => { if (e.target.closest('[data-yes]')) { closeSheet(); onYes(); } });
  }

  /* ---------------- edit options (for a class, or pain types) ---------------- */
  function editOptions(id, after) {
    const isPain = id === 'pain';
    const c = isPain ? { id: 'pain', label: 'Pain type', kind: 'multi', options: painTypes() } : cls(id);
    const custom = !isPain && (S.cfg.custom || []).some(x => x.id === id);
    const hasOpts = c.kind === 'one' || c.kind === 'multi';
    const draw = () => {
      const opts = isPain ? painTypes() : cls(id).options || [];
      return `<div class="shead"><h3 class="sh">Edit ${esc(isPain ? 'pain types' : cls(id).label)}</h3><button class="link" data-close>Done</button></div>
      ${isPain ? '' : `<label class="fl">Name<input class="inp" data-label value="${esc(cls(id).label)}"></label>`}
      ${hasOpts ? `<p class="sub" style="margin:10px 0 4px">Add, rename, reorder or delete options. Renaming also updates days you’ve already logged.</p>
      <div class="opts">${opts.map((o, i) => `<div class="opt" data-i="${i}"><input class="inp" data-rename="${i}" value="${esc(o)}" aria-label="Option ${i + 1}">
        <button class="ob" data-up="${i}" aria-label="Move up" ${i ? '' : 'disabled'}>↑</button><button class="ob" data-down="${i}" aria-label="Move down" ${i < opts.length - 1 ? '' : 'disabled'}>↓</button><button class="ob x" data-del="${i}" aria-label="Delete ${esc(o)}">✕</button></div>`).join('')}</div>
      <div class="addopt"><input class="inp" data-new placeholder="New option" aria-label="New option"><button class="btn small" data-add>Add</button></div>
      <p class="hint">Deleting an option doesn’t change days you’ve already logged.</p>` : `<p class="sub" style="margin-top:10px">${c.kind === 'score' ? 'A number, like a sleep score.' : 'Free text.'}</p>`}
      ${isPain ? '' : `<div class="two" style="margin-top:14px">${custom ? `<button class="btn ghost danger-t" data-delclass>Delete this class</button>` : `<button class="btn ghost" data-hide>Hide this class</button>`}<button class="btn" data-close>Done</button></div>`}`;
    };
    const w = sheet(draw(), (e) => {
      const t = e.target, opts = (isPain ? painTypes() : cls(id).options || []).slice();
      const redraw = () => { w.querySelector('.sheet').innerHTML = '<div class="grab"></div>' + draw(); after && after(); };
      if (t.dataset.up != null) { const i = +t.dataset.up; [opts[i - 1], opts[i]] = [opts[i], opts[i - 1]]; setOver(id, { options: opts }); redraw(); }
      else if (t.dataset.down != null) { const i = +t.dataset.down; [opts[i + 1], opts[i]] = [opts[i], opts[i + 1]]; setOver(id, { options: opts }); redraw(); }
      else if (t.dataset.del != null) { opts.splice(+t.dataset.del, 1); setOver(id, { options: opts }); redraw(); }
      else if (t.matches('[data-add]')) { const inp = w.querySelector('[data-new]'), v = inp.value.trim(); if (v && !opts.includes(v)) { opts.push(v); setOver(id, { options: opts }); redraw(); w.querySelector('[data-new]').focus(); } }
      else if (t.matches('[data-hide]')) { S.cfg.hidden = [...new Set([...S.cfg.hidden, id])]; touchCfg(); closeSheet(); toast('Hidden. Bring it back in Settings.'); after && after(); }
      else if (t.matches('[data-delclass]')) { confirmSheet('Delete this class?', 'It disappears from the list. Days you’ve already logged keep what you wrote.', 'Delete', () => { S.cfg.custom = S.cfg.custom.filter(x => x.id !== id); touchCfg(); after && after(); }, true); }
    });
    w.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.rename != null) {
        const opts = (isPain ? painTypes() : cls(id).options || []).slice(), i = +t.dataset.rename, old = opts[i], nv = t.value.trim();
        if (!nv || nv === old) { t.value = old; return; }
        opts[i] = nv; setOver(id, { options: opts }); renameEverywhere(id, old, nv); after && after();
      } else if (t.matches('[data-label]')) { const v = t.value.trim(); if (v) { setOver(id, { label: v }); after && after(); } }
    });
    w.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-new]')) { e.preventDefault(); w.querySelector('[data-add]').click(); } });
  }
  function renameEverywhere(id, old, nv) {
    const now = Date.now();
    for (const d of Object.values(S.days)) {
      let hit = false;
      if (id === 'pain') for (const l of d.pain || []) { const i = (l.types || []).indexOf(old); if (i >= 0) { l.types[i] = nv; hit = true; } }
      else if (d.sym && d.sym[id]) { const e = d.sym[id]; if (Array.isArray(e.v)) { const i = e.v.indexOf(old); if (i >= 0) { e.v[i] = nv; hit = true; } } else if (e.v === old) { e.v = nv; hit = true; } }
      if (hit) d._at = now;
    }
    save();
  }
  function newClass(after) {
    const w = sheet(`<h3 class="sh">New symptom class</h3><p class="sub">For anything that isn’t in the list. You can add its options next.</p>
      <label class="fl">Name<input class="inp" data-name placeholder="e.g. Back of legs" autofocus></label>
      <div class="lbl">Type</div>
      <div class="chips" data-kind>${[['multi', 'Choose any'], ['one', 'Choose one'], ['score', 'A number'], ['text', 'A note']].map(([k, l], i) => `<button class="chip ${i ? '' : 'on'}" data-k="${k}">${l}</button>`).join('')}</div>
      <button class="btn" data-make style="margin-top:16px">Create</button>`, (e) => {
      const k = e.target.closest('[data-k]');
      if (k) { w.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === k)); return; }
      if (e.target.matches('[data-make]')) {
        const name = w.querySelector('[data-name]').value.trim(); if (!name) { w.querySelector('[data-name]').focus(); return; }
        const kind = w.querySelector('[data-k].on').dataset.k, id = 'c_' + uid();
        S.cfg.custom = [...(S.cfg.custom || []), { id, label: name, kind, options: [] }]; touchCfg();
        closeSheet(); after && after(id);
        if (kind === 'one' || kind === 'multi') editOptions(id, () => after && after());
      }
    });
  }

  /* ================= screens ================= */
  let current = '', PE = null; // PE: the pain log being edited
  const editing = () => ['pain', 'hello'].includes(current) || !!document.querySelector('.sheetwrap') || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName));

  /* ---------- hello (sign in) ---------- */
  const BOTTLES = ['#f15060', '#ff6c2f', '#e9b12c', '#00a95c', '#159fae', '#0078bf', '#765ba7', '#e8608c'];
  const TEAS = [['Peppermint', '#5f9474'], ['Ginger', '#e48a3a'], ['Chamomile', '#e7c14a'], ['Raspberry leaf', '#c83f78'], ['Black tea', '#5a2e1b'], ['Rooibos', '#b5523b'], ['Green', '#00a95c'], ['Hot choc', '#7a4a2e']];
  const bottleSVG = (c, s = 44) => `<svg width="${s}" height="${s * 54 / 44}" viewBox="0 0 44 54" aria-hidden="true"><rect x="17" y="2" width="10" height="8" rx="2" fill="#1a1a1a"/><rect x="6" y="10" width="32" height="40" rx="11" fill="${c}"/><path d="M12 22 h20 M12 30 h20 M12 38 h20" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/></svg>`;
  const cupSVG = (c, s = 34) => `<svg width="${s}" height="${s * 30 / 34}" viewBox="0 0 34 30" aria-hidden="true"><path d="M4 9 h20 v10 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8z" fill="${c}"/><path d="M24 12 h3 a4 4 0 0 1 0 8 h-3" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M11 2 q2 2 0 4 M16 2 q2 2 0 4" stroke="#bbb" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
  let HELLO = { name: '', bottle: null, tea: null, msg: '', busy: false, missing: false };
  function hello() {
    const H = HELLO, ready = H.name.trim() && H.bottle != null && H.tea != null;
    return `<div class="screen hello">
      <header class="hd"><span class="wm">${logo(22)}<span>Astra</span></span>${SYNC ? '<a class="link" href="#settings">Cancel</a>' : ''}</header>
      <h1 class="ttl big">Hello</h1>
      <p class="sub">Your name, a hot-water bottle and a tea. Pick the same ones on every device and your log follows you.</p>
      <input class="inp name" data-name placeholder="Your name" value="${esc(H.name)}" autocomplete="given-name" aria-label="Your name">
      <div class="lbl">A hot-water bottle</div>
      <div class="bottles">${BOTTLES.map((c, i) => `<button class="pick ${H.bottle === i ? 'on' : ''}" data-bottle="${i}" aria-label="Bottle ${i + 1}">${bottleSVG(c)}</button>`).join('')}</div>
      <div class="lbl">A tea</div>
      <div class="teas">${TEAS.map(([n, c], i) => `<button class="pick tea ${H.tea === i ? 'on' : ''}" data-tea="${i}">${cupSVG(c)}<span>${n}</span></button>`).join('')}</div>
      ${H.msg ? `<p class="msg">${H.msg}</p>` : ''}
      ${H.missing ? `<div class="two" style="margin-top:12px"><button class="btn ghost" data-retry>Try again</button><button class="btn" data-create>Start my Astra</button></div>`
        : `<button class="btn" data-go ${ready && !H.busy ? '' : 'disabled'} style="margin-top:16px">${H.busy ? 'Opening…' : 'Open Astra'}</button>`}
      ${SYNC ? '' : `<button class="link center" data-local>Use without syncing</button>`}
      <p class="hint center">Your name and picks never leave this phone. Only a scrambled code made from them is sent.</p>
    </div>`;
  }
  function helloBind() {
    app.oninput = e => { if (e.target.matches('[data-name]')) { HELLO.name = e.target.value; HELLO.missing = false; HELLO.msg = ''; const b = app.querySelector('[data-go]'); if (b) b.disabled = !(HELLO.name.trim() && HELLO.bottle != null && HELLO.tea != null); } };
    app.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.bottle != null) { HELLO.bottle = +t.dataset.bottle; HELLO.missing = false; HELLO.msg = ''; render(); }
      else if (t.dataset.tea != null) { HELLO.tea = +t.dataset.tea; HELLO.missing = false; HELLO.msg = ''; render(); }
      else if (t.matches('[data-local]')) { store.set(LKEY, true); location.hash = '#today'; }
      else if (t.matches('[data-retry]')) { HELLO.missing = false; HELLO.msg = ''; render(); }
      else if (t.matches('[data-go], [data-create]')) {
        if (!cloudOn) { HELLO.msg = 'Sync isn’t set up in this copy of the app. Use it without syncing for now.'; render(); return; }
        HELLO.busy = true; HELLO.msg = ''; render();
        try {
          const r = await signIn(HELLO.name, HELLO.bottle, HELLO.tea, t.matches('[data-create]'));
          HELLO.busy = false;
          if (r === 'missing') { HELLO.missing = true; HELLO.msg = `There’s no Astra yet for <b>${esc(HELLO.name.trim())}</b> with that bottle and tea. Check your picks, or start a new one.`; render(); return; }
          HELLO = { name: '', bottle: null, tea: null, msg: '', busy: false, missing: false };
          applyPalette(); toast(r === 'created' ? 'Your Astra is ready.' : 'Welcome back.'); location.hash = '#today'; render();
        } catch (err) {
          HELLO.busy = false;
          HELLO.msg = err.status === 404 ? 'Sign-in isn’t switched on yet: the database needs setting up (see the README).' : err.message === 'exists' ? 'That one already exists. Tap Try again, then Open Astra.' : 'Couldn’t reach the sync server. Check your connection and try again.';
          render();
        }
      }
    };
  }

  /* ---------- today ---------- */
  function today() {
    const k = todayK(), d = day(k), info = cycleInfo(k);
    const logs = (d && d.pain || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const sym = d ? Object.keys(d.sym || {}) : [];
    let below = '';
    if (info) {
      const left = dn(info.next) - dn(k);
      below = info.known ? (left > 1 ? `Next period expected around ${fmtDM(info.next)}` : left >= -2 ? 'Period expected about now' : `Period expected ${-left} days ago`) : 'Log a couple of periods to see predictions';
    }
    return `<div class="screen has-tabs">${header()}
      <div class="dk"><div class="dk-a">
      <div class="ring">${ring(info)}<div class="mid">${info ? `<small>Cycle day</small><b>${info.day}</b><span>${esc(info.phase.toLowerCase())}</span>` : `<small>Cycle day</small><b>–</b><span>log a period to start</span>`}</div></div>
      <p class="ringsub">${fmtLong(k)}${below ? ` · ${below}` : ''}</p>
      <a class="logbtn" href="#pain/${k}/new"><i>+</i>Log how you feel</a>
      <div class="quick"><button class="qbtn" data-bleed style="--c:${ccol('bleed')}">${DROP}${d && d.sym && d.sym.bleed ? `Bleeding: ${esc(d.sym.bleed.v || 'logged')} <span class="soft">· edit</span>` : 'Log bleeding'}</button><a class="qbtn" href="#day/${k}">Other symptoms, no pain</a></div>
      </div><div class="dk-b">
      ${logs.length ? `<div class="lbl">Today’s pain <em>${logs.length} log${logs.length > 1 ? 's' : ''}</em></div>
        <div class="tl">${logs.map(l => painRow(k, l)).join('')}</div>${movedLine(logs)}` : ''}
      ${sym.length ? `<div class="lbl">Also today</div><div class="minicards">${visibleOrder(sym).map(id => miniCard(id, d.sym[id])).join('')}</div>` : ''}
      ${d && hasData(d) ? `<a class="btn ghost" href="#day/${k}" style="margin-top:14px">See or change today</a>` : `<p class="empty">Nothing logged today yet. Tap the button whenever something happens, as many times a day as you like.</p>`}
      </div><div class="dk-c">
      <div class="lbl">This week</div>
      ${weekStrip(k)}
      ${info ? `<div class="lbl">Your cycle</div><div class="stats cyc"><div><b>${info.day}</b>cycle day</div><div><b>${info.known ? info.avg : '–'}</b>average length</div><div><b>${info.known ? Math.max(0, dn(info.next) - dn(k)) : '–'}</b>days to next period</div></div>` : ''}
      </div></div></div>`;
  }
  const DROP = `<svg width="13" height="16" viewBox="0 0 16 20" aria-hidden="true"><path d="M8 1 C8 1 2 9 2 13 a6 6 0 0 0 12 0 C14 9 8 1 8 1Z" fill="var(--c)"/></svg>`;
  /* Quick bleeding log: flow, clots and a note, without logging pain. */
  function bleedSheet(k, after) {
    const d = day(k), cb = cls('bleed'), cc = cls('clots');
    let flow = d && d.sym && d.sym.bleed ? d.sym.bleed.v : null, clots = d && d.sym && d.sym.clots ? d.sym.clots.v : null;
    const note = d && d.sym && d.sym.bleed ? d.sym.bleed.note || '' : '';
    const draw = () => `<h3 class="sh">Bleeding</h3><p class="sub">${k === todayK() ? 'Today' : fmtLong(k)}. No pain needed.</p>
      <div class="lbl">Flow</div><div class="chips" style="--c:${ccol('bleed')}">${(cb.options || []).map(o => `<button class="chip ${flow === o ? 'on' : ''}" data-flow="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="lbl">Clots</div><div class="chips" style="--c:${ccol('clots')}">${['None', ...(cc.options || [])].map(o => `<button class="chip ${(clots || 'None') === o ? 'on' : ''}" data-clots="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <input class="inp note" data-bnote placeholder="Note (optional)" value="${esc(note)}" aria-label="Bleeding note" style="margin-top:14px">
      <div class="two" style="margin-top:16px">${d && d.sym && d.sym.bleed ? '<button class="btn ghost danger-t" data-bclear>Remove</button>' : '<button class="btn ghost" data-close>Cancel</button>'}<button class="btn" data-bsave ${flow ? '' : 'disabled'}>Save</button></div>`;
    const w = sheet(draw(), e => {
      const t = e.target.closest('button'); if (!t) return;
      const keep = w.querySelector('[data-bnote]').value;
      const redraw = () => { w.querySelector('.sheet').innerHTML = '<div class="grab"></div>' + draw(); w.querySelector('[data-bnote]').value = keep; };
      if (t.dataset.flow) { flow = flow === t.dataset.flow ? null : t.dataset.flow; redraw(); }
      else if (t.dataset.clots) { clots = t.dataset.clots === 'None' ? null : t.dataset.clots; redraw(); }
      else if (t.matches('[data-bsave]')) {
        const dd = dayW(k); dd.sym.bleed = { v: flow }; if (keep.trim()) dd.sym.bleed.note = keep.trim();
        if (clots) dd.sym.clots = { v: clots }; else delete dd.sym.clots;
        touchDay(k); closeSheet(); toast('Bleeding logged'); after && after();
      } else if (t.matches('[data-bclear]')) { const dd = dayW(k); delete dd.sym.bleed; delete dd.sym.clots; touchDay(k); closeSheet(); toast('Bleeding removed'); after && after(); }
    });
  }
  function todayBind() { app.onclick = e => { if (e.target.closest('[data-bleed]')) bleedSheet(todayK(), () => render()); }; }
  function weekStrip(k) {
    let o = '';
    for (let i = 6; i >= 0; i--) {
      const kk = addK(k, -i), d = day(kk), s = maxSev(d), dt = kd(kk);
      const syms = d ? visibleOrder(Object.keys(d.sym || {})).filter(x => x !== 'bleed') : [];
      o += `<a class="wd ${bleeds(d) ? 'bleed' : ''} ${i === 0 ? 'today' : ''}" href="#day/${kk}" aria-label="${fmtLong(kk)}"><span class="w">${WD[dt.getDay()].slice(0, 1)}</span><span class="n">${dt.getDate()}</span>
        <span class="bars">${s != null ? [0, 1, 2].filter(j => j <= s).map(j => `<u style="height:${4 + j * 3}px;background:var(--sev${s})"></u>`).join('') : ''}</span><span class="dots">${syms.slice(0, 6).map(x => `<i style="background:${ccol(x)}"></i>`).join('')}</span></a>`;
    }
    return `<div class="week">${o}</div>`;
  }
  const visibleOrder = ids => { const order = classes().map(c => c.id); return ids.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)); };
  const miniCard = (id, e) => { const c = cls(id); if (!c) return ''; const t = symText(id, e); return `<span class="mc" style="--c:${ccol(id)}"><i></i><b>${esc(c.label)}</b>${t ? ' · ' + esc(t) : ''}</span>`; };
  const painRow = (k, l) => `<a class="te" href="#pain/${k}/${l.id}"><span class="t">${fmtTime(l.time) || '–'}</span>${mini(l)}<span class="w">${sevTag(l.sev ?? 0)}${l.types && l.types.length ? ' · ' + esc(l.types.join(', ')) : ''}<br><span class="soft">${esc(whereText(l) || 'No place chosen')}</span>${l.note ? `<br><span class="soft">${esc(l.note)}</span>` : ''}</span></a>`;

  /* ---------- pain log ---------- */
  function painInit(k, id) {
    if (PE && PE.k === k && PE.id === id) return;
    const d = day(k), l = id !== 'new' && d && (d.pain || []).find(x => x.id === id);
    PE = l ? { k, id, time: l.time || nowTime(), sev: l.sev ?? 1, types: [...(l.types || [])], regions: [...(l.regions || [])], note: l.note || '', side: (l.regions || [])[0] && l.regions[0][0] === 'B' && !l.regions.some(r => r[0] === 'F') ? 'B' : 'F' }
      : { k, id, time: k === todayK() ? nowTime() : '12:00', sev: 1, types: [], regions: [], note: '', side: 'F' };
  }
  function pain(k, id) {
    if (!isKey(k)) { location.hash = '#today'; return ''; }
    painInit(k, id);
    const isNew = id === 'new';
    return `<div class="screen">
      <header class="hd"><a class="link" href="${isNew ? (k === todayK() ? '#today' : '#day/' + k) : '#day/' + k}" data-cancel>Cancel</a><span class="r"><button class="link strong" data-save>${isNew ? 'Next' : 'Save'}</button></span></header>
      <h1 class="ttl">Pain <label class="timechip"><input type="time" data-time value="${PE.time}" aria-label="Time"></label></h1>
      <p class="sub">${k === todayK() ? 'Today' : fmtLong(k)} · tap everywhere it hurts${id === 'new' ? ` · <button class="link inline" data-skip>No pain? Skip to bleeding and other symptoms ›</button>` : ''}</p>
      <div class="dk"><div class="dk-a">
      <div class="seg sidetoggle" style="margin-top:10px" role="tablist">${[['F', 'Front'], ['B', 'Back']].map(([s, l]) => `<button class="${PE.side === s ? 'on' : ''}" data-side="${s}" role="tab">${l}</button>`).join('')}</div>
      <div class="bodywrap" data-body>${painBody()}</div>
      <div class="where" data-where>${painWhere()}</div>
      </div><div class="dk-b">
      <div class="lbl">How bad</div>
      <div class="sevs">${SEV.map((n, i) => `<button class="sv ${PE.sev === i ? 'on' : ''}" data-sev="${i}" style="--s:var(--sev${i})"><i>${[0, 1, 2].map(j => `<u class="${j <= i ? 'f' : ''}" style="height:${6 + j * 3}px"></u>`).join('')}</i>${n}</button>`).join('')}</div>
      <div class="lbl">What kind <button class="link small" data-edit-types>✎ Edit</button></div>
      <div class="chips" style="--c:var(--acc)">${painTypes().map(t => `<button class="chip ${PE.types.includes(t) ? 'on' : ''}" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <input class="inp" data-note placeholder="Note (optional)" value="${esc(PE.note)}" style="margin-top:12px" aria-label="Note">
      <button class="btn" data-save style="margin-top:16px">${isNew ? 'Next: what else happened' : 'Save'}</button>
      ${isNew ? `<button class="link center" data-skip>No pain, just other symptoms</button>` : `<button class="link center danger-t" data-delete>Delete this pain log</button>`}
    </div></div></div>`;
  }
  const painSpots = () => { const o = {}; PE.regions.forEach(r => o[r] = PE.sev); return o; };
  const painBody = () => ['F', 'B'].map(sd => `<figure class="bside ${PE.side === sd ? 'on' : ''}"><span class="side l">${sd === 'F' ? 'R' : 'L'}</span><span class="side r">${sd === 'F' ? 'L' : 'R'}</span>${BODY.svg(sd, painSpots(), 150, pal(), { live: 1 })}<figcaption>${sd === 'F' ? 'Front' : 'Back'}</figcaption></figure>`).join('');
  const painWhere = () => PE.regions.length ? `<b>${esc(whereText(PE))}</b>` : 'Nothing chosen yet';
  function painBind(k, id) {
    const redrawBody = () => { app.querySelector('[data-body]').innerHTML = painBody(); app.querySelector('[data-where]').innerHTML = painWhere(); };
    app.onclick = e => {
      const r = e.target.closest('[data-region]');
      if (r) { const v = r.dataset.region, i = PE.regions.indexOf(v); i >= 0 ? PE.regions.splice(i, 1) : PE.regions.push(v); redrawBody(); return; }
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.side) { PE.side = t.dataset.side; render(); }
      else if (t.dataset.sev != null) { PE.sev = +t.dataset.sev; app.querySelectorAll('[data-sev]').forEach(b => b.classList.toggle('on', +b.dataset.sev === PE.sev)); redrawBody(); }
      else if (t.dataset.type != null) { const v = t.dataset.type, i = PE.types.indexOf(v); i >= 0 ? PE.types.splice(i, 1) : PE.types.push(v); t.classList.toggle('on', i < 0); }
      else if (t.matches('[data-edit-types]')) editOptions('pain', () => render());
      else if (t.matches('[data-save]')) {
        const d = dayW(k), log = { id: id === 'new' ? uid() : id, time: PE.time, sev: PE.sev, types: PE.types.filter(x => x), regions: PE.regions, note: PE.note.trim() };
        const i = d.pain.findIndex(x => x.id === log.id);
        if (i >= 0) d.pain[i] = log; else d.pain.push(log);
        touchDay(k); PE = null; location.hash = '#day/' + k;
      }
      else if (t.matches('[data-skip]')) { PE = null; location.hash = '#day/' + k; }
      else if (t.matches('[data-delete]')) confirmSheet('Delete this pain log?', 'This can’t be undone.', 'Delete', () => { const d = dayW(k); d.pain = d.pain.filter(x => x.id !== id); touchDay(k); PE = null; location.hash = '#day/' + k; }, true);
    };
    app.oninput = e => { if (e.target.matches('[data-note]')) PE.note = e.target.value; if (e.target.matches('[data-time]')) PE.time = e.target.value || PE.time; };
    const c = app.querySelector('[data-cancel]'); if (c) c.addEventListener('click', () => { PE = null; });
  }

  /* ---------- a day: pain logs + what else happened ---------- */
  let OPEN = null; // which class card to scroll to
  function dayScreen(k) {
    if (!isKey(k)) { location.hash = '#today'; return ''; }
    const d = day(k) || { pain: [], sym: {} }, info = cycleInfo(k);
    const logs = (d.pain || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const added = Object.keys(d.sym || {});
    const starts = cycleStarts(), isStart = starts.includes(k);
    const back = k === todayK() ? '#today' : '#cal/' + k.slice(0, 7);
    return `<div class="screen">
      <header class="hd"><a class="link" href="${back}">‹ ${k === todayK() ? 'Today' : 'Calendar'}</a><span class="r"><a class="link strong" href="${back}">Done</a></span></header>
      <h1 class="ttl">${k === todayK() ? 'Today' : fmtShort(k)}</h1>
      <p class="sub">${fmtLong(k)}${info ? ` · cycle day ${info.day}` : ''}</p>
      <div class="dk"><div class="dk-a">
      <div class="lbl">Pain <em>${logs.length ? logs.length + ' log' + (logs.length > 1 ? 's' : '') : 'none'}</em></div>
      ${logs.length ? `<div class="tl">${logs.map(l => painRow(k, l)).join('')}</div>${movedLine(logs)}` : ''}
      <a class="btn ghost small-btn" href="#pain/${k}/new">+ Add a pain log</a>
      </div><div class="dk-b">
      <div class="lbl" style="margin-top:20px">What else happened <em>tap to add · tap again to remove</em></div>
      <div class="classes">${visibleClasses().map(c => `<button class="cls ${added.includes(c.id) ? 'added' : ''}" data-cls="${c.id}" style="--c:${ccol(c.id)}"><i>${added.includes(c.id) ? '✓' : '+'}</i><span>${esc(c.label)}</span></button>`).join('')}<button class="cls new" data-newcls><i>+</i><span>New…</span></button></div>
      </div><div class="dk-c">
      <div class="cards">${visibleOrder(added).map(id => symCard(k, id, d.sym[id])).join('')}</div>
      <button class="btn ghost period ${isStart ? 'on' : ''}" data-period>${isStart ? '✓ Period started this day' : 'Mark as the day my period started'}</button>
      <a class="btn" href="${back}" style="margin-top:10px">Done</a>
    </div></div></div>`;
  }
  function symCard(k, id, e) {
    const c = cls(id); if (!c) return '';
    const col = ccol(id);
    let body = '';
    if (c.kind === 'one' || c.kind === 'multi') {
      const vals = Array.isArray(e.v) ? e.v : e.v ? [e.v] : [];
      const opts = [...(c.options || [])]; vals.forEach(v => { if (!opts.includes(v)) opts.push(v); });
      body = `<div class="chips" style="--c:${col}">${opts.map(o => `<button class="chip ${vals.includes(o) ? 'on' : ''}" data-opt="${esc(o)}" data-for="${id}">${esc(o)}</button>`).join('')}${opts.length ? '' : '<span class="soft">No options yet. Tap Edit to add some.</span>'}</div>
        <input class="inp note" data-symnote="${id}" placeholder="${esc(c.note || 'Note (optional)')}" value="${esc(e.note || '')}" aria-label="${esc(c.label)} note">`;
    } else if (c.kind === 'score') {
      body = `<div class="score"><input class="inp" type="number" inputmode="numeric" min="0" max="${c.max || 100}" data-score="${id}" value="${e.v ?? ''}" placeholder="0–${c.max || 100}" aria-label="${esc(c.label)}"><span class="soft">${esc(c.note || '')}</span></div>`;
    } else {
      body = `<textarea class="inp" rows="3" data-text="${id}" placeholder="Anything else worth remembering" aria-label="${esc(c.label)}">${esc(e.v || '')}</textarea>`;
    }
    return `<div class="open" id="card-${id}" style="--c:${col}"><h5><span>${esc(c.label)}</span><button class="ed" data-edit="${id}">✎ Edit</button></h5>${body}</div>`;
  }
  function dayBind(k) {
    app.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.cls) {
        const id = t.dataset.cls, d = dayW(k);
        if (d.sym[id]) {
          const had = symText(id, d.sym[id]);
          delete d.sym[id]; touchDay(k); render();
          if (had) toast(`${cls(id).label} removed`);
        } else {
          const c = cls(id); d.sym[id] = { v: c.kind === 'multi' ? [] : null }; touchDay(k); OPEN = id; render();
        }
      } else if (t.dataset.opt != null) {
        const id = t.dataset.for, c = cls(id), d = dayW(k), e2 = d.sym[id] || (d.sym[id] = { v: null }), v = t.dataset.opt;
        if (c.kind === 'multi') { const a = Array.isArray(e2.v) ? e2.v : []; const i = a.indexOf(v); i >= 0 ? a.splice(i, 1) : a.push(v); e2.v = a; }
        else e2.v = e2.v === v ? null : v;
        touchDay(k);
        const card = app.querySelector('#card-' + CSS.escape(id)); if (card) card.outerHTML = symCard(k, id, e2);
      } else if (t.dataset.edit) editOptions(t.dataset.edit, () => render());
      else if (t.matches('[data-newcls]')) newClass(id => { if (id) { const d = dayW(k), c = cls(id); d.sym[id] = { v: c.kind === 'multi' ? [] : null }; touchDay(k); OPEN = id; } render(); });
      else if (t.matches('[data-period]')) {
        const starts = cycleStarts(), isStart = starts.includes(k);
        S.starts[k] = { on: !isStart, _at: Date.now() }; save(); render();
        toast(isStart ? 'Unmarked' : 'Marked as a period start');
      }
    };
    app.oninput = e => {
      const t = e.target, d = dayW(k);
      if (t.dataset.symnote) { (d.sym[t.dataset.symnote] ||= { v: null }).note = t.value; debounceDay(k); }
      if (t.dataset.score) { const n = t.value === '' ? null : Math.max(0, Math.min(+t.value, 1000)); (d.sym[t.dataset.score] ||= {}).v = n; debounceDay(k); }
      if (t.dataset.text) { (d.sym[t.dataset.text] ||= {}).v = t.value; debounceDay(k); }
    };
    if (OPEN) { const el = app.querySelector('#card-' + CSS.escape(OPEN)); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); OPEN = null; }
  }
  let dayTimer = null;
  function debounceDay(k) { clearTimeout(dayTimer); dayTimer = setTimeout(() => touchDay(k), 500); }

  /* ---------- calendar ---------- */
  function calendar(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym || '')) ym = todayK().slice(0, 7);
    const [y, m] = ym.split('-').map(Number), first = new Date(y, m - 1, 1), lead = (first.getDay() + 6) % 7, n = new Date(y, m, 0).getDate();
    const prev = dk(new Date(y, m - 2, 1)).slice(0, 7), next = dk(new Date(y, m, 1)).slice(0, 7), tk = todayK();
    const starts = cycleStarts(), info = cycleInfo(tk, starts);
    const predicted = new Set(); if (info && info.known) for (let i = 0; i < info.periodLen; i++) predicted.add(addK(info.next, i));
    const used = new Set();
    let cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<div class="h">${x}</div>`).join('') + '<div class="d blank"></div>'.repeat(lead);
    for (let i = 1; i <= n; i++) {
      const k = `${ym}-${pad(i)}`, d = day(k), s = maxSev(d), syms = d ? visibleOrder(Object.keys(d.sym || {})) : [];
      syms.forEach(x => used.add(x));
      cells += `<a class="d ${bleeds(d) ? 'bleed' : ''} ${k === tk ? 'today' : ''} ${predicted.has(k) && !bleeds(d) ? 'pred' : ''} ${starts.includes(k) ? 'start' : ''}" href="#day/${k}" aria-label="${fmtLong(k)}">
        <span class="n">${i}</span><span class="bars">${s != null ? [0, 1, 2].filter(j => j <= s).map(j => `<u style="height:${4 + j * 2.5}px;background:var(--sev${s})"></u>`).join('') : ''}</span>
        <span class="dots">${syms.filter(x => x !== 'bleed').slice(0, 8).map(x => `<i style="background:${ccol(x)}"></i>`).join('')}</span></a>`;
    }
    used.delete('bleed');
    return `<div class="screen has-tabs">${header()}
      <div class="mh"><h1 class="ttl">${MO[m - 1]}</h1><span class="mnav"><a href="#cal/${prev}" aria-label="Previous month">‹</a><span class="num">${y}</span><a href="#cal/${next}" aria-label="Next month">›</a></span></div>
      <div class="dk cal-dk"><div class="dk-a"><div class="cal">${cells}</div></div><div class="dk-b">
      <div class="legend"><span><i style="background:var(--bleed);box-shadow:0 0 0 1px #0000001a"></i>Bleeding</span>${predicted.size ? '<span><i style="box-shadow:inset 0 0 0 1.4px var(--acc);background:none"></i>Expected period</span>' : ''}<span><i style="background:var(--sev2);width:4px;height:9px"></i>Pain</span>${[...used].map(id => cls(id) ? `<span><i style="background:${ccol(id)}"></i>${esc(cls(id).label)}</span>` : '').join('')}</div>
      ${(() => { const ks = Object.keys(S.days).filter(x => x.startsWith(ym) && hasData(S.days[x])); const pd = ks.filter(x => maxSev(S.days[x]) != null); return ks.length ? `<div class="lbl">${MO[m - 1]}</div><div class="stats"><div><b>${ks.length}</b>days logged</div><div><b>${pd.length}</b>days with pain</div><div><b>${pd.filter(x => maxSev(S.days[x]) === 2).length}</b>severe</div></div>` : ''; })()}
      ${info ? `<p class="hint" style="margin-top:12px">Cycle day ${info.day} today. ${info.known ? `Average cycle ${info.avg} days.` : ''}</p>` : ''}
      </div></div></div>`;
  }

  /* ---------- ranges, stats ---------- */
  function rangeFor(r) {
    const tk = todayK(), starts = cycleStarts();
    if (r === 'cycle') { const s = [...starts].reverse().find(x => x <= tk); return { from: s || addK(tk, -27), to: tk, label: s ? `Cycle from ${fmtDM(s)}` : 'Last 4 weeks' }; }
    if (r === '3cycles') { const past = starts.filter(x => x <= tk); const s = past[Math.max(0, past.length - 3)]; return { from: s || addK(tk, -89), to: tk, label: s ? `3 cycles, from ${fmtDM(s)}` : 'Last 3 months' }; }
    if (r === '3m') return { from: addK(tk, -91), to: tk, label: 'Last 3 months' };
    if (r === '6m') return { from: addK(tk, -182), to: tk, label: 'Last 6 months' };
    if (r === 'year') return { from: addK(tk, -364), to: tk, label: 'Last 12 months' };
    return { from: addK(tk, -91), to: tk, label: '' };
  }
  const keysIn = (from, to) => Object.keys(S.days).filter(k => k >= from && k <= to && hasData(S.days[k])).sort();
  function stats(from, to) {
    const keys = keysIn(from, to), starts = cycleStarts();
    const painDays = keys.filter(k => (S.days[k].pain || []).length);
    const severe = painDays.filter(k => maxSev(S.days[k]) === 2);
    const byCd = {};
    for (const k of painDays) { const ci = cycleInfo(k, starts); if (!ci) continue; (byCd[ci.day] ||= []).push(maxSev(S.days[k])); }
    const cdAvg = Object.entries(byCd).map(([d, a]) => [+d, a.reduce((x, y) => x + y, 0) / a.length, a.length]).sort((a, b) => b[1] - a[1] || b[2] - a[2]);
    let worst = '';
    if (cdAvg.length) { const top = cdAvg.filter(x => x[1] >= cdAvg[0][1] - 0.01).map(x => x[0]).sort((a, b) => a - b).slice(0, 3); worst = top.length > 1 && top[top.length - 1] - top[0] === top.length - 1 ? `${top[0]}–${top[top.length - 1]}` : top.join(', '); }
    const region = {};
    for (const k of painDays) for (const l of S.days[k].pain) for (const r of l.regions || []) region[r] = (region[r] || 0) + 1 + (l.sev || 0);
    const maxR = Math.max(0, ...Object.values(region));
    const heat = {}; for (const [r, v] of Object.entries(region)) heat[r] = v / maxR > .66 ? 2 : v / maxR > .33 ? 1 : 0;
    const comes = {};
    for (const k of painDays) for (const id of Object.keys(S.days[k].sym || {})) if (id !== 'note') comes[id] = (comes[id] || 0) + 1;
    const sleepP = [], sleepN = [];
    for (const k of keys) { const sv = S.days[k].sym && S.days[k].sym.sleep && S.days[k].sym.sleep.v; if (typeof sv === 'number') ((S.days[k].pain || []).length ? sleepP : sleepN).push(sv); }
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    const moved = painDays.filter(k => movedLine(S.days[k].pain)).reverse();
    return { keys, painDays, severe, worst, heat, comes, sleepPain: avg(sleepP), sleepOther: avg(sleepN), moved, cycles: cycleStats(starts).lens.slice(-6) };
  }
  const sevKey = () => `<div class="sevkey">${SEV.map((n, i) => `<span><i style="background:var(--sev${i})"></i>${n}</span>`).join('')}</div>`;

  /* ---------- summary (for you) ---------- */
  let SUMR = 'cycle';
  function summary() {
    const R = rangeFor(SUMR), st = stats(R.from, R.to), p = pal();
    const comes = Object.entries(st.comes).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const n = st.painDays.length || 1;
    return `<div class="screen has-tabs">${header()}
      <h1 class="ttl">Your summary</h1>
      <div class="seg" style="margin-top:10px">${[['cycle', 'This cycle'], ['3cycles', '3 cycles'], ['6m', '6 months'], ['year', 'Year']].map(([k, l]) => `<button class="${SUMR === k ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div>
      <div class="sumcard"><h2 class="h6">${esc(R.label)}</h2><div class="m">${fmtDMY(R.from)} to ${fmtDMY(R.to)} · ${st.keys.length} day${st.keys.length === 1 ? '' : 's'} logged</div>
        <div class="stats"><div><b>${st.painDays.length}</b>days with pain</div><div><b>${st.severe.length}</b>severe days</div><div><b>${st.worst || '–'}</b>worst cycle day${st.worst.includes(',') || st.worst.includes('–') ? 's' : ''}</div></div>
        <div class="dk"><div class="dk-a">
        ${st.painDays.length ? `<div class="lbl">Where it hurts most</div>
        <div class="heatrow"><figure>${BODY.svg('F', st.heat, 74, p)}<figcaption>Front</figcaption></figure><figure>${BODY.svg('B', st.heat, 74, p)}<figcaption>Back</figcaption></figure></div>${sevKey().replace('Mild', 'Sometimes').replace('Moderate', 'Often').replace('Severe', 'Most')}` : ''}
        </div><div class="dk-b">
        ${comes.length ? `<div class="lbl">On pain days, it often comes with</div>
        <div class="bars2">${comes.map(([id, c]) => cls(id) ? `<div><span>${esc(cls(id).label)}</span><u style="width:${Math.round(c / n * 100)}%;background:${ccol(id)}"></u><em>${c}/${st.painDays.length}</em></div>` : '').join('')}</div>` : ''}
        </div><div class="dk-c">
        ${st.sleepPain != null || st.sleepOther != null ? `<div class="lbl">Sleep score</div><p class="sub">${st.sleepPain != null ? `<b>${st.sleepPain}</b> on pain days` : ''}${st.sleepPain != null && st.sleepOther != null ? ' · ' : ''}${st.sleepOther != null ? `<b>${st.sleepOther}</b> on other days` : ''}</p>` : ''}
        ${st.cycles.length ? `<div class="lbl">Recent cycle lengths</div><p class="sub">${st.cycles.map(x => `<b>${x}</b>`).join(' · ')} days</p>` : ''}
        </div></div>
        ${!st.keys.length ? `<p class="empty">Nothing logged in this range yet.</p>` : ''}
      </div>
      </div>`;
  }
  function summaryBind() { app.onclick = e => { const t = e.target.closest('[data-r]'); if (t) { SUMR = t.dataset.r; render(); } }; }

  /* ---------- for your doctor ---------- */
  let DOC = { r: '3m', from: null, to: null, off: new Set() };
  function docRange() {
    if (DOC.r === 'custom') { const tk = todayK(); const from = DOC.from || addK(tk, -91), to = DOC.to || tk; return { from: from <= to ? from : to, to: from <= to ? to : from, label: 'Custom range' }; }
    return rangeFor(DOC.r);
  }
  function usedClasses(keys) { const s = new Set(); for (const k of keys) Object.keys(S.days[k].sym || {}).forEach(x => s.add(x)); return classes().filter(c => s.has(c.id)); }
  const incl = id => !DOC.off.has(id);
  function doctor() {
    const R = docRange(), st = stats(R.from, R.to), used = usedClasses(st.keys), p = pal();
    const rows = st.keys.slice().reverse().slice(0, 4);
    const mv = st.moved[0];
    return `<div class="screen has-tabs">${header()}
      <h1 class="ttl">For your doctor</h1>
      <div class="dk"><div class="dk-a">
      <div class="seg" style="margin-top:10px">${[['cycle', 'This cycle'], ['3m', '3 months'], ['6m', '6 months'], ['custom', 'Custom']].map(([k, l]) => `<button class="${DOC.r === k ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div>
      ${DOC.r === 'custom' ? `<div class="two" style="margin-top:8px"><label class="fl">From<input class="inp" type="date" data-from value="${R.from}"></label><label class="fl">To<input class="inp" type="date" data-to value="${R.to}"></label></div>` : ''}
      <div class="lbl">Include</div>
      <div class="ticks"><button class="tk ${incl('pain') ? '' : 'off'}" data-inc="pain" style="--c:var(--acc)"><span>Pain & body map</span><i>${incl('pain') ? '✓' : ''}</i></button>${used.map(c => `<button class="tk ${incl(c.id) ? '' : 'off'}" data-inc="${c.id}" style="--c:${ccol(c.id)}"><span>${esc(c.label)}</span><i>${incl(c.id) ? '✓' : ''}</i></button>`).join('')}</div>
      </div><div class="dk-b">
      ${!st.keys.length ? `<p class="empty">Nothing logged in this range.</p>` : `
      <div class="prev"><h2 class="h6">Symptom record</h2><div class="m">${fmtDMY(R.from)} to ${fmtDMY(R.to)} · ${st.keys.length} day${st.keys.length === 1 ? '' : 's'} logged</div>
        ${incl('pain') && st.painDays.length ? `<div class="cols"><span class="pair">${BODY.svg('F', st.heat, 34, p, { thin: 1 })}${BODY.svg('B', st.heat, 34, p, { thin: 1 })}</span>
          <div>${mv ? `<b>How the pain moved on ${fmtDM(mv)}</b><div class="seq">${S.days[mv].pain.slice().sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(l => `<figure>${mini(l, 15)}<figcaption>${fmtTime(l.time)}</figcaption></figure>`).join('<span class="soft">›</span>')}</div>` : `<b>${st.painDays.length} days with pain, ${st.severe.length} severe</b>`}</div></div>` : ''}
        <table><tr><th>Date</th>${incl('pain') ? '<th>Pain</th><th>Where</th>' : ''}<th>Also</th></tr>
        ${rows.map(k => { const d = S.days[k], s = maxSev(d); return `<tr><td>${fmtDM(k)}</td>${incl('pain') ? `<td>${s != null ? SEV[s] : ''}</td><td>${esc([...new Set(d.pain.flatMap(l => (l.regions || []).map(BODY.label)))].join(', '))}</td>` : ''}<td>${esc(visibleOrder(Object.keys(d.sym || {})).filter(incl).filter(id => id !== 'note').map(id => cls(id) ? cls(id).label : id).join(', '))}</td></tr>`; }).join('')}</table>
        ${st.keys.length > 4 ? `<div class="m" style="margin-top:4px">…and ${st.keys.length - 4} more days</div>` : ''}
      </div>
      <div class="dl"><button class="btn ghost" data-pdf>PDF / print</button><button class="btn" data-xlsx>Excel (.xlsx)</button></div>
      <button class="link center" data-csv>Or download a CSV</button>`}
      </div></div></div>`;
  }
  function doctorBind() {
    app.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.r) { DOC.r = t.dataset.r; render(); }
      else if (t.dataset.inc) { const id = t.dataset.inc; DOC.off.has(id) ? DOC.off.delete(id) : DOC.off.add(id); render(); }
      else if (t.matches('[data-pdf]')) location.hash = '#report';
      else if (t.matches('[data-xlsx]')) exportXlsx();
      else if (t.matches('[data-csv]')) exportCsv();
    };
    app.onchange = e => { if (e.target.matches('[data-from]')) { DOC.from = e.target.value; render(); } if (e.target.matches('[data-to]')) { DOC.to = e.target.value; render(); } };
  }
  /* rows for the spreadsheet: one row per day, then one per pain log */
  function tables() {
    const R = docRange(), st = stats(R.from, R.to), used = usedClasses(st.keys).filter(c => incl(c.id)), starts = cycleStarts();
    const head = ['Date', 'Cycle day', 'Phase', ...(incl('pain') ? ['Worst pain', 'Pain types', 'Where', 'Pain times'] : []), ...used.map(c => c.label)];
    const days = [head];
    for (const k of st.keys) {
      const d = S.days[k], ci = cycleInfo(k, starts), s = maxSev(d), logs = (d.pain || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      days.push([fmtDMY(k), ci ? ci.day : '', ci ? ci.phase : '',
        ...(incl('pain') ? [s != null ? SEV[s] : '', [...new Set(logs.flatMap(l => l.types || []))].join(', '), [...new Set(logs.flatMap(l => (l.regions || []).map(BODY.label)))].join(', '), logs.map(l => fmtTime(l.time)).filter(Boolean).join(', ')] : []),
        ...used.map(c => { const e = d.sym && d.sym[c.id]; if (!e) return ''; return c.kind === 'score' && typeof e.v === 'number' && !e.note ? e.v : symText(c.id, e); })]);
    }
    const pain = [['Date', 'Time', 'Severity', 'Type', 'Where', 'Note']];
    if (incl('pain')) for (const k of st.keys) for (const l of (S.days[k].pain || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))) pain.push([fmtDMY(k), fmtTime(l.time), SEV[l.sev ?? 0], (l.types || []).join(', '), whereText(l), l.note || '']);
    const summ = [['', ''], ['Range', `${fmtDMY(R.from)} to ${fmtDMY(R.to)}`], ['Days logged', st.keys.length], ['Days with pain', st.painDays.length], ['Severe days', st.severe.length], ['Worst cycle days', st.worst || ''],
      ['Recent cycle lengths (days)', st.cycles.join(', ')],
      ['Where it hurts (most often first)', Object.entries(st.heat).sort((a, b) => b[1] - a[1]).map(([r]) => BODY.label(r)).join(', ')],
      ...Object.entries(st.comes).sort((a, b) => b[1] - a[1]).filter(([id]) => incl(id) && cls(id)).map(([id, c]) => [`On pain days: ${cls(id).label}`, `${c} of ${st.painDays.length}`])];
    summ[0] = ['Astra symptom record', S.cfg.name || (SYNC && SYNC.name) || ''];
    return { R, days, pain, summ };
  }
  async function deliver(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const fileStamp = R => `${R.from}_to_${R.to}`;
  function exportXlsx() {
    const T = tables();
    const blob = XL.build([
      { name: 'Summary', rows: T.summ, widths: [34, 60] },
      { name: 'Days', rows: T.days, widths: T.days[0].map((h, i) => i === 0 ? 14 : i < 3 ? 11 : 24) },
      ...(incl('pain') ? [{ name: 'Pain logs', rows: T.pain, widths: [14, 9, 11, 24, 36, 30] }] : []),
    ]);
    deliver(blob, `Astra symptoms ${fileStamp(T.R)}.xlsx`);
  }
  function exportCsv() { const T = tables(); deliver(new Blob([XL.csv(T.days)], { type: 'text/csv' }), `Astra symptoms ${fileStamp(T.R)}.csv`); }

  /* ---------- printable report ---------- */
  function report() {
    const T = tables(), R = T.R, st = stats(R.from, R.to), starts = cycleStarts();
    const p = pal().id === 'night' ? PALS[0] : pal(); // reports always print light
    const name = S.cfg.name || (SYNC && SYNC.name) || '';
    const usedC = usedClasses(st.keys).filter(c => incl(c.id));
    return `<div class="report" style="--bg:${p.bg};--card:${p.card};--ink:${p.ink};--soft:${p.soft};--hair:${p.hair};--acc:${p.acc};--sev0:${p.sev[0]};--sev1:${p.sev[1]};--sev2:${p.sev[2]};background:${p.bg};color:${p.ink}">
      <div class="noprint rbar"><a class="link" href="#doctor">‹ Back</a><button class="btn small" data-print>Print or save as PDF</button></div>
      <header class="rhead"><div class="wm">${logo(26)}<span>Astra</span></div><div><h1>Symptom record${name ? ` · ${esc(name)}` : ''}</h1><p>${fmtDMY(R.from)} to ${fmtDMY(R.to)} · prepared ${fmtDMY(todayK())}</p></div></header>
      <div class="rstats"><div><b>${st.keys.length}</b>days logged</div><div><b>${st.painDays.length}</b>days with pain</div><div><b>${st.severe.length}</b>severe days</div><div><b>${st.worst || '–'}</b>worst cycle days</div><div><b>${st.cycles.length ? Math.round(st.cycles.reduce((a, b) => a + b, 0) / st.cycles.length) : '–'}</b>average cycle (days)</div></div>
      ${incl('pain') && st.painDays.length ? `<section><h2>Where the pain is</h2><div class="rbody"><figure>${BODY.svg('F', st.heat, 110, p)}<figcaption>Front</figcaption></figure><figure>${BODY.svg('B', st.heat, 110, p)}<figcaption>Back</figcaption></figure>
        <div class="rkey"><p>Shading shows how often each place hurt, weighted by severity.</p>${sevKey().replace('Mild', 'Sometimes').replace('Moderate', 'Often').replace('Severe', 'Most often')}</div></div></section>` : ''}
      ${incl('pain') && st.moved.length ? `<section><h2>How the pain moved during the day</h2>${st.moved.slice(0, 8).map(k => { const logs = S.days[k].pain.slice().sort((a, b) => (a.time || '').localeCompare(b.time || '')); return `<div class="rmove"><b>${fmtShort(k)}</b><div class="seq">${logs.map(l => `<figure>${mini(l, 26, p)}<figcaption>${fmtTime(l.time)}<br>${SEV[l.sev ?? 0]}</figcaption></figure>`).join('<span>→</span>')}</div></div>`; }).join('')}</section>` : ''}
      <section><h2>Day by day</h2><table class="rtable"><thead><tr><th>Date</th><th>Cycle day</th>${incl('pain') ? '<th>Pain</th>' : ''}<th>Other symptoms</th></tr></thead><tbody>
      ${st.keys.map(k => { const d = S.days[k], ci = cycleInfo(k, starts), s = maxSev(d), logs = (d.pain || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        return `<tr><td>${fmtShort(k)}</td><td>${ci ? ci.day : ''}</td>${incl('pain') ? `<td>${s != null ? `<b>${SEV[s]}</b><br>` : ''}${logs.map(l => `${fmtTime(l.time)} ${SEV[l.sev ?? 0].toLowerCase()}${l.types && l.types.length ? ', ' + esc(l.types.join(', ').toLowerCase()) : ''}${whereText(l) ? ': ' + esc(whereText(l)) : ''}${l.note ? ` (${esc(l.note)})` : ''}`).join('<br>')}</td>` : ''}
        <td>${usedC.filter(c => d.sym && d.sym[c.id]).map(c => `<b>${esc(c.label)}</b>: ${esc(symText(c.id, d.sym[c.id])) || 'yes'}`).join('<br>')}</td></tr>`; }).join('')}
      </tbody></table></section>
      <p class="rfoot">Recorded by the patient in Astra. Pain is self-rated as mild, moderate or severe.</p>
    </div>`;
  }
  function reportBind() { app.onclick = e => { if (e.target.closest('[data-print]')) window.print(); }; }

  /* ---------- settings ---------- */
  function settings() {
    const starts = cycleStarts().slice().reverse(), { avg, known } = cycleStats(cycleStarts());
    const hidden = classes().filter(c => S.cfg.hidden.includes(c.id));
    return `<div class="screen">
      <header class="hd"><a class="link" href="#today">‹ Back</a><span class="r"></span></header>
      <h1 class="ttl">Settings</h1>
      <div class="dk"><div class="dk-a">
      <div class="lbl">Colours</div>
      <div class="pals">${PALS.map(x => `<button class="pl ${x.id === pal().id ? 'on' : ''}" data-pal="${x.id}"><span class="pchip" style="background:${x.bg}">${[x.acc, x.c[0], x.c[3], x.c[5]].map(c => `<i style="background:${c}"></i>`).join('')}</span><span>${x.name}<small>${x.desc}</small></span><span class="ck">✓</span></button>`).join('')}</div>

      <div class="lbl">Sign-in and sync</div>
      ${SYNC ? `<div class="set"><span>Signed in as</span><b>${esc(SYNC.name)}</b></div>
        <div class="set"><span>Your picks</span><span class="picks">${bottleSVG(BOTTLES[SYNC.bottle] || '#ccc', 22)}${cupSVG((TEAS[SYNC.tea] || ['', '#ccc'])[1], 22)}<span class="soft">${esc((TEAS[SYNC.tea] || [''])[0])}</span></span></div>
        <p class="hint" id="syncstat">${syncLine()}</p>
        <div class="two"><button class="btn ghost" data-switch>Switch account</button><button class="btn ghost" data-signout>Sign out</button></div>`
      : `<p class="hint" id="syncstat">${syncLine()}</p><a class="btn ghost" href="#hello">Sign in to sync</a>`}

      </div><div class="dk-b">
      <div class="lbl">Cycle</div>
      <p class="sub">${known ? `Average cycle: <b>${avg} days</b>.` : 'Not enough periods logged to work out your average yet.'} A new cycle starts on the first day of bleeding (light or heavier) after a gap, or on any day you mark.</p>
      <div class="starts">${starts.slice(0, 8).map(k => `<div class="set"><span>${fmtDMY(k)}</span><button class="link danger-t" data-unstart="${k}">Remove</button></div>`).join('') || '<p class="hint">No period starts yet.</p>'}</div>
      <div class="addopt"><input class="inp" type="date" data-startdate max="${todayK()}" aria-label="Period start date"><button class="btn small" data-addstart>Add a start</button></div>

      <div class="lbl">Bring in your Notion log</div>
      <p class="sub">In Notion, open the Symptom Log, choose ••• → Export → Markdown & CSV, unzip it and pick the CSV file here (or the zip itself). Days you’ve already logged in Astra are kept: Notion only fills in what’s missing.</p>
      <label class="btn ghost file">Choose Notion CSV or zip<input type="file" accept=".csv,.zip,text/csv,application/zip" data-notion hidden></label>

      <div class="lbl">Your name on reports</div>
      <input class="inp" data-myname placeholder="${esc(SYNC ? SYNC.name : 'Your name')}" value="${esc(S.cfg.name || '')}" aria-label="Your name on reports">

      <div class="lbl">Backup</div>
      <div class="two"><button class="btn ghost" data-backup>Save a backup</button><label class="btn ghost file">Restore a backup<input type="file" accept=".json,application/json" data-restore hidden></label></div>
      <button class="link center danger-t" data-reset style="margin-top:20px">Clear everything on this device</button>
      <p class="hint center">Astra · your data stays on your devices and in your own sync space.</p>
      </div><div class="dk-c">
      <div class="lbl">Symptom classes</div>
      <div class="clist">${visibleClasses().map(c => `<button class="set as-btn" data-editcls="${c.id}"><span><i class="sq" style="background:${ccol(c.id)}"></i>${esc(c.label)}</span><span class="soft">Edit ›</span></button>`).join('')}
        <button class="set as-btn" data-editcls="pain"><span><i class="sq" style="background:var(--acc)"></i>Pain types</span><span class="soft">Edit ›</span></button></div>
      ${hidden.length ? `<p class="hint">Hidden: ${hidden.map(c => `<button class="link" data-unhide="${c.id}">${esc(c.label)} (show)</button>`).join(' ')}</p>` : ''}
      <button class="btn ghost" data-newcls style="margin-top:8px">+ New symptom class</button>

      </div></div>
    </div>`;
  }
  function settingsBind() {
    app.onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.pal) { S.cfg.palette = t.dataset.pal; touchCfg(); applyPalette(); render(); }
      else if (t.matches('[data-switch]')) { location.hash = '#hello'; }
      else if (t.matches('[data-signout]')) confirmSheet('Sign out?', 'Your log stays on this phone. Sign in again with the same name, bottle and tea to keep syncing.', 'Sign out', () => { SYNC = null; store.del(SKEY); store.set(LKEY, true); render(); });
      else if (t.dataset.unstart) { S.starts[t.dataset.unstart] = { on: false, _at: Date.now() }; save(); render(); }
      else if (t.matches('[data-addstart]')) { const v = app.querySelector('[data-startdate]').value; if (isKey(v)) { S.starts[v] = { on: true, _at: Date.now() }; save(); render(); toast('Period start added'); } }
      else if (t.dataset.editcls) editOptions(t.dataset.editcls, () => render());
      else if (t.dataset.unhide) { S.cfg.hidden = S.cfg.hidden.filter(x => x !== t.dataset.unhide); touchCfg(); render(); }
      else if (t.matches('[data-newcls]')) newClass(() => render());
      else if (t.matches('[data-backup]')) deliver(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), `Astra backup ${todayK()}.json`);
      else if (t.matches('[data-reset]')) confirmSheet('Clear everything on this device?', SYNC ? 'This signs you out and removes your log from this phone. It stays in your sync space, so signing in again brings it back.' : 'This deletes your whole log from this phone. Save a backup first if you might want it.', 'Clear', () => { S = blank(); store.set(KEY, S); SYNC = null; store.del(SKEY); store.del(LKEY); applyPalette(); location.hash = '#hello'; render(); }, true);
    };
    app.onchange = async e => {
      const t = e.target;
      if (t.matches('[data-myname]')) { S.cfg.name = t.value.trim(); touchCfg(); }
      if (t.matches('[data-restore]') && t.files[0]) {
        try { const data = JSON.parse(await t.files[0].text()); if (!data || data.app !== 'astra') throw 0; merge(data); save(); applyPalette(); render(); toast('Backup restored'); }
        catch (err) { toast('That file isn’t an Astra backup.'); }
      }
      if (t.matches('[data-notion]') && t.files[0]) {
        try { const text = await readNotion(t.files[0]); const r = importNotion(text); render(); toast(`Brought in ${r.days} day${r.days === 1 ? '' : 's'} from Notion`); }
        catch (err) { toast(err && err.message ? err.message : 'Couldn’t read that file.'); }
      }
    };
  }

  /* ---------- Notion import ---------- */
  async function readNotion(file) {
    if (/\.zip$/i.test(file.name)) {
      const csvs = await unzipCsvs(new Uint8Array(await file.arrayBuffer()));
      const pick = csvs.find(f => /_all\.csv$/i.test(f.name)) || csvs.find(f => /symptom/i.test(f.name)) || csvs[0];
      if (!pick) throw new Error('No CSV found in that zip.');
      return pick.text;
    }
    return await file.text();
  }
  // Reads CSV files out of a zip (Notion's export). Handles stored and deflated entries, including a zip inside the zip.
  async function unzipCsvs(buf, depth = 0) {
    const out = [], dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let eocd = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('That zip file looks damaged.');
    let p = dv.getUint32(eocd + 16, true); const n = dv.getUint16(eocd + 10, true);
    const dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loff = dv.getUint32(p + 42, true);
      const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (!/\.(csv|zip)$/i.test(name)) continue;
      const ds = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
      let data = buf.subarray(ds, ds + csize);
      if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else if (method !== 0) continue;
      if (/\.zip$/i.test(name)) { if (depth < 2) out.push(...await unzipCsvs(data, depth + 1)); }
      else out.push({ name, text: dec.decode(data) });
    }
    return out;
  }
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  function importNotion(text) {
    const rows = parseCsv(text); if (rows.length < 2) throw new Error('That CSV is empty.');
    const H = rows[0].map(h => h.trim()), col = name => H.findIndex(h => h.toLowerCase() === name.toLowerCase());
    if (col('Date') < 0) throw new Error('That doesn’t look like the Notion Symptom Log (no Date column).');
    const get = (r, name) => { const i = col(name); return i >= 0 ? (r[i] || '').trim() : ''; };
    const list = s => s.split(',').map(x => x.trim()).filter(x => x && !/^(none|nil|n\/a|-)$/i.test(x));
    const LOC = { 'lower abdomen': 'F.lowAbd', 'pelvis': 'F.pelvis', 'lower back': 'B.lowC', 'right side': 'F.rSide', 'left side': 'F.lSide', 'upper abdomen': 'F.upAbd', 'abdomen': 'F.lowAbd', 'back': 'B.midBack', 'upper back': 'B.upBack', 'mid back': 'B.midBack', 'chest': 'F.chest', 'head': 'F.head', 'thighs': 'F.rThigh', 'legs': 'F.rThigh', 'right lower back': 'B.lowR', 'left lower back': 'B.lowL', 'tailbone': 'B.sacrum' };
    const TYPE = { 'sharp ache': 'Sharp', 'sharp': 'Sharp', 'dull ache': 'Dull ache', 'dull': 'Dull ache', 'cramping': 'Cramping', 'cramp': 'Cramping', 'stabbing': 'Stabbing', 'throbbing': 'Throbbing', 'burning': 'Burning', 'pulling': 'Pulling' };
    const onset = s => { const x = s.toLowerCase(); return /afternoon/.test(x) ? '15:00' : /morning|wake/.test(x) ? '09:00' : /midday|noon|lunch/.test(x) ? '12:00' : /evening/.test(x) ? '18:00' : /night/.test(x) ? '21:00' : '12:00'; };
    const sevOf = s => /severe/i.test(s) ? 2 : /moderate/i.test(s) ? 1 : /mild|low|light/i.test(s) ? 0 : null;
    const addOpt = (id, v) => { const c = cls(id); if (c && (c.kind === 'one' || c.kind === 'multi') && !(c.options || []).includes(v)) setOver(id, { options: [...(c.options || []), v] }); };
    const setSym = (d, id, v, note) => { if (d.sym[id] && symText(id, d.sym[id])) return; d.sym[id] = { v }; if (note) d.sym[id].note = note; };
    const now = Date.now(); let count = 0;
    for (const r of rows.slice(1)) {
      const dt = new Date(get(r, 'Date')); if (isNaN(dt)) continue;
      const k = dk(dt), had = hasData(S.days[k]), d = dayW(k);
      const ps = sevOf(get(r, 'Pain'));
      if (ps != null && !(had && d.pain.length)) {
        const types = list(get(r, 'Pain Type')).map(t => TYPE[t.toLowerCase()] || t);
        types.forEach(t => { if (!painTypes().includes(t)) S.cfg.painTypes = [...painTypes(), t]; });
        const locs = list(get(r, 'Pain Location')), regions = [], unknown = [];
        locs.forEach(l => { const m = LOC[l.toLowerCase()]; m ? regions.push(m) : unknown.push(l); });
        const on = get(r, 'Time of Onset');
        d.pain.push({ id: uid(), time: onset(on), sev: ps, types, regions: [...new Set(regions)], note: [on && `Onset: ${on}`, unknown.length && `Also: ${unknown.join(', ')}`].filter(Boolean).join('. ') });
      }
      const one = (id, raw, map) => { if (!raw || /^(none|nil|n\/a)$/i.test(raw)) return; const v = map ? map(raw) : raw; addOpt(id, v); setSym(d, id, v); };
      const multi = (id, raw) => { const vs = list(raw); if (!vs.length) return; vs.forEach(v => addOpt(id, v)); setSym(d, id, vs); };
      one('bleed', get(r, 'Bleeding'));
      one('clots', get(r, 'Clots'));
      multi('bowel', get(r, 'Bowel Symptoms'));
      multi('urine', get(r, 'Urinary Symptoms'));
      multi('nausea', get(r, 'Other Symptoms'));
      one('fatigue', get(r, 'Fatigue'));
      one('stress', get(r, 'Stress'));
      one('act', get(r, 'Exercise / Activity'));
      one('impact', get(r, 'Overall Day Impact'), s => /severe/i.test(s) ? 'Severe — couldn’t function' : /moderate/i.test(s) ? 'Moderate' : /minor/i.test(s) ? 'Minor' : /no /i.test(s) ? 'None' : s);
      const diet = get(r, 'Diet'); if (diet) multi('food', diet);
      const sl = get(r, 'Sleep'); if (sl && !isNaN(+sl)) setSym(d, 'sleep', +sl);
      const heart = get(r, 'Heart Symptoms');
      if (heart && !/^(none|nil)$/i.test(heart)) { const v = []; if (/palpit/i.test(heart)) v.push('Palpitations'); if (/tachy|racing|fast/i.test(heart)) v.push('Racing'); setSym(d, 'heart', v, heart); }
      const tr = get(r, 'Treatment'); if (tr && !/^(nil|none)$/i.test(tr)) setSym(d, 'treat', [], tr);
      const notes = [get(r, 'Notes'), get(r, 'Name')].filter(x => x && !/^untitled$/i.test(x));
      if (notes.length) setSym(d, 'note', [...new Set(notes)].join('\n'));
      const cd = parseInt(get(r, 'Cycle Day'), 10);
      if (cd >= 1 && cd < 60) { const s = addK(k, -(cd - 1)); const near = Object.entries(S.starts).some(([x, v]) => v && v.on && Math.abs(dn(x) - dn(s)) < 10); if (!near && !S.starts[s]) S.starts[s] = { on: true, _at: now }; }
      d._at = now; count++;
    }
    S.cfg._at = now; save();
    return { days: count };
  }

  /* ================= router ================= */
  const VIEWS = {
    hello: [hello, helloBind], today: [today, todayBind], pain: [pain, painBind], day: [dayScreen, dayBind], cal: [calendar],
    summary: [summary, summaryBind], doctor: [doctor, doctorBind], report: [report, reportBind], settings: [settings, settingsBind],
  };
  function render() {
    const [name, ...args] = (location.hash.slice(1) || 'today').split('/');
    let v = VIEWS[name] ? name : 'today';
    if (!SYNC && !store.get(LKEY, false) && v !== 'hello') { location.replace('#hello'); v = 'hello'; }
    if (v !== 'pain') PE = null;
    const changed = v !== current; current = v;
    app.onclick = app.oninput = app.onchange = null;
    app.className = 'v-' + v;
    const TABKEY = { today: 'today', pain: 'today', day: 'today', cal: 'cal', summary: 'sum', doctor: 'doc', settings: 'set' };
    app.innerHTML = VIEWS[v][0](...args) + (TABKEY[v] ? tabs(TABKEY[v], ['pain', 'day', 'settings'].includes(v)) : '');
    if (VIEWS[v][1]) VIEWS[v][1](...args);
    if (changed) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => { closeSheet(); render(); });
  applyPalette();
  render();
  cloudPull();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
