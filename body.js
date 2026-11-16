/* The body map: one outline for front and back. You tap anywhere on it; each tap is saved as a point,
 * and Astra names it from where it is (e.g. 'Pelvis, left').
 *
 * Zone ids look like 'F.lowAbd' (front, lower abdomen), or with the person's side added for the middle of the body:
 * 'F.lowAbd.L' / 'F.lowAbd.R'. Base ids (REG keys) are saved in pain logs: don't rename them.
 * On the front the person's right is on the viewer's left; on the back it's the other way round. */
(() => {
  // Half of the body (viewer's left, from the neck down the outside, back up the inside of the leg), mirrored for the other half.
  const HALF = [[54.5,26],[54,33],[48.5,37],[41,39.5],[35.5,43.5],[33.5,51],[34.5,62],[37,74],[39.5,86],[38,98],[34.5,110],[32.5,121],[33.5,134],[36,152],[38,168],[38,182],[40,198],[40.5,206],[38,211.5],[46,213.5],[51.5,211.5],[51.5,204],[53,186],[54,168],[56,150],[58,139],[60,136]];
  // One arm (viewer's left), drawn behind the body and mirrored for the other.
  const ARM_PTS = [[38,40.5],[31.5,44],[28,53],[26,67],[24,83],[21.5,99],[19,113],[17,123],[17.5,130.5],[21,132.5],[23.5,127],[25,117],[27.5,103],[30.5,88],[32.5,74],[34,62],[35.5,53]];
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
  const ARMS = [smooth(ARM_PTS) + 'Z', smooth(ARM_PTS.map(([x, y]) => [120 - x, y])) + 'Z'];
  // Areas used to name a point: [cx, cy, rx, ry, label]. Middle areas (cx 60) get a left/right/centre side.
  const REG = {
    F: { head: [60,16,11,13,'Head'], chest: [60,58,19,12,'Chest'], upAbd: [60,80,17,9,'Upper abdomen'], rSide: [42,93,5,12,'Right side'], lSide: [78,93,5,12,'Left side'],
         lowAbd: [60,103,17,9,'Lower abdomen'], pelvis: [60,123,19,9,'Pelvis'], rThigh: [45.5,166,9,28,'Right leg'], lThigh: [74.5,166,9,28,'Left leg'],
         rArm: [25,88,6,42,'Right arm'], lArm: [95,88,6,42,'Left arm'] },
    B: { headB: [60,16,11,13,'Back of head'], upBack: [60,58,20,12,'Upper back'], midBack: [60,80,17,9,'Mid back'], lowL: [46,104,8,9,'Lower back, left'],
         lowC: [60,104,6,9,'Lower back'], lowR: [74,104,8,9,'Lower back, right'], sacrum: [60,124,19,10,'Tailbone and buttocks'], lThighB: [45.5,166,9,28,'Back of left leg'], rThighB: [74.5,166,9,28,'Back of right leg'],
         lArmB: [25,88,6,42,'Left arm'], rArmB: [95,88,6,42,'Right arm'] },
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
      ? `<circle cx="60" cy="96" r="1.1" fill="${pal.ink}" opacity=".45"/>`
      : `<path d="M60 36 V118" stroke="${pal.ink}" stroke-opacity=".18" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M46 50 q6 9 1 17 M74 50 q-6 9 -1 17" stroke="${pal.ink}" stroke-opacity=".14" fill="none"/>`;
    const live = opts.live ? ` class="body live" data-side="${side}"` : ' class="body"';
    return `<svg${live} width="${w}" height="${h}" viewBox="0 0 120 222" role="img" aria-label="${side === 'F' ? 'Front' : 'Back'} of body"><defs>${defs}</defs>` +
      ARMS.map(d => `<path class="bfill" d="${d}" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`).join('') +
      `<path class="bfill" d="${OUTLINE}" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}" stroke-linejoin="round"/>` +
      `<ellipse class="bfill" cx="60" cy="15.5" rx="10" ry="12" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}"/>${marks}${g}</svg>`;
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
