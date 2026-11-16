/* The body map: one outline for front and back. You tap anywhere on it; each tap is saved as a point,
 * and Astra names it from where it is (e.g. 'Pelvis, left').
 *
 * Zone ids look like 'F.lowAbd' (front, lower abdomen), or with the person's side added for the middle of the body:
 * 'F.lowAbd.L' / 'F.lowAbd.R'. Base ids (REG keys) are saved in pain logs: don't rename them.
 * On the front the person's right is on the viewer's left; on the back it's the other way round. */
(() => {
  /* The figure is built from smooth simple shapes (head, neck, torso, tapered arms and legs, hands, feet).
   It's drawn twice: once thick in ink (the outline), then filled on top, so all the parts share one clean outline. */
  function closed(pts) {
    const n = pts.length; let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d + 'Z';
  }
  const mir = pts => pts.map(([x, y]) => [120 - x, y]).reverse();
  const TORSO_HALF = [[60,33],[50,33.6],[42,35.5],[37.5,38.3],[34,43.5],[33.5,54],[35.5,64],[38.5,76],[40,87],[39,98],[35.5,108],[33.5,119],[35,129],[42,135],[52,137.5]];
  const ARM = [[37,39.5],[31,43],[28,51],[26.5,62],[25,75],[23,89],[21,103],[19.2,116],[19,121],[23.2,121.5],[24.8,116],[26.8,103],[29,90],[31.3,77],[33.5,65],[35,55]]
    .map(([x, y]) => [+(x - Math.max(0, y - 44) * 0.075).toFixed(1), y]);
  const LEG = [[34.5,122],[35,140],[37,158],[38.2,172],[38.5,186],[40.3,202],[41.5,207],[49.5,207],[50.8,201],[52.5,186],[53.2,172],[54.5,158],[56.8,145],[58.8,135],[52,128]];
  const PATHS = [closed(ARM), closed(mir(ARM)), closed(LEG), closed(mir(LEG)), closed([...TORSO_HALF, [60, 139], ...mir(TORSO_HALF).slice(0, -1)])];
  function shapes(fill, stroke, extra, cls) {
    const a = `fill="${fill}" stroke="${stroke}" stroke-width="${extra}" stroke-linejoin="round"${cls ? ` class="${cls}"` : ''}`;
    return `<ellipse cx="60" cy="16.5" rx="10" ry="12.3" ${a}/><path d="M55 24 L55 36 L65 36 L65 24Z" ${a}/>` +
      `<ellipse cx="15.3" cy="126" rx="3.9" ry="6.2" ${a}/><ellipse cx="104.7" cy="126" rx="3.9" ry="6.2" ${a}/>` +
      `<ellipse cx="45.2" cy="209.5" rx="5.6" ry="3" ${a}/><ellipse cx="74.8" cy="209.5" rx="5.6" ry="3" ${a}/>` +
      PATHS.map(d => `<path d="${d}" ${a}/>`).join('');
  }
  // Areas used to name a point: [cx, cy, rx, ry, label]. Middle areas (cx 60) get a left/right/centre side.
  const REG = {
    F: { head: [60,16,11,13,'Head'], chest: [60,56,19,12,'Chest'], upAbd: [60,80,17,9,'Upper abdomen'], rSide: [42.5,93,5,12,'Right side'], lSide: [77.5,93,5,12,'Left side'],
         lowAbd: [60,103,17,9,'Lower abdomen'], pelvis: [60,123,19,9,'Pelvis'], rThigh: [46,168,9,34,'Right leg'], lThigh: [74,168,9,34,'Left leg'],
         rArm: [21.5,86,7,44,'Right arm'], lArm: [98.5,86,7,44,'Left arm'] },
    B: { headB: [60,16,11,13,'Back of head'], upBack: [60,56,20,12,'Upper back'], midBack: [60,80,17,9,'Mid back'], lowL: [46,104,8,9,'Lower back, left'],
         lowC: [60,104,6,9,'Lower back'], lowR: [74,104,8,9,'Lower back, right'], sacrum: [60,124,19,10,'Tailbone and buttocks'], lThighB: [46,168,9,34,'Back of left leg'], rThighB: [74,168,9,34,'Back of right leg'],
         lArmB: [21.5,86,7,44,'Left arm'], rArmB: [98.5,86,7,44,'Right arm'] },
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
      `<g>${shapes(pal.ink, pal.ink, sw * 2)}</g><g>${shapes(pal.bg, 'none', 0, 'bfill')}</g>${marks}${g}</svg>`;
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
