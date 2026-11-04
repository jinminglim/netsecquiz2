/* =====================================================================
   NetDiag — a tiny dependency-free SVG renderer for network topologies
   and sequence (ladder) diagrams, used by the quiz and the study guide.
   ===================================================================== */
(function (global) {
  'use strict';

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let uid = 0;

  /* ---------- small drawing helpers ---------- */
  function arrow(x1, y1, x2, y2, c = '#fff', w = 1.8, h = 4.2) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const p1 = [x2 - h * Math.cos(a - 0.55), y2 - h * Math.sin(a - 0.55)];
    const p2 = [x2 - h * Math.cos(a + 0.55), y2 - h * Math.sin(a + 0.55)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<path d="M${x2},${y2}L${p1[0].toFixed(1)},${p1[1].toFixed(1)}L${p2[0].toFixed(1)},${p2[1].toFixed(1)}Z" fill="${c}"/>`;
  }

  /* ---------- device icons, centred on (0,0) ---------- */
  const ICON = {
    router: () =>
      `<path d="M-27,-5 V5 A27,9 0 0 0 27,5 V-5 Z" fill="#14589c"/>` +
      `<ellipse cx="0" cy="-5" rx="27" ry="9" fill="#3b8ad9" stroke="#14589c" stroke-width="1"/>` +
      arrow(-21, -5, -8, -5) + arrow(21, -5, 8, -5) + arrow(-2, -8, -9, -12) + arrow(2, -2, 9, 2),
    switch: () =>
      `<path d="M-28,-5 L-21,-12 L29,-12 L22,-5 Z" fill="#5aa6e8"/>` +
      `<rect x="-28" y="-5" width="50" height="16" fill="#1d6fb8"/>` +
      `<path d="M22,-5 L29,-12 L29,4 L22,11 Z" fill="#0f4c86"/>` +
      arrow(-22, -0.5, 15, -0.5, '#fff', 1.6) + arrow(15, 5.5, -22, 5.5, '#fff', 1.6),
    l3switch: () =>
      `<path d="M-19,-13 L-12,-20 L21,-20 L14,-13 Z" fill="#5aa6e8"/>` +
      `<rect x="-19" y="-13" width="33" height="33" fill="#1d6fb8"/>` +
      `<path d="M14,-13 L21,-20 L21,13 L14,20 Z" fill="#0f4c86"/>` +
      arrow(-2.5, 1, -2.5, -10) + arrow(-2.5, 6, -2.5, 17) + arrow(-5, 3.5, -16, 3.5) + arrow(0, 3.5, 11, 3.5),
    firewall: () =>
      `<rect x="-25" y="-17" width="50" height="34" rx="2" fill="#c0392b" stroke="#7b241c"/>` +
      `<g stroke="#f6cfc9" stroke-width="1.4">` +
      `<line x1="-25" y1="-6" x2="25" y2="-6"/><line x1="-25" y1="5.5" x2="25" y2="5.5"/>` +
      `<line x1="-8" y1="-17" x2="-8" y2="-6"/><line x1="9" y1="-17" x2="9" y2="-6"/>` +
      `<line x1="-17" y1="-6" x2="-17" y2="5.5"/><line x1="0" y1="-6" x2="0" y2="5.5"/><line x1="17" y1="-6" x2="17" y2="5.5"/>` +
      `<line x1="-8" y1="5.5" x2="-8" y2="17"/><line x1="9" y1="5.5" x2="9" y2="17"/></g>`,
    pc: () =>
      `<rect x="-19" y="-19" width="38" height="27" rx="2.5" fill="#2c3e50"/>` +
      `<rect x="-16" y="-16" width="32" height="21" fill="#d6e8fa"/>` +
      `<rect x="-3" y="8" width="6" height="5" fill="#2c3e50"/><rect x="-12" y="13" width="24" height="4" rx="1.5" fill="#2c3e50"/>`,
    laptop: () =>
      `<rect x="-17" y="-17" width="34" height="23" rx="2" fill="#2c3e50"/>` +
      `<rect x="-14.5" y="-14.5" width="29" height="18" fill="#d6e8fa"/>` +
      `<path d="M-23,7 H23 L27,13 H-27 Z" fill="#5d6d7e"/>`,
    server: () =>
      `<rect x="-14" y="-22" width="28" height="44" rx="3" fill="#34495e"/>` +
      `<rect x="-10" y="-17" width="20" height="4" rx="1" fill="#aab7c4"/>` +
      `<rect x="-10" y="-10" width="20" height="4" rx="1" fill="#aab7c4"/>` +
      `<rect x="-10" y="-3" width="20" height="4" rx="1" fill="#aab7c4"/>` +
      `<circle cx="7" cy="15" r="2.2" fill="#2ecc71"/>`,
    rack: () =>
      `<rect x="-38" y="-14" width="76" height="28" rx="3" fill="#2c3e50"/>` +
      `<rect x="-33" y="-9" width="22" height="18" rx="1" fill="#566573"/>` +
      `<g stroke="#2c3e50" stroke-width="1.2"><line x1="-33" y1="-3" x2="-11" y2="-3"/><line x1="-33" y1="3" x2="-11" y2="3"/></g>` +
      `<g fill="#aab7c4"><rect x="-6" y="-5" width="7" height="7"/><rect x="3" y="-5" width="7" height="7"/><rect x="12" y="-5" width="7" height="7"/><rect x="21" y="-5" width="7" height="7"/></g>` +
      `<circle cx="32" cy="-8" r="2" fill="#2ecc71"/>`,
    cloud: () =>
      `<path d="M-44,18 C-64,18 -64,-8 -43,-8 C-44,-30 -12,-34 -4,-17 C5,-36 40,-31 37,-8 C60,-10 62,18 41,18 Z" fill="#eef3f9" stroke="#8aa4bf" stroke-width="1.5"/>`,
    attacker: () =>
      `<rect x="-19" y="-19" width="38" height="27" rx="2.5" fill="#1c2833"/>` +
      `<rect x="-16" y="-16" width="32" height="21" fill="#17202a"/>` +
      `<text x="0" y="2" text-anchor="middle" font-size="16" fill="#e74c3c">&#9760;</text>` +
      `<rect x="-3" y="8" width="6" height="5" fill="#1c2833"/><rect x="-12" y="13" width="24" height="4" rx="1.5" fill="#1c2833"/>`,
    user: () =>
      `<circle cx="0" cy="-11" r="7" fill="#e6b47a" stroke="#8a6a3b"/>` +
      `<path d="M-13,16 C-13,1 13,1 13,16 Z" fill="#2e86c1"/>`,
    bus: () => ''
  };
  const HALF = { router: [27, 14], switch: [29, 12], l3switch: [21, 20], firewall: [25, 17], pc: [19, 19], laptop: [27, 17], server: [14, 22], rack: [38, 14], cloud: [62, 34], attacker: [19, 19], user: [13, 18], bus: [2, 2] };

  function nodeLabel(n) {
    const [hw, hh] = HALF[n.type] || [20, 20];
    const lines = [];
    if (n.label) lines.push({ t: n.label, b: true });
    (n.sub || []).forEach((s) => lines.push({ t: s, b: false }));
    if (!lines.length) return '';
    const pos = n.lp || 'below';
    const lh = 13;
    let x = n.x, y, anchor = 'middle';
    if (pos === 'below') y = n.y + hh + 14;
    else if (pos === 'above') y = n.y - hh - 6 - (lines.length - 1) * lh;
    else if (pos === 'left') { x = n.x - hw - 7; anchor = 'end'; y = n.y - ((lines.length - 1) * lh) / 2 + 4; }
    else if (pos === 'right') { x = n.x + hw + 7; anchor = 'start'; y = n.y - ((lines.length - 1) * lh) / 2 + 4; }
    else if (pos === 'inside') { y = n.y + 4; }
    if (n.lx !== undefined) x = n.lx;
    if (n.ly !== undefined) y = n.ly;
    if (n.la) anchor = n.la;
    return lines.map((l, i) =>
      `<text x="${x}" y="${y + i * lh}" text-anchor="${anchor}" class="nd-${l.b ? 'name' : 'sub'}">${esc(l.t)}</text>`).join('');
  }

  function loopbacks(n) {
    return (n.lo || []).map((lo) => {
      const len = lo.len || 34;
      const [hw, hh] = HALF[n.type] || [20, 20];
      let x1 = n.x, y1 = n.y, x2, y2, tx, ty, anchor = 'middle', tick;
      if (lo.dir === 'up') { y1 = n.y - hh; x2 = n.x; y2 = y1 - len; tick = `M${x2 - 7},${y2}H${x2 + 7}`; tx = x2 + 9; ty = y2 + 4; anchor = 'start'; }
      else if (lo.dir === 'down') { y1 = n.y + hh; x2 = n.x; y2 = y1 + len; tick = `M${x2 - 7},${y2}H${x2 + 7}`; tx = x2 + 9; ty = y2 + 2; anchor = 'start'; }
      else if (lo.dir === 'left') { x1 = n.x - hw; x2 = x1 - len; y2 = n.y; tick = `M${x2},${y2 - 7}V${y2 + 7}`; tx = x2 - 5; ty = y2 + 4; anchor = 'end'; }
      else { x1 = n.x + hw; x2 = x1 + len; y2 = n.y; tick = `M${x2},${y2 - 7}V${y2 + 7}`; tx = x2 + 5; ty = y2 + 4; anchor = 'start'; }
      if (lo.tx !== undefined) { tx = lo.tx; ty = lo.ty; anchor = lo.anchor || anchor; }
      const lines = Array.isArray(lo.t) ? lo.t : [lo.t];
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2c3e50" stroke-width="2"/><path d="${tick}" stroke="#2c3e50" stroke-width="2"/>` +
        lines.map((t, i) => `<text x="${tx}" y="${ty + i * 12}" text-anchor="${anchor}" class="nd-if">${esc(t)}</text>`).join('');
    }).join('');
  }

  function labelAt(p, t, cls, anchor = 'middle') {
    if (!t) return '';
    const lines = Array.isArray(t) ? t : [t];
    return lines.map((s, i) => `<text x="${p[0].toFixed(1)}" y="${(p[1] + i * 12).toFixed(1)}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`).join('');
  }

  function render(spec) {
    const id = 'nd' + (++uid);
    const W = spec.w || 600, H = spec.h || 300;
    const nodes = {};
    (spec.nodes || []).forEach((n) => { nodes[n.id] = n; });
    let out = `<svg class="netdiag" viewBox="0 0 ${W} ${H}" width="${W}" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg" role="img">`;
    out += `<defs><marker id="${id}h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="context-stroke"/></marker>` +
      `<marker id="${id}r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#c0392b"/></marker>` +
      `<marker id="${id}g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#1e8449"/></marker>` +
      `<marker id="${id}b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#1f618d"/></marker>` +
      `<marker id="${id}k" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#34495e"/></marker></defs>`;
    if (spec.title) out += `<text x="${W / 2}" y="16" text-anchor="middle" class="nd-title">${esc(spec.title)}</text>`;

    // zones
    (spec.zones || []).forEach((z) => {
      out += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="12" fill="${z.fill || '#eaf2fb'}" stroke="${z.stroke || '#9db8d6'}" stroke-dasharray="${z.dash ? '6 4' : ''}"/>`;
      if (z.label) out += `<text x="${z.lx !== undefined ? z.lx : z.x + 10}" y="${z.ly !== undefined ? z.ly : z.y + 17}" text-anchor="${z.anchor || 'start'}" class="nd-zone" fill="${z.color || '#3b5f86'}">${esc(z.label)}</text>`;
    });

    // links
    (spec.links || []).forEach((l) => {
      const a = nodes[l.a], b = nodes[l.b];
      if (!a || !b) return;
      const ax = a.x + (l.ao ? l.ao[0] : 0), ay = a.y + (l.ao ? l.ao[1] : 0);
      const bx = b.x + (l.bo ? l.bo[0] : 0), by = b.y + (l.bo ? l.bo[1] : 0);
      const color = l.color || '#34495e', wdt = l.width || 2;
      const dash = l.dash ? ` stroke-dasharray="${l.dash === true ? '6 4' : l.dash}"` : '';
      let mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (l.bend) {
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
        const cx = mx + (-dy / len) * l.bend, cy = my + (dx / len) * l.bend;
        out += `<path d="M${ax},${ay} Q${cx.toFixed(1)},${cy.toFixed(1)} ${bx},${by}" fill="none" stroke="${color}" stroke-width="${wdt}"${dash}/>`;
        mx = 0.25 * ax + 0.5 * cx + 0.25 * bx; my = 0.25 * ay + 0.5 * cy + 0.25 * by;
      } else if (l.elbow) {
        // orthogonal route: horizontal first ('h') or vertical first ('v')
        const pts = l.elbow === 'h' ? `${ax},${ay} ${bx},${ay} ${bx},${by}` : `${ax},${ay} ${ax},${by} ${bx},${by}`;
        out += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${wdt}"${dash}/>`;
      } else {
        out += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${color}" stroke-width="${wdt}"${dash}/>`;
      }
      if (l.channel) { // EtherChannel ellipse marker(s)
        const n = l.channel;
        for (let i = 0; i < n; i++) {
          const t = 0.4 + i * 0.2 / Math.max(1, n - 1);
          out += `<ellipse cx="${(ax + (bx - ax) * t).toFixed(1)}" cy="${(ay + (by - ay) * t).toFixed(1)}" rx="4" ry="10" fill="none" stroke="#c0392b" stroke-width="1.6"/>`;
        }
      }
      // automatic label positions
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      let nx = -uy, ny = ux; // normal
      const horiz = Math.abs(dx) >= Math.abs(dy);
      if (horiz && ny > 0) { nx = -nx; ny = -ny; }      // labels above horizontal-ish lines
      if (!horiz && nx < 0) { nx = -nx; ny = -ny; }     // labels right of vertical-ish lines
      const anchor = horiz ? 'middle' : 'start';
      const off = l.off || 10;
      const rA = Math.max(...(HALF[a.type] || [20, 20])) + 16;
      const rB = Math.max(...(HALF[b.type] || [20, 20])) + 16;
      const dA = Math.min(rA, len * 0.42), dB = Math.min(rB, len * 0.42);
      const pa = l.laP || [ax + ux * dA + nx * off, ay + uy * dA + ny * off + (horiz ? 0 : 4)];
      const pb = l.lbP || [bx - ux * dB + nx * off, by - uy * dB + ny * off + (horiz ? 0 : 4)];
      const pm = l.mP || [mx + nx * (off + 2), my + ny * (off + 2) + (horiz ? 0 : 4)];
      out += labelAt(pa, l.la, 'nd-if', l.laA || anchor) + labelAt(pb, l.lb, 'nd-if', l.lbA || anchor) + labelAt(pm, l.m, 'nd-net', l.mA || anchor);
    });

    // free arrows (traffic flows)
    (spec.arrows || []).forEach((r) => {
      const col = r.color || '#c0392b';
      const mk = col === '#1e8449' ? 'g' : col === '#1f618d' ? 'b' : col === '#34495e' ? 'k' : 'r';
      const pts = r.pts.map((p) => p.join(',')).join(' ');
      out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${r.width || 2}" ${r.dash === false ? '' : 'stroke-dasharray="5 4"'} marker-end="url(#${id}${mk})"${r.both ? ` marker-start="url(#${id}${mk})"` : ''}/>`;
      if (r.t) out += labelAt(r.tP || r.pts[0], r.t, 'nd-flow', r.tA || 'start').replace(/class="nd-flow"/g, `class="nd-flow" fill="${col}"`);
    });

    // nodes
    (spec.nodes || []).forEach((n) => {
      const icon = (ICON[n.type] || ICON.pc)();
      const sc = n.scale || 1;
      out += `<g transform="translate(${n.x},${n.y})${sc !== 1 ? ` scale(${sc})` : ''}">${icon}</g>`;
      if (n.inner) out += `<text x="${n.x}" y="${n.y + (n.type === 'cloud' ? 6 : 4)}" text-anchor="middle" class="nd-inner">${esc(n.inner)}</text>`;
      out += loopbacks(n) + nodeLabel(n);
    });

    // tags / badges (e.g. "ACL 100 in")
    (spec.tags || []).forEach((t) => {
      const w = t.w || (String(t.t).length * 6.3 + 12);
      const col = t.color || '#c0392b';
      out += `<rect x="${(t.x - w / 2).toFixed(1)}" y="${t.y - 10}" width="${w.toFixed(1)}" height="18" rx="9" fill="${col}"/>` +
        `<text x="${t.x}" y="${t.y + 3}" text-anchor="middle" class="nd-tag">${esc(t.t)}</text>`;
    });
    (spec.marks || []).forEach((m) => {
      if (m.k === 'x') out += `<g stroke="#c0392b" stroke-width="3" stroke-linecap="round"><line x1="${m.x - 6}" y1="${m.y - 6}" x2="${m.x + 6}" y2="${m.y + 6}"/><line x1="${m.x + 6}" y1="${m.y - 6}" x2="${m.x - 6}" y2="${m.y + 6}"/></g>`;
      else out += `<path d="M${m.x - 7},${m.y} L${m.x - 2},${m.y + 5} L${m.x + 7},${m.y - 6}" fill="none" stroke="#1e8449" stroke-width="3" stroke-linecap="round"/>`;
    });
    (spec.texts || []).forEach((t) => {
      const lines = Array.isArray(t.t) ? t.t : [t.t];
      lines.forEach((s, i) => {
        out += `<text x="${t.x}" y="${t.y + i * (t.lh || 13)}" text-anchor="${t.a || 'start'}" class="nd-txt" style="font-size:${t.size || 11}px;fill:${t.color || '#2c3e50'};font-weight:${t.bold ? 700 : 400};${t.italic ? 'font-style:italic;' : ''}${t.mono ? 'font-family:var(--mono,monospace);' : ''}">${esc(s)}</text>`;
      });
    });
    out += '</svg>';
    return out;
  }

  /* ---------- sequence / ladder diagrams ---------- */
  function seq(spec) {
    const id = 'sq' + (++uid);
    const W = spec.w || 560, H = spec.h || 260;
    const act = {};
    (spec.actors || []).forEach((a) => { act[a.id] = a; });
    let out = `<svg class="netdiag" viewBox="0 0 ${W} ${H}" width="${W}" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">`;
    out += `<defs><marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="context-stroke"/></marker></defs>`;
    const top = spec.top || 8;
    (spec.actors || []).forEach((a) => {
      const w = a.w || Math.max(90, a.name.length * 7.2 + 18);
      out += `<rect x="${a.x - w / 2}" y="${top}" width="${w}" height="26" rx="6" fill="${a.fill || '#1d6fb8'}"/>` +
        `<text x="${a.x}" y="${top + 17}" text-anchor="middle" class="sq-actor">${esc(a.name)}</text>` +
        `<line x1="${a.x}" y1="${top + 26}" x2="${a.x}" y2="${H - 6}" stroke="#9aa9b8" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    });
    (spec.bands || []).forEach((b) => {
      out += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${b.fill || '#fdf2e9'}" stroke="${b.stroke || '#e59866'}"/>` +
        (b.t ? `<text x="${b.x + b.w / 2}" y="${b.y + 14}" text-anchor="middle" class="sq-note">${esc(b.t)}</text>` : '');
    });
    (spec.msgs || []).forEach((m) => {
      const a = act[m.from], b = act[m.to];
      const y1 = m.y, y2 = m.y2 !== undefined ? m.y2 : m.y;
      const col = m.color || '#2c3e50';
      const dir = b.x > a.x ? 1 : -1;
      let x2 = b.x - dir * 3;
      if (m.lost) x2 = a.x + (b.x - a.x) * 0.72;
      const ly2 = m.lost ? y1 + (y2 - y1) * 0.72 : y2;
      out += `<line x1="${a.x}" y1="${y1}" x2="${x2}" y2="${ly2}" stroke="${col}" stroke-width="2" ${m.dash ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#${id}a)"/>`;
      if (m.lost) out += `<g stroke="#c0392b" stroke-width="3" stroke-linecap="round"><line x1="${x2 + 4}" y1="${ly2 - 7}" x2="${x2 + 16}" y2="${ly2 + 5}"/><line x1="${x2 + 16}" y1="${ly2 - 7}" x2="${x2 + 4}" y2="${ly2 + 5}"/></g>`;
      if (m.t) {
        const tx = m.tx !== undefined ? m.tx : (m.lost ? (a.x + x2) / 2 : (a.x + b.x) / 2);
        const ty = m.ty !== undefined ? m.ty : (y1 + y2) / 2 - 6;
        const lines = Array.isArray(m.t) ? m.t : [m.t];
        lines.forEach((s, i) => { out += `<text x="${tx}" y="${ty + i * 12 - (lines.length - 1) * 12}" text-anchor="middle" class="sq-msg" style="fill:${col}">${esc(s)}</text>`; });
      }
    });
    (spec.notes || []).forEach((n) => {
      const lines = Array.isArray(n.t) ? n.t : [n.t];
      lines.forEach((s, i) => {
        out += `<text x="${n.x}" y="${n.y + i * 12}" text-anchor="${n.a || 'start'}" class="sq-note" style="fill:${n.color || '#5d6d7e'};font-weight:${n.bold ? 700 : 400}">${esc(s)}</text>`;
      });
    });
    out += '</svg>';
    return out;
  }

  /* =====================================================================
     PRESETS — the lab topologies used throughout Topic 2 & 3.
     Each preset returns a spec; pass {extra:{tags:[],arrows:[],marks:[],texts:[]}} to annotate.
     ===================================================================== */
  function merge(spec, extra) {
    if (!extra) return spec;
    ['tags', 'arrows', 'marks', 'texts', 'zones', 'nodes', 'links'].forEach((k) => {
      if (extra[k]) spec[k] = (spec[k] || []).concat(extra[k]);
    });
    if (extra.h) spec.h = extra.h;
    if (extra.w) spec.w = extra.w;
    return spec;
  }

  const P = {};

  // Lab 2.1a / 2.1b — standard & extended ACL topology
  P.aclLab = (o = {}) => merge({
    w: 640, h: 360,
    nodes: [
      { id: 'R1', type: 'router', x: 320, y: 62, label: 'R1', lp: 'below', ly: 92,
        lo: [{ dir: 'up', len: 26, t: o.lo1 ? ['Lo0 209.165.200.225/27', 'Lo1 209.165.201.1/27'] : 'Lo0 209.165.200.225/27' }] },
      { id: 'DSW1', type: 'l3switch', x: 170, y: 150, label: 'DSW1', lp: 'left', lx: 108, ly: 186, sub: ['VLAN1 192.168.10.1'],
        lo: [{ dir: 'left', len: 26, t: 'Lo0 192.168.30.1/24', tx: 120, ty: 134, anchor: 'end' }] },
      { id: 'DSW2', type: 'l3switch', x: 470, y: 150, label: 'DSW2', lp: 'right', lx: 532, ly: 186, la: 'start', sub: ['VLAN1 192.168.20.1'],
        lo: [{ dir: 'right', len: 26, t: 'Lo0 192.168.40.1/24', tx: 520, ty: 134, anchor: 'start' }] },
      { id: 'SW1', type: 'switch', x: 170, y: 235, label: 'SW1', lp: 'left' },
      { id: 'SW2', type: 'switch', x: 470, y: 235, label: 'SW2', lp: 'right' },
      { id: 'PCA', type: 'pc', x: 170, y: 305, label: 'PC-A', lp: 'left', sub: ['192.168.10.3'] },
      { id: 'PCB', type: 'pc', x: 470, y: 305, label: 'PC-B', lp: 'right', sub: ['192.168.20.3'] }
    ],
    links: [
      { a: 'R1', b: 'DSW1', la: 'G0/0/1', lb: 'G1/0/1', m: '10.1.1.0/30', laP: [266, 70], lbP: [222, 120], mP: [218, 88] },
      { a: 'R1', b: 'DSW2', la: 'G0/1/1', lb: 'G1/0/24', m: '10.2.2.0/30', laP: [376, 70], lbP: [420, 120], mP: [424, 88] },
      { a: 'DSW1', b: 'SW1', la: 'G1/0/10', lb: 'G1/0/5', laP: [178, 186], lbP: [178, 214] },
      { a: 'DSW2', b: 'SW2', la: 'G1/0/10', lb: 'G1/0/5', laP: [478, 186], lbP: [478, 214] },
      { a: 'SW1', b: 'PCA', la: 'G1/0/6', laP: [180, 262] },
      { a: 'SW2', b: 'PCB', la: 'G1/0/18', laP: [480, 262] }
    ],
    texts: [{ x: 170, y: 352, t: '192.168.10.0/24', a: 'middle', color: '#1f618d' }, { x: 470, y: 352, t: '192.168.20.0/24', a: 'middle', color: '#1f618d' }]
  }, o.extra);

  // Lab 2.2 — Firepower/ASA with inside / dmz / outside
  P.asaLab = (o = {}) => merge({
    w: 660, h: 330,
    zones: [
      { x: 10, y: 30, w: 205, h: 240, label: 'Inside (security-level 100)', fill: '#eaf5ea', stroke: '#8fc79a', color: '#1e6b33' },
      { x: 250, y: 205, w: 190, h: 118, label: 'DMZ (security-level 50)', fill: '#fef5e7', stroke: '#f0c27b', color: '#9a6212', lx: 258, ly: 316 },
      { x: 440, y: 30, w: 212, h: 240, label: 'Outside (security-level 0)', fill: '#fdedec', stroke: '#e6a19a', color: '#922b21' }
    ],
    nodes: [
      { id: 'PC1', type: 'pc', x: 60, y: 85, label: 'Inside User 1', sub: [o.in1 || '10.0.0.25'] },
      { id: 'PC2', type: 'pc', x: 60, y: 200, label: 'Inside User 2', sub: [o.in2 || '10.0.0.37'] },
      { id: 'SW', type: 'switch', x: 150, y: 140 },
      { id: 'FW', type: 'firewall', x: 335, y: 140, label: o.fwName || 'Firepower/ASA', lp: 'above' },
      { id: 'SRV', type: 'server', x: 335, y: 262, label: 'DMZ Web Server', lp: 'right', sub: [o.dmzIp || '192.168.2.100'] },
      { id: 'NET', type: 'cloud', x: 545, y: 140, inner: 'Internet' },
      { id: 'WEB', type: 'server', x: 610, y: 70, label: 'Internet Web Server', lp: 'left', sub: [o.webIp || '45.10.20.30'] },
      { id: 'OU', type: 'laptop', x: 600, y: 222, label: 'User on the Internet', lp: 'below', sub: [o.outIp || '23.1.2.10'] }
    ],
    links: [
      { a: 'PC1', b: 'SW' }, { a: 'PC2', b: 'SW' },
      { a: 'SW', b: 'FW', la: '', lb: 'E1/5 inside', m: '10.0.0.1/24', lbP: [262, 128], mP: [228, 160] },
      { a: 'FW', b: 'SRV', la: 'E1/3 dmz', laP: [343, 184], m: '192.168.2.254/24', mP: [343, 198] },
      { a: 'FW', b: 'NET', la: 'E1/1 outside', laP: [418, 128], m: '23.1.2.3/24', mP: [418, 160] },
      { a: 'NET', b: 'WEB', bo: [-8, 10] }, { a: 'NET', b: 'OU' }
    ]
  }, o.extra);

  // Lab 2.5 / 2.6 — Firepower 1010 with PC-A (inside), Web Server (dmz), Attacker (outside)
  P.fpLab = (o = {}) => merge({
    w: 620, h: 270,
    nodes: [
      { id: 'PCA', type: 'laptop', x: 70, y: 80, label: 'PC-A', sub: [o.pcA || '10.0.0.10'] },
      { id: 'FW', type: 'firewall', x: 310, y: 80, label: 'Firepower 1010', lp: 'above' },
      { id: 'ATK', type: 'attacker', x: 550, y: 80, label: 'Attacker', sub: [o.atk || '23.1.2.66'] },
      { id: 'WEB', type: 'laptop', x: 310, y: 210, label: 'PC-B Web Server', lp: 'right', sub: [o.web || '192.168.2.100'] }
    ],
    links: [
      { a: 'PCA', b: 'FW', lb: 'inside E1/5', lbP: [245, 70], m: o.inNet || '10.0.0.0/24 (sec 100)', mP: [170, 100] },
      { a: 'FW', b: 'ATK', la: 'outside E1/1', laP: [378, 70], m: o.outNet || '23.1.2.0/24 (sec 0)', mP: [450, 100] },
      { a: 'FW', b: 'WEB', la: 'dmz E1/3', laP: [318, 122], m: o.dmzNet || '192.168.2.0/24 (sec 50)', mP: [318, 140] }
    ]
  }, o.extra);

  // Lab 3.1 — secure remote access with jump host + VRF
  P.jumpLab = (o = {}) => merge({
    w: 660, h: 300,
    zones: [{ x: 430, y: 20, w: 220, h: 250, label: 'Supermicro server (Proxmox)', fill: '#f4f6f7', stroke: '#aab7b8', color: '#424949' }],
    nodes: [
      { id: 'LT', type: 'laptop', x: 60, y: 140, label: 'Laptop', sub: ['(network engineer', 'on the Internet)', o.lt || ''] },
      { id: 'R1', type: 'router', x: 240, y: 140, label: 'R1', lp: 'above', sub: ['Catalyst 8200L'] },
      { id: 'SM', type: 'rack', x: 540, y: 150 }
    ],
    links: [
      { a: 'LT', b: 'R1', lb: 'G0/0/0', lbP: [188, 130], m: o.n0 || '', mP: [140, 160] },
      { a: 'R1', b: 'SM', ao: [20, -6], bo: [-38, -8], bend: -36, la: 'G0/0/1', laP: [304, 104], lb: 'LAN 2 (eno2)', lbP: [452, 105], m: o.n1 || '', mP: [380, 92] },
      { a: 'R1', b: 'SM', ao: [20, 4], bo: [-38, 8], bend: 36, color: '#16a085', la: 'G0/1/1 (VRF ' + (o.vrf || 'OOB') + ')', laP: [258, 180], laA: 'start', lb: 'LAN 3 (eno5)', lbP: [452, 210], m: o.n2 || '', mP: [380, 222] }
    ],
    texts: [
      { x: 540, y: 58, t: 'Jump Server VM (SSH)', a: 'middle', bold: true, size: 12 },
      { x: 540, y: 73, t: 'ens18 → vmbr1 → eno2 (LAN 2)', a: 'middle', size: 10.5 },
      { x: 540, y: 87, t: o.vm1 || '', a: 'middle', size: 10.5, color: '#1f618d' },
      { x: 540, y: 238, t: 'ens19 → vmbr2 → eno5 (LAN 3)', a: 'middle', size: 10.5 },
      { x: 540, y: 252, t: o.vm2 || '', a: 'middle', size: 10.5, color: '#16a085' },
      { x: 360, y: 290, t: 'Green = Out-of-Band (OOB) management network', a: 'middle', size: 10.5, color: '#16a085' }
    ]
  }, o.extra);

  // Lab 3.2–3.4 — AAA client switch + TACACS+ + RADIUS servers
  P.aaaLab = (o = {}) => merge({
    w: 620, h: 260,
    nodes: [
      { id: 'PC', type: 'laptop', x: 70, y: 130, label: 'Admin PC', sub: [o.pc || '192.168.1.3'] },
      { id: 'SW', type: 'switch', x: 270, y: 130, label: o.sw || 'SW1 (AAA client)', sub: [o.swIp || 'VLAN1 192.168.1.2'] },
      { id: 'TAC', type: 'server', x: 440, y: 60, label: 'TACACS+ server', lp: 'right', sub: ['TACACS.net (Windows)', o.tac || '192.168.1.11'] },
      { id: 'RAD', type: 'server', x: 440, y: 200, label: 'RADIUS server', lp: 'right', sub: ['FreeRADIUS (Kali)', o.rad || '192.168.1.12'] }
    ],
    links: [
      { a: 'PC', b: 'SW', m: 'Console + SSH', mP: [170, 120] },
      { a: 'SW', b: 'TAC', m: 'TCP 49', mP: [365, 86] },
      { a: 'SW', b: 'RAD', m: 'UDP 1812/1813', mP: [330, 190] }
    ]
  }, o.extra);

  // Lab 3.5 — Syslog & NTP
  P.syslogLab = (o = {}) => merge({
    w: 600, h: 170,
    nodes: [
      { id: 'R1', type: 'router', x: 80, y: 70, label: 'R1', sub: [o.r1 || 'NTP Server'] },
      { id: 'R2', type: 'router', x: 300, y: 70, label: 'R2', sub: [o.r2 || 'NTP Client / Syslog client'] },
      { id: 'PCB', type: 'pc', x: 515, y: 70, label: 'PC-B', sub: [o.pcb || 'Syslog Server (Tftpd64)', '172.16.2.3'] }
    ],
    links: [
      { a: 'R1', b: 'R2', la: 'G0/0/1', lb: 'G0/0/1', m: '10.1.1.0/30', laP: [140, 60], lbP: [240, 60], mP: [190, 90] },
      { a: 'R2', b: 'PCB', la: 'G0/0/0', laP: [360, 60], m: '172.16.2.0/24', mP: [420, 90] }
    ],
  }, o.extra);

  // Lab 3.6 — Flexible NetFlow
  P.netflowLab = (o = {}) => merge({
    w: 640, h: 270,
    nodes: [
      { id: 'R1', type: 'router', x: 150, y: 90, label: 'R1', sub: ['NTP Server'], lo: [{ dir: 'left', len: 30, t: ['Loopback0', '10.0.0.1/24'], tx: 88, ty: 72, anchor: 'end' }] },
      { id: 'D1', type: 'l3switch', x: 340, y: 90, label: 'D1', lp: 'above', ly: 52, sub: [] },
      { id: 'A1', type: 'switch', x: 540, y: 90, label: 'A1', lp: 'above', ly: 62 },
      { id: 'PC1', type: 'pc', x: 340, y: 210, label: 'PC1', lp: 'right', sub: ['192.168.1.50', o.pc1 || 'NetFlow collector'] },
      { id: 'PC2', type: 'pc', x: 540, y: 210, label: 'PC2', lp: 'right', sub: ['192.168.1.75'] }
    ],
    links: [
      { a: 'R1', b: 'D1', la: 'G0/0/1 .1', lb: 'G1/0/11', laP: [210, 80], lbP: [292, 80] },
      { a: 'D1', b: 'A1', la: 'G1/0/5-6', lb: 'G1/0/1-2', laP: [392, 80], lbP: [490, 80], channel: 2, m: 'Po1 (trunk)', mP: [440, 110] },
      { a: 'D1', b: 'PC1', la: 'G1/0/23', laP: [348, 136] },
      { a: 'A1', b: 'PC2', la: 'G1/0/23', laP: [548, 136] }
    ],
    texts: [
      { x: 340, y: 22, t: '192.168.1.0/24   (D1 VLAN1 .2,  A1 VLAN1 .3)', a: 'middle', size: 11, color: '#1f618d' }
    ]
  }, o.extra);

  // Lab 3.1 notes Fig. 6 — 5-port router with VRF Red / Green
  P.vrf5 = (o = {}) => merge({
    w: 600, h: 300,
    nodes: [
      { id: 'R', type: 'router', x: 300, y: 150, scale: 1.6, label: o.name || 'R1', lp: 'below', ly: 186 },
      { id: 'S11', type: 'switch', x: 110, y: 50, label: '192.168.11.0/24', lp: 'above' },
      { id: 'S10', type: 'switch', x: 110, y: 255, label: '192.168.10.0/24', lp: 'below' },
      { id: 'S1', type: 'switch', x: 300, y: 40, label: '10.1.1.0/24', lp: 'above' },
      { id: 'S21', type: 'switch', x: 490, y: 50, label: '192.168.21.0/24', lp: 'above' },
      { id: 'S20', type: 'switch', x: 490, y: 255, label: '192.168.20.0/24', lp: 'below' }
    ],
    links: [
      { a: 'R', b: 'S11', color: '#c0392b', width: 3, la: 'Gi1/1', laP: [236, 102] },
      { a: 'R', b: 'S10', color: '#c0392b', width: 3, la: 'Gi0/1', laP: [240, 202] },
      { a: 'R', b: 'S1', width: 3, la: 'Gi2/0', laP: [308, 100] },
      { a: 'R', b: 'S21', color: '#1e8449', width: 3, la: 'Gi1/2', laP: [364, 102] },
      { a: 'R', b: 'S20', color: '#1e8449', width: 3, la: 'Gi0/2', laP: [360, 202] }
    ],
    texts: [
      { x: 150, y: 150, t: 'VRF Red', a: 'middle', bold: true, color: '#c0392b', size: 13 },
      { x: 450, y: 150, t: 'VRF Green', a: 'middle', bold: true, color: '#1e8449', size: 13 },
      { x: 346, y: 124, t: 'Global', a: 'start', bold: true, color: '#2c3e50', size: 11 }
    ]
  }, o.extra);

  // OoB vs in-band (Lab 3.1 notes Fig. 2)
  P.oob = (o = {}) => merge({
    w: 640, h: 300,
    nodes: [
      { id: 'MC', type: 'laptop', x: 60, y: 150, label: 'Out-of-band', sub: ['management client'] },
      { id: 'IC', type: 'laptop', x: 585, y: 150, label: 'In-band', sub: ['management client'] },
      { id: 'MB1', type: 'bus', x: 150, y: 30 }, { id: 'MB2', type: 'bus', x: 150, y: 285 },
      { id: 'PB1', type: 'bus', x: 495, y: 30 }, { id: 'PB2', type: 'bus', x: 495, y: 285 },
      { id: 'SW', type: 'switch', x: 320, y: 60, label: 'Switches', lp: 'above', ly: 40 },
      { id: 'RT', type: 'router', x: 320, y: 125, label: 'Routers', lp: 'right', lx: 352, ly: 140 },
      { id: 'FW', type: 'firewall', x: 320, y: 190, label: 'Firewall', lp: 'right', lx: 350, ly: 205 },
      { id: 'SV', type: 'server', x: 320, y: 255, label: 'Servers (BMC/IPMI)', lp: 'right', lx: 340, ly: 268 }
    ],
    links: [
      { a: 'MB1', b: 'MB2', color: '#1e8449', width: 4 }, { a: 'PB1', b: 'PB2', color: '#1f618d', width: 4 },
      { a: 'MC', b: 'MB1', bo: [0, 120], color: '#1e8449' }, { a: 'IC', b: 'PB1', bo: [0, 120], color: '#1f618d' },
      { a: 'SW', b: 'MB1', bo: [0, 30], color: '#1e8449' }, { a: 'SW', b: 'PB1', bo: [0, 30], color: '#1f618d' },
      { a: 'RT', b: 'MB1', bo: [0, 95], color: '#1e8449' }, { a: 'RT', b: 'PB1', bo: [0, 95], color: '#1f618d' },
      { a: 'FW', b: 'MB1', bo: [0, 160], color: '#1e8449' }, { a: 'FW', b: 'PB1', bo: [0, 160], color: '#1f618d' },
      { a: 'SV', b: 'MB1', bo: [0, 225], color: '#1e8449' }, { a: 'SV', b: 'PB1', bo: [0, 225], color: '#1f618d' }
    ],
    texts: [
      { x: 150, y: 20, t: 'Management network (OoB)', a: 'middle', bold: true, color: '#1e8449' },
      { x: 495, y: 20, t: 'Main production network', a: 'middle', bold: true, color: '#1f618d' },
      { x: 235, y: 112, t: 'mgmt port', a: 'middle', size: 10, color: '#1e8449', italic: true }
    ]
  }, o.extra);

  // Jump host concept (Lab 3.1 notes Fig. 9)
  P.jumpConcept = (o = {}) => merge({
    w: 640, h: 190,
    nodes: [
      { id: 'I', type: 'cloud', x: 75, y: 80, inner: 'Internet' },
      { id: 'R', type: 'router', x: 210, y: 80, label: 'Router', sub: ['(+ ACL / firewall)'] },
      { id: 'J', type: 'server', x: 360, y: 80, label: 'Jump Host', sub: ['hardened Linux + SSH', '(in DMZ)'] },
      { id: 'O', type: 'cloud', x: 555, y: 80, inner: 'OOB Network' }
    ],
    links: [{ a: 'I', b: 'R' }, { a: 'R', b: 'J' }, { a: 'J', b: 'O', color: '#16a085', width: 3 }],
    arrows: [
      { pts: [[90, 160], [350, 160]], color: '#1f618d', both: true, t: 'SSH #1 (to jump host)', tP: [150, 178] },
      { pts: [[372, 160], [540, 160]], color: '#16a085', both: true, t: 'SSH #2 (to device)', tP: [400, 178] }
    ]
  }, o.extra);

  // Generic: LAN — R1 — Internet
  P.edge = (o = {}) => merge({
    w: 600, h: 180,
    nodes: [
      { id: 'PC', type: 'pc', x: 60, y: 80, label: o.pcName || 'PC-A', sub: [o.pcIp || '192.168.1.10'] },
      { id: 'SW', type: 'switch', x: 170, y: 80 },
      { id: 'R1', type: 'router', x: 320, y: 80, label: 'R1', sub: [o.rSub || ''] },
      { id: 'NET', type: 'cloud', x: 505, y: 80, inner: 'Internet' }
    ],
    links: [
      { a: 'PC', b: 'SW' },
      { a: 'SW', b: 'R1', lb: o.inIf || 'G0/0/0', lbP: [268, 70], m: o.lan || '192.168.1.0/24', mP: [240, 100] },
      { a: 'R1', b: 'NET', la: o.outIf || 'G0/0/1', laP: [372, 70], m: o.wan || '209.165.200.224/30', mP: [400, 100] }
    ]
  }, o.extra);

  // Notes example — Bob & Larry vs Server 1 / Server 2 (web + tftp)
  P.bobLarry = (o = {}) => merge({
    w: 660, h: 250,
    nodes: [
      { id: 'BOB', type: 'pc', x: 55, y: 60, label: 'Bob', sub: ['10.1.1.10'] },
      { id: 'LAR', type: 'pc', x: 55, y: 185, label: 'Larry', sub: ['10.1.1.20'] },
      { id: 'S1', type: 'switch', x: 160, y: 122 },
      { id: 'R1', type: 'router', x: 320, y: 122, label: 'R1', lp: 'above' },
      { id: 'S2', type: 'switch', x: 470, y: 122 },
      { id: 'SV1', type: 'server', x: 560, y: 55, label: 'Server 1', lp: 'right', sub: ['10.2.2.10', 'web + tftp'] },
      { id: 'SV2', type: 'server', x: 560, y: 190, label: 'Server 2', lp: 'right', sub: ['10.2.2.20', 'web + tftp'] }
    ],
    links: [
      { a: 'BOB', b: 'S1' }, { a: 'LAR', b: 'S1' },
      { a: 'S1', b: 'R1', lb: 'G0/0', lbP: [276, 112], m: '10.1.1.0/24', mP: [218, 142] },
      { a: 'R1', b: 'S2', la: 'G0/1', laP: [366, 112], m: '10.2.2.0/24', mP: [420, 142] },
      { a: 'S2', b: 'SV1' }, { a: 'S2', b: 'SV2' }
    ]
  }, o.extra);

  // Generic ladder diagrams
  P.ntpSeq = (o = {}) => seq({
    w: 600, h: 230,
    actors: [{ id: 'C', name: o.client || 'NTP client', x: 140 }, { id: 'S', name: o.server || 'NTP server', x: 460 }],
    msgs: [
      { from: 'C', to: 'S', y: 70, y2: 120, t: 'NTP request (UDP 123)', tx: 300, ty: 86, color: '#1f618d' },
      { from: 'S', to: 'C', y: 145, y2: 195, t: 'NTP reply', tx: 300, ty: 160, color: '#1e8449' }
    ],
    notes: [
      { x: 132, y: 74, t: 'T1 = ' + (o.t1 || '?'), a: 'end', bold: true },
      { x: 468, y: 124, t: 'T2 = ' + (o.t2 || '?'), bold: true },
      { x: 468, y: 149, t: 'T3 = ' + (o.t3 || '?'), bold: true },
      { x: 132, y: 199, t: 'T4 = ' + (o.t4 || '?'), a: 'end', bold: true },
      { x: 132, y: 88, t: '(client clock)', a: 'end' }, { x: 468, y: 163, t: '(server clock)' }
    ]
  });

  // Ladder diagrams shared by the guide and the Easy Learn page
  P.synSeq = () => seq({ w: 480, h: 220,
      actors: [{ id: 'A', name: 'Attacker (spoofed src)', x: 110, w: 160 }, { id: 'S', name: 'Web Server', x: 390, w: 110 }],
      msgs: [{ from: 'A', to: 'S', y: 60, t: 'SYN (src = random)', color: '#c0392b' },
        { from: 'S', to: 'A', y: 100, t: 'SYN-ACK → spoofed IP', color: '#1f618d', lost: true },
        { from: 'A', to: 'S', y: 140, t: 'SYN, SYN, SYN …', color: '#c0392b' }],
      notes: [{ x: 398, y: 180, t: 'SYN-RECV backlog full', color: '#c0392b', bold: true }, { x: 398, y: 194, t: '(512 in the lab)' }] });
  P.interceptSeq = () => seq({ w: 520, h: 220,
      actors: [{ id: 'C', name: 'Client', x: 70, w: 80 }, { id: 'F', name: 'Firepower', x: 260, w: 100 }, { id: 'S', name: 'Server', x: 450, w: 80 }],
      msgs: [{ from: 'C', to: 'F', y: 60, t: 'SYN', color: '#c0392b' }, { from: 'F', to: 'C', y: 95, t: 'SYN-ACK (cookie)', color: '#1f618d' },
        { from: 'C', to: 'F', y: 130, t: 'ACK (real clients only)', color: '#1e8449' }, { from: 'F', to: 'S', y: 165, t: 'SYN → … connect', color: '#1e8449' }],
      notes: [{ x: 260, y: 205, t: 'spoofed SYNs never reach the server', a: 'middle', bold: true }] });
  P.slowSeq = () => seq({ w: 600, h: 230,
      actors: [{ id: 'A', name: 'Attacker (slowhttptest)', x: 130, w: 170 }, { id: 'S', name: 'Web Server :80', x: 470, w: 140 }],
      msgs: [{ from: 'A', to: 'S', y: 60, t: 'TCP handshake completes (ESTABLISHED, not embryonic)', color: '#1e8449' },
        { from: 'A', to: 'S', y: 100, t: 'GET / HTTP/1.1\\r\\n Host: …\\r\\n', color: '#c0392b' },
        { from: 'A', to: 'S', y: 140, t: 'X-a: 1\\r\\n (≈10 s later)', color: '#c0392b' },
        { from: 'A', to: 'S', y: 180, t: 'X-a: 2\\r\\n (≈10 s later) … never \\r\\n\\r\\n', color: '#c0392b' }],
      notes: [{ x: 300, y: 218, t: '× hundreds of connections → all server slots reserved', a: 'middle', bold: true, color: '#c0392b' }] });
  P.tacSeq = () => seq({ w: 470, h: 420,
      actors: [{ id: 'C', name: 'AAA client', x: 100, w: 100 }, { id: 'S', name: 'TACACS+ server', x: 370, w: 130 }],
      msgs: [{ from: 'C', to: 'S', y: 55, t: 'START (authentication)' }, { from: 'S', to: 'C', y: 85, t: 'REPLY – request username' },
        { from: 'C', to: 'S', y: 115, t: 'CONTINUE – username' }, { from: 'S', to: 'C', y: 145, t: 'REPLY – request password' },
        { from: 'C', to: 'S', y: 175, t: 'CONTINUE – password' }, { from: 'S', to: 'C', y: 205, t: 'REPLY – PASS', color: '#1e8449' },
        { from: 'C', to: 'S', y: 265, t: 'Authorization REQUEST', color: '#8e44ad' }, { from: 'S', to: 'C', y: 295, t: 'RESPONSE (priv-lvl / view)', color: '#8e44ad' },
        { from: 'C', to: 'S', y: 340, t: 'Accounting REQUEST (start)', color: '#b9770e' }, { from: 'S', to: 'C', y: 370, t: 'RESPONSE', color: '#b9770e' }],
      notes: [{ x: 235, y: 232, t: 'TCP 49 · whole body encrypted', a: 'middle', bold: true }, { x: 235, y: 405, t: '…Stop record at logout', a: 'middle' }] });
  P.radSeq = () => seq({ w: 470, h: 400,
      actors: [{ id: 'C', name: 'AAA client', x: 100, w: 100 }, { id: 'S', name: 'RADIUS server', x: 370, w: 130 }],
      msgs: [{ from: 'C', to: 'S', y: 70, t: 'Access-Request (user, encrypted password)' },
        { from: 'S', to: 'C', y: 115, t: 'Access-Accept (+ priv-lvl / view AV-pairs)', color: '#1e8449' },
        { from: 'C', to: 'S', y: 200, t: 'Accounting-Request (Start)', color: '#b9770e' }, { from: 'S', to: 'C', y: 240, t: 'Accounting-Response', color: '#b9770e' },
        { from: 'C', to: 'S', y: 310, t: 'Accounting-Request (Stop)', color: '#b9770e' }, { from: 'S', to: 'C', y: 350, t: 'Accounting-Response', color: '#b9770e' }],
      notes: [{ x: 235, y: 150, t: 'authentication + authorization done (UDP 1812)', a: 'middle', bold: true }, { x: 235, y: 280, t: 'UDP 1813', a: 'middle', bold: true }] });

  global.NetDiag = { render, seq, presets: P, esc };

  /* ---------- helpers for question authors ---------- */
  // CLI block: prompts in normal weight, typed commands in bold, output lines plain, "!" comments grey.
  global.cli = function (txt) {
    const lines = String(txt).replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
    return '<pre class="cli">' + lines.map((l) => {
      const m = l.match(/^(\s*)([A-Za-z0-9_\-.@:~\\/]+(?:\([A-Za-z0-9\-]+\))?(?:\s?[#>$]))(\s?)(.*)$/);
      if (m && !/^\s*(?:\d|Total|Router\s)/.test(l)) return m[1] + '<span class="pr">' + esc(m[2]) + '</span>' + m[3] + '<b>' + esc(m[4]) + '</b>';
      if (/^\s*!/.test(l)) return '<span class="cm">' + esc(l) + '</span>';
      return esc(l);
    }).join('\n') + '</pre>';
  };
  // Config listing (no prompts) — everything bold except "!" comments.
  global.conf = function (txt) {
    const lines = String(txt).replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
    return '<pre class="cli">' + lines.map((l) => (/^\s*!/.test(l) ? '<span class="cm">' + esc(l) + '</span>' : '<b>' + esc(l) + '</b>')).join('\n') + '</pre>';
  };
  // Plain output block (show command output, logs).
  global.out = function (txt) {
    return '<pre class="cli out">' + esc(String(txt).replace(/^\n/, '').replace(/\n\s*$/, '')) + '</pre>';
  };
  global.D = P;
})(window);
