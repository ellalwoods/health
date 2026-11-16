/* The body map: one outline for front and back. You tap anywhere on it; each tap is saved as a point,
 * and Astra names it from where it is (e.g. 'Pelvis, left').
 *
 * Zone ids look like 'F.lowAbd' (front, lower abdomen), or with the person's side added for the middle of the body:
 * 'F.lowAbd.L' / 'F.lowAbd.R'. Base ids (REG keys) are saved in pain logs: don't rename them.
 * On the front the person's right is on the viewer's left; on the back it's the other way round. */
(() => {
  const HALF = [[54,31],[53,38],[44,41],[34,45],[29,52],[27,64],[25,80],[23,96],[21,112],[19,124],[18,132],[22,134],[25,126],[28,110],[31,94],[33,80],[35,70],[36,84],[36,100],[33,116],[32,130],[34,150],[36,170],[38,190],[39,207],[46,212],[47,204],[48,186],[50,166],[54,148],[60,142]];
  function smooth(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }
  const OUTLINE = smooth([...HALF, ...HALF.slice(0, -1).reverse().map(([x, y]) => [120 - x, y])]) + 'Z';
  // Areas used to name a point: [cx, cy, rx, ry, label]. Middle areas (cx 60) get a left/right/centre side.
  const REG = {
    F: { head: [60,19,11,13,'Head'], chest: [60,60,19,13,'Chest'], upAbd: [60,83,18,9,'Upper abdomen'], rSide: [37,96,6,14,'Right side'], lSide: [83,96,6,14,'Left side'],
         lowAbd: [60,104,17,9,'Lower abdomen'], pelvis: [60,124,18,9,'Pelvis'], rThigh: [46,160,10,24,'Right leg'], lThigh: [74,160,10,24,'Left leg'],
         rArm: [26,95,6,38,'Right arm'], lArm: [94,95,6,38,'Left arm'] },
    B: { headB: [60,19,11,13,'Back of head'], upBack: [60,60,20,13,'Upper back'], midBack: [60,83,18,9,'Mid back'], lowL: [45,106,8,9,'Lower back, left'],
         lowC: [60,106,7,9,'Lower back'], lowR: [75,106,8,9,'Lower back, right'], sacrum: [60,125,18,9,'Tailbone and buttocks'], lThighB: [46,160,10,24,'Back of left leg'], rThighB: [74,160,10,24,'Back of right leg'],
         lArmB: [26,95,6,38,'Left arm'], rArmB: [94,95,6,38,'Right arm'] },
  };
  const MID = new Set(['head', 'chest', 'upAbd', 'lowAbd', 'pelvis', 'headB', 'upBack', 'midBack', 'sacrum']);
  const ORDER = [...Object.keys(REG.F).map(k => 'F.' + k), ...Object.keys(REG.B).map(k => 'B.' + k)];
  /* The zone a point falls in: nearest area (by ellipse distance), plus the person's side for middle areas. */
  function zoneAt(side, x, y) {
    let best = null, bd = Infinity;
    for (const [k, [cx, cy, rx, ry]] of Object.entries(REG[side])) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    let id = side + '.' + best;
    if (MID.has(best) && Math.abs(x - 60) > 4.5) {
      const viewerLeft = x < 60;
      id += side === 'F' ? (viewerLeft ? '.R' : '.L') : (viewerLeft ? '.L' : '.R');
    }
    return id;
  }
  function label(id) {
    const [s, k, lr] = String(id).split('.');
    const r = REG[s] && REG[s][k]; if (!r) return id;
    return r[4] + (lr === 'L' ? ', left' : lr === 'R' ? ', right' : '');
  }
  /* A point to draw for a zone (used for old logs and for the summary heat map). */
  function centre(id) {
    const [s, k, lr] = String(id).split('.');
    const r = REG[s] && REG[s][k]; if (!r) return null;
    let x = r[0];
    if (lr) { const viewerLeft = s === 'F' ? lr === 'R' : lr === 'L'; x += (viewerLeft ? -1 : 1) * Math.max(6, r[2] * .55); }
    return { s, x, y: r[1] };
  }
  const order = id => { const [s, k, lr] = String(id).split('.'); const i = ORDER.indexOf(s + '.' + k); return (i < 0 ? 999 : i) * 3 + (lr === 'R' ? 0 : lr === 'L' ? 2 : 1); };
  // Accepts points [{ s, x, y, sev }] or a map { zoneId: sev } (drawn at each zone's centre).
  const toPoints = spots => Array.isArray(spots) ? spots : Object.entries(spots || {}).map(([id, sev]) => { const c = centre(id); return c && { ...c, sev, wide: 1 }; }).filter(Boolean);
  let gid = 0;
  /* side: 'F' or 'B'. pal: the current palette. opts: { live: tappable, thin: for tiny figures } */
  function svg(side, spots, w, pal, opts = {}) {
    const h = Math.round(w * 222 / 120), id = 'bm' + (gid++);
    const defs = pal.sev.map((c, i) => `<radialGradient id="${id}s${i}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".55" stop-color="${c}" stop-opacity=".6"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('');
    const sw = opts.thin ? 2.6 : 1.5;
    const pts = toPoints(spots).filter(p => p.s === side);
    let g = pts.map(p => `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.wide ? 15 : 12}" ry="${p.wide ? 13 : 11}" fill="url(#${id}s${p.sev ?? 0})"/>`).join('');
    if (opts.live) g += pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="2.6" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.2" pointer-events="none"/>`).join('');
    const marks = side === 'F'
      ? `<circle cx="60" cy="98" r="1.1" fill="${pal.ink}" opacity=".45"/>`
      : `<path d="M60 44 V120" stroke="${pal.ink}" stroke-opacity=".18" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M47 56 q5 10 0 18 M73 56 q-5 10 0 18" stroke="${pal.ink}" stroke-opacity=".14" fill="none"/>`;
    const live = opts.live ? ` class="body live" data-side="${side}"` : ' class="body"';
    return `<svg${live} width="${w}" height="${h}" viewBox="0 0 120 222" role="img" aria-label="${side === 'F' ? 'Front' : 'Back'} of body"><defs>${defs}</defs>` +
      `<circle class="bfill" cx="60" cy="18" r="13" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}"/>` +
      `<path class="bfill" d="${OUTLINE}" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}" stroke-linejoin="round"/>${marks}${g}</svg>`;
  }
  /* For a tap on a live body: the point in body coordinates, or null if it missed the body. */
  function pointFromEvent(svgEl, e) {
    const m = svgEl.getScreenCTM(); if (!m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const shapes = svgEl.querySelectorAll('.bfill');
    let inside = false;
    for (const sh of shapes) { try { if (sh.isPointInFill(new DOMPoint(pt.x, pt.y))) inside = true; } catch (err) { inside = true; } }
    if (!inside) {
      // Forgive taps just outside the outline (fingers are wide): accept if near any area.
      const z = zoneAt(svgEl.dataset.side, pt.x, pt.y).split('.'), r = REG[z[0]][z[1]];
      if (((pt.x - r[0]) / (r[2] + 5)) ** 2 + ((pt.y - r[1]) / (r[3] + 5)) ** 2 > 1) return null;
    }
    return { x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 };
  }
  window.ASTRA_BODY = { REG, label, ORDER, order, svg, zoneAt, centre, toPoints, pointFromEvent };
})();
