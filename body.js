/* The body map: one outline for front and back, and the places you can tap.
 * Region ids look like 'F.lowAbd' (front) or 'B.lowC' (back). They're saved in pain logs: don't rename them.
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
  // [cx, cy, rx, ry, label]
  const REG = {
    F: { head: [60,19,9,10,'Head'], chest: [60,60,15,9,'Chest'], upAbd: [60,83,13,8,'Upper abdomen'], rSide: [40,96,5,12,'Right side'], lSide: [80,96,5,12,'Left side'],
         lowAbd: [60,104,13,8,'Lower abdomen'], pelvis: [60,124,13,7,'Pelvis'], rThigh: [46,154,7,14,'Right thigh'], lThigh: [74,154,7,14,'Left thigh'] },
    B: { headB: [60,19,9,10,'Back of head'], upBack: [60,60,16,9,'Upper back'], midBack: [60,83,13,8,'Mid back'], lowL: [45,106,7,8,'Lower back, left'],
         lowC: [60,106,6,8,'Lower back'], lowR: [75,106,7,8,'Lower back, right'], sacrum: [60,125,13,7,'Tailbone'], lThighB: [46,154,7,14,'Back of left thigh'], rThighB: [74,154,7,14,'Back of right thigh'] },
  };
  const label = id => { const [s, k] = String(id).split('.'); return (REG[s] && REG[s][k]) ? REG[s][k][4] : id; };
  const ORDER = [...Object.keys(REG.F).map(k => 'F.' + k), ...Object.keys(REG.B).map(k => 'B.' + k)];
  let gid = 0;
  /* side: 'F' or 'B'. spots: { 'F.lowAbd': severity 0-2 }. pal: the current palette. opts: { live, thin } */
  function svg(side, spots, w, pal, opts = {}) {
    const h = Math.round(w * 222 / 120), id = 'bm' + (gid++);
    const defs = pal.sev.map((c, i) => `<radialGradient id="${id}s${i}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".55" stop-color="${c}" stop-opacity=".6"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('');
    const sw = opts.thin ? 2.6 : 1.5;
    let g = '';
    for (const [k, [x, y, rx, ry]] of Object.entries(REG[side])) {
      const s = spots[side + '.' + k];
      if (s != null) g += `<ellipse cx="${x}" cy="${y}" rx="${rx * 1.7}" ry="${ry * 1.6}" fill="url(#${id}s${s})"/>`;
      if (opts.live) g += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${s != null ? 'transparent' : pal.soft}" stroke-opacity=".45" stroke-dasharray="2.5 2.5" stroke-width="1"/>` +
        `<ellipse class="region" data-region="${side}.${k}" cx="${x}" cy="${y}" rx="${rx + 4}" ry="${ry + 3}" fill="transparent"><title>${REG[side][k][4]}</title></ellipse>`;
    }
    const marks = side === 'F'
      ? `<circle cx="60" cy="98" r="1.1" fill="${pal.ink}" opacity=".45"/>`
      : `<path d="M60 44 V120" stroke="${pal.ink}" stroke-opacity=".18" stroke-width="1.2" stroke-dasharray="3 3"/><path d="M47 56 q5 10 0 18 M73 56 q-5 10 0 18" stroke="${pal.ink}" stroke-opacity=".14" fill="none"/>`;
    return `<svg class="body" width="${w}" height="${h}" viewBox="0 0 120 222" role="img" aria-label="${side === 'F' ? 'Front' : 'Back'} of body"><defs>${defs}</defs>` +
      `<circle cx="60" cy="18" r="13" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}"/>` +
      `<path d="${OUTLINE}" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="${sw}" stroke-linejoin="round"/>${marks}${g}</svg>`;
  }
  window.ASTRA_BODY = { REG, label, ORDER, svg };
})();
