/* The body map: one outline for front and back. You tap anywhere on it; each tap is saved as a point,
 * and Astra names it from where it is (e.g. 'Pelvis, left').
 *
 * Zone ids look like 'F.lowAbd' (front, lower abdomen), or with the person's side added for the middle of the body:
 * 'F.lowAbd.L' / 'F.lowAbd.R'. Base ids (REG keys) are saved in pain logs: don't rename them.
 * On the front the person's right is on the viewer's left; on the back it's the other way round. */
(() => {
  /* The figure: a soft, female body with arms slightly away from the sides and legs together,
     drawn as one smooth outline (half of it below, mirrored for the other half). */
  function closed(pts) {
    const n = pts.length; let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d + 'Z';
  }
  // From the top of the head down the viewer's left side: head, neck, shoulder, arm, hand, inside of the arm, waist, hip, leg, foot.
  const HALF = [[60.0,4.0],[55.2,4.9],[52.3,6.2],[50.1,9.1],[48.8,12.6],[48.2,17.1],[48.3,21.9],[48.8,25.1],[49.6,28.3],[51.2,31.5],[53.4,34.4],[54.6,37.0],[54.7,39.2],[53.0,41.5],[48.5,43.4],[44.3,44.9],[40.1,47.2],[37.6,50.4],[36.4,54.6],[36.0,59.1],[35.4,64.8],[34.8,70.0],[34.3,77.0],[33.2,82.5],[31.9,87.3],[30.6,92.4],[29.8,97.5],[28.8,102.0],[26.4,104.6],[23.4,107.1],[21.4,111.0],[20.7,114.8],[21.1,118.6],[21.6,122.2],[23.0,124.8],[25.2,125.4],[27.3,123.9],[29.7,122.1],[31.9,121.1],[33.3,118.0],[34.6,114.8],[35.3,111.0],[36.0,106.2],[37.2,102.0],[38.5,98.8],[39.4,95.6],[40.5,92.4],[41.7,89.2],[42.5,86.0],[43.2,82.8],[43.7,78.3],[44.2,73.2],[44.7,69.7],[45.8,68.3],[46.9,69.6],[47.8,73.2],[48.2,77.7],[48.0,82.8],[47.5,86.3],[46.3,89.5],[44.9,92.7],[43.3,95.9],[42.2,99.1],[41.1,102.6],[40.5,107.1],[40.0,111.9],[39.8,116.7],[40.2,121.2],[41.0,124.7],[41.7,128.3],[42.6,132.7],[43.7,137.5],[44.6,142.3],[45.5,147.5],[46.2,153.2],[46.6,158.4],[46.4,164.1],[46.4,171.8],[46.9,178.2],[47.8,183.7],[49.0,189.4],[50.3,195.2],[51.7,200.3],[51.4,204.2],[48.9,207.4],[47.1,210.8],[47.5,214.0],[49.8,215.9],[54.9,216.3],[58.4,215.7]];
  const OUTLINE = closed([...HALF, ...HALF.slice(1).map(([x, y]) => [+(120 - x).toFixed(1), y]).reverse()]);
  // Light detail lines: front (bust, navel, fingers, knees, between the legs) and back (spine, shoulder blades, buttocks).
  const FINGERS = 'M24.8 120.6 L24.3 124.2 M27 121.2 L27 125 M29.1 120.8 L29.6 124.4 M95.2 120.6 L95.7 124.2 M93 121.2 L93 125 M90.9 120.8 L90.4 124.4';
  const KNEES = 'M49.5 158 Q52 159.6 54.5 158 M70.5 158 Q68 159.6 65.5 158';
  const DETAIL = {
    F: `M47.8 70 Q50.5 77.8 57.3 75.4 M72.2 70 Q69.5 77.8 62.7 75.4 M60 125 V213 ${FINGERS} ${KNEES}`,
    B: `M60 56 V100 M53 55 Q55.5 60 55 66 M67 55 Q64.5 60 65 66 M60 108 V125 M43.5 122.5 Q51 131 59.6 125.3 M76.5 122.5 Q69 131 60.4 125.3 M60 125.5 V213 ${FINGERS} ${KNEES}`,
  };
  // Areas used to name a point: [cx, cy, rx, ry, label]. Middle areas (cx 60) get a left/right/centre side.
  const REG = {
    F: { head: [60,18,12,15,'Head'], chest: [60,63,13,9,'Chest'], upAbd: [60,82,10,6,'Upper abdomen'], rSide: [46.5,88,3.5,10,'Right side'], lSide: [73.5,88,3.5,10,'Left side'],
         lowAbd: [60,101,11,7,'Lower abdomen'], pelvis: [60,116,20,8,'Pelvis'], rThigh: [52.5,172,7.5,40,'Right leg'], lThigh: [67.5,172,7.5,40,'Left leg'],
         rArm: [36,88,5.5,24,'Right arm'], lArm: [84,88,5.5,24,'Left arm'], rHand: [26.5,117,5,7,'Right hand'], lHand: [93.5,117,5,7,'Left hand'] },
    B: { headB: [60,18,12,15,'Back of head'], upBack: [60,62,14,10,'Upper back'], midBack: [60,82,11,6,'Mid back'], lowL: [49,99,6,7,'Lower back, left'],
         lowC: [60,99,4,7,'Lower back'], lowR: [71,99,6,7,'Lower back, right'], sacrum: [60,118,20,9,'Tailbone and buttocks'], lThighB: [52.5,172,7.5,40,'Back of left leg'], rThighB: [67.5,172,7.5,40,'Back of right leg'],
         lArmB: [36,88,5.5,24,'Left arm'], rArmB: [84,88,5.5,24,'Right arm'], lHandB: [26.5,117,5,7,'Left hand'], rHandB: [93.5,117,5,7,'Right hand'] },
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
    const sw = opts.thin ? 2.4 : 1.1;
    const pts = toPoints(spots).filter(p => p.s === side);
    let g = pts.map(p => `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.wide ? 12 : 9.5}" ry="${p.wide ? 11 : 9}" fill="url(#${id}s${p.sev ?? 0})"/>`).join('');
    if (opts.live) g += pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="2.6" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.2" pointer-events="none"/>`).join('');
    const marks = opts.thin ? '' : `<path d="${DETAIL[side]}" fill="none" stroke="${pal.ink}" stroke-opacity=".32" stroke-width=".7" stroke-linecap="round"/>` + (side === 'F' ? `<circle cx="60" cy="94" r=".9" fill="${pal.ink}" opacity=".4"/>` : '');
    const live = opts.live ? ` class="body live" data-side="${side}"` : ' class="body"';
    return `<svg${live} width="${w}" height="${h}" viewBox="0 0 120 222" role="img" aria-label="${side === 'F' ? 'Front' : 'Back'} of body"><defs>${defs}</defs>` +
      `<path class="bfill" d="${OUTLINE}" fill="${pal.card}" stroke="${pal.ink}" stroke-opacity=".5" stroke-width="${sw}" stroke-linejoin="round"/>${marks}${g}</svg>`;
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
