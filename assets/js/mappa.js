/* Mappa 3D Le Fornaci — leggera: un solo SVG, ridisegnato solo quando si gira o si inclina.
   Dati in window.LF (assets/js/dati.js, generato da build.py). */
(function () {
  'use strict';
  var box = document.querySelector('[data-mappa]');
  if (!box || !window.LF) return;
  var D = window.LF;
  var ROOT = box.getAttribute('data-root') || '../';
  var SPRITE = ROOT + 'assets/img/loghi.webp';
  var NS = 'http://www.w3.org/2000/svg';
  var catById = {}; D.categorie.forEach(function (c) { catById[c.id] = c; });

  var S = { piano: 'T', rot: -12, tilt: 50, k: 1, px: 0, py: 0, sel: null, hover: null, cat: 'tutti', q: '' };
  var svg = box.querySelector('svg.stage');
  var root = document.createElementNS(NS, 'g');
  var scene = document.createElementNS(NS, 'g');
  var marks = document.createElementNS(NS, 'g');
  root.appendChild(scene); svg.appendChild(root); svg.appendChild(marks);
  var MK = [];
  var pop = box.querySelector('.pop');
  var W = 0, H = 0, fitK = 1;

  function centerOf(piano) {
    var s = D.piani[piano].sagoma, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    s.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }
  function proj() {
    var r = S.rot * Math.PI / 180, t = S.tilt * Math.PI / 180, c = centerOf(S.piano);
    var cr = Math.cos(r), sr = Math.sin(r), ct = Math.cos(t), st = Math.sin(t);
    return {
      c: c, cr: cr, sr: sr, ct: ct, st: st,
      pt: function (x, y, z) { var dx = x - c.cx, dy = y - c.cy; return [cr * dx - sr * dy, (sr * dx + cr * dy) * ct - z * st]; },
      depth: function (x, y) { var dx = x - c.cx, dy = y - c.cy; return sr * dx + cr * dy; },
      matrix: function (z) {
        var a = cr, cc = -sr, b = sr * ct, d = cr * ct;
        return [a, b, cc, d, -(a * c.cx + cc * c.cy), -(b * c.cx + d * c.cy) - z * st];
      }
    };
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgb(' + Math.round(((n >> 16) & 255) * f) + ',' + Math.round(((n >> 8) & 255) * f) + ',' + Math.round((n & 255) * f) + ')';
  }
  function area(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
  function centroid(p) {
    var a = 0, x = 0, y = 0;
    for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length], f = p[i][0] * q[1] - q[0] * p[i][1]; a += f; x += (p[i][0] + q[0]) * f; y += (p[i][1] + q[1]) * f; }
    if (Math.abs(a) < 1e-6) return p[0];
    return [x / (3 * a), y / (3 * a)];
  }
  function matches(u) {
    if (S.cat === 'liberi') return u.stato === 'libero';
    if (S.cat !== 'tutti' && u.categoria !== S.cat) return false;
    if (!S.q) return true;
    var q = S.q.toLowerCase();
    return (u.nome || '').toLowerCase().indexOf(q) >= 0 || u.locale.toLowerCase() === q;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function logoSvg(i, x, y, w) {
    var col = i % 8, row = Math.floor(i / 8);
    return '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + (w / 2) + '" viewBox="' + (col * 240) + ' ' + (row * 120) + ' 240 120"><image href="' + SPRITE + '" width="1920" height="1080"/></svg>';
  }
  var ICON = {
    wc: '<path d="M-5-6a1.6 1.6 0 1 0 0 .1M5-6a1.6 1.6 0 1 0 0 .1M-7.5-3h5l1 5h-1.5v5h-2v-5h-1.5zM2.5-3h5l1.5 5.5h-1.8v4.5h-2v-4.5H2z" fill="#fff"/>',
    disabili: '<circle cx="-1" cy="-7" r="1.6" fill="#fff"/><path d="M-1-4v5h4l2 5M-3.5-1.5a4.2 4.2 0 1 0 6 5.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    fasciatoio: '<circle cx="0" cy="-4" r="2.6" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M-5 7v-2a5 5 0 0 1 10 0v2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    bancomat: '<text x="0" y="4.5" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Instrument Sans,sans-serif">€</text>',
    ascensore: '<rect x="-6" y="-8" width="12" height="16" rx="2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M-3-2l3-3 3 3M-3 2l3 3 3-3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    scale: '<path d="M-8 6h4l8-11h4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    telefono: '<path d="M-5-7l3 0 1 4-2 1.5a8 8 0 0 0 4.5 4.5L3 1l4 1v3a2 2 0 0 1-2 2A12 12 0 0 1-7-5a2 2 0 0 1 2-2z" fill="#fff"/>',
    amazon: '<text x="0" y="4.5" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Instrument Sans,sans-serif">a</text>'
  };

  function render() {
    var P = proj(), out = [], units = [];
    var filtering = S.cat !== 'tutti' || !!S.q;
    // sagoma del piano
    var slab = D.piani[S.piano].sagoma, sh = [];
    var m0 = P.matrix(0);
    out.push('<path d="M' + slab.map(function (p) { var q = P.pt(p[0], p[1], -10); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z" fill="#D8D0C4"/>');
    out.push('<g transform="matrix(' + m0.join(' ') + ')"><path d="M' + slab.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z" fill="#FFFFFF" stroke="#E2DBD1" stroke-width="1"/>');
    (D.aree[S.piano] || []).forEach(function (a) {
      var c = centroid(a.contorno);
      out.push('<path d="M' + a.contorno.map(function (p) { return p[0] + ' ' + p[1]; }).join('L') + 'Z" fill="#F1EDE7" stroke="#E2DBD1"/>');
      out.push('<text x="' + c[0] + '" y="' + (c[1] + 3) + '" text-anchor="middle" font-size="9" font-weight="700" fill="#8A837A">' + esc(a.nome) + '</text>');
    });
    out.push('</g>');
    // locali in ordine di profondità
    D.locali.forEach(function (u) {
      if (u.piano !== S.piano) return;
      var main = u.contorni[0];
      var big = Math.abs(area(main)) > 14000;
      var on = matches(u), dim = filtering && !on, picked = S.sel === u.locale, hov = S.hover === u.locale;
      var cat = catById[u.categoria];
      var top = '#F4F0EA', wall = '#DDD5C9', txt = '#6E675E';
      if (big) { top = '#EFE9E0'; wall = '#D3C9BB'; txt = '#2B2620'; }
      if (u.stato === 'libero') { top = '#FFFFFF'; wall = '#E9E2D8'; txt = '#B4472B'; }
      if (u.stato === 'nuova_apertura' && !filtering) { top = '#FBE4DB'; wall = '#E6BCAB'; txt = '#8E3520'; }
      if (filtering && on && cat && u.stato !== 'libero') { top = cat.colore; wall = shade(cat.colore, 0.78); txt = cat.testo; }
      if (dim) { top = '#F7F5F2'; wall = '#EAE5DE'; txt = '#C9C2B8'; }
      if (picked) { top = '#B4472B'; wall = '#8E3520'; txt = '#FFFFFF'; }
      var h = u.stato === 'libero' ? (u.locale === '7' ? 34 : 3) : (u.stato === 'da_verificare' ? 8 : (big ? 24 : 13));
      if (dim) h = 2; if (hov && !picked) h += 5; if (picked) h += 12;
      var c = centroid(main);
      units.push({ u: u, d: P.depth(c[0], c[1]), h: h, top: top, wall: wall, txt: txt, big: big, picked: picked, dim: dim, c: c });
    });
    units.sort(function (a, b) { return a.d - b.d; });
    var labels = [];
    units.forEach(function (o) {
      var u = o.u, h = o.h;
      var g = '<g class="u" data-n="' + esc(u.locale) + '">';
      if (S.tilt > 2) {
        u.contorni.forEach(function (p) {
          var sgn = area(p) > 0 ? 1 : -1, walls = [];
          for (var i = 0; i < p.length; i++) {
            var a = p[i], b = p[(i + 1) % p.length];
            var nx = (b[1] - a[1]) * sgn, ny = -(b[0] - a[0]) * sgn;
            var nry = nx * P.sr + ny * P.cr; if (nry <= 0) continue;
            var nrx = nx * P.cr - ny * P.sr, len = Math.hypot(nx, ny) || 1;
            var a0 = P.pt(a[0], a[1], 0), b0 = P.pt(b[0], b[1], 0), b1 = P.pt(b[0], b[1], h), a1 = P.pt(a[0], a[1], h);
            walls.push('<path d="M' + a0[0].toFixed(1) + ' ' + a0[1].toFixed(1) + 'L' + b0[0].toFixed(1) + ' ' + b0[1].toFixed(1) + 'L' + b1[0].toFixed(1) + ' ' + b1[1].toFixed(1) + 'L' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + 'Z" fill="' + (o.wall.charAt(0) === '#' ? shade(o.wall, 0.9 + 0.1 * (nrx / len)) : o.wall) + '"/>');
          }
          g += walls.join('');
        });
      }
      var m = P.matrix(h);
      g += '<g transform="matrix(' + m.map(function (v) { return v.toFixed(4); }).join(' ') + ')">';
      u.contorni.forEach(function (p) {
        g += '<path d="M' + p.map(function (q) { return q[0] + ' ' + q[1]; }).join('L') + 'Z" fill="' + o.top + '"' + (u.stato === 'libero' && !o.picked ? ' stroke="#D9A08E" stroke-width="1.2" stroke-dasharray="3 2"' : ' stroke="rgba(255,255,255,.7)" stroke-width=".8"') + '/>';
      });
      // logo stampato sul locale, sempre girato verso chi guarda (a passi di 90°)
      var showLogo = u.logo !== null && u.logo !== undefined && !o.dim;
      if (showLogo) {
        var k = ((Math.round(-S.rot / 90) % 4) + 4) % 4, odd = k % 2 === 1;
        var bx = odd ? u.logo_v : u.logo_o;
        if (bx) {
          var L = odd ? bx[3] : bx[2];
          if (L >= 13) {
            g += '<g transform="translate(' + bx[0] + ' ' + bx[1] + ') rotate(' + (k * 90) + ')"><rect x="' + (-L / 2) + '" y="' + (-L / 4) + '" width="' + L + '" height="' + (L / 2) + '" rx="2" fill="#fff"/>' + logoSvg(u.logo, -L / 2, -L / 4, L) + '</g>';
          } else showLogo = false;
        } else showLogo = false;
      }
      g += '</g></g>';
      out.push(g);
      var lp = P.pt(o.c[0], o.c[1], h);
      if (!showLogo) {
        var txt = o.big && u.nome ? u.nome : (u.stato === 'libero' && u.locale === '7' ? 'Prossimamente' : u.locale);
        var fs = o.big ? 17 : 8.5;
        labels.push('<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + fs * 0.35).toFixed(1) + '" text-anchor="middle" font-size="' + fs + '" font-weight="' + (o.big ? 800 : 700) + '" fill="' + o.txt + '" font-family="' + (o.big ? 'Bricolage Grotesque' : 'Instrument Sans') + ',sans-serif" pointer-events="none">' + esc(txt) + '</text>');
      }
      o.lp = lp;
    });
    out.push(labels.join(''));
    // servizi e ingressi: sempre dritti e della stessa grandezza a ogni zoom
    MK = []; var mk = [];
    var seen = [];
    (D.servizi[S.piano] || []).forEach(function (s) {
      if (seen.some(function (o) { return Math.hypot(o[0] - s[1], o[1] - s[2]) < 70 && o[2] === (s[0] === 'disabili' || s[0] === 'fasciatoio' ? 'wc' : s[0]); })) return;
      seen.push([s[1], s[2], s[0] === 'disabili' || s[0] === 'fasciatoio' ? 'wc' : s[0]]);
      var q = P.pt(s[1], s[2], 26); MK.push(q);
      mk.push('<g pointer-events="none"><circle r="12" fill="#2B3990" stroke="#fff" stroke-width="2"/>' + (ICON[s[0]] || '') + '</g>');
    });
    (D.ingressi[S.piano] || []).forEach(function (e) {
      var q = P.pt(e[0], e[1], 22); MK.push(q);
      mk.push('<g pointer-events="none"><rect x="-33" y="-12" width="66" height="24" rx="12" fill="#17140F"/><text y="4" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" font-family="Instrument Sans,sans-serif">Ingresso</text></g>');
    });
    scene.innerHTML = out.join('');
    marks.innerHTML = mk.join('');
    S._units = units;
    placePop();
  }

  function applyView() {
    root.setAttribute('transform', 'translate(' + (W / 2 + S.px).toFixed(1) + ' ' + (H / 2 + S.py).toFixed(1) + ') scale(' + S.k.toFixed(4) + ')');
    var ms = Math.max(0.75, Math.min(1.1, S.k / fitK)), kids = marks.childNodes;
    for (var i = 0; i < kids.length && i < MK.length; i++) kids[i].setAttribute('transform', 'translate(' + (W / 2 + S.px + S.k * MK[i][0]).toFixed(1) + ' ' + (H / 2 + S.py + S.k * MK[i][1]).toFixed(1) + ') scale(' + ms.toFixed(2) + ')');
    placePop();
  }
  function placePop() {
    if (!pop) return;
    var o = S.sel && (S._units || []).filter(function (x) { return x.u.locale === S.sel; })[0];
    if (!o || !o.lp) { pop.hidden = true; return; }
    pop.hidden = false;
    pop.style.left = (W / 2 + S.px + S.k * o.lp[0]) + 'px';
    pop.style.top = (H / 2 + S.py + S.k * o.lp[1]) + 'px';
  }
  function fillPop() {
    if (!pop) return;
    var u = D.locali.filter(function (x) { return x.locale === S.sel; })[0];
    if (!u) { pop.hidden = true; return; }
    var cat = catById[u.categoria], pianoNome = D.piani[u.piano].nome;
    var html = '<div class="row"><small>Locale ' + esc(u.locale) + ' · ' + esc(pianoNome) + '</small><button class="x" type="button" aria-label="Chiudi">×</button></div>';
    if (u.logo !== null && u.logo !== undefined) html += '<span class="logo" style="' + logoCss(u.logo) + '" role="img" aria-label="Logo ' + esc(u.nome) + '"></span>';
    if (u.stato === 'libero') {
      html += '<b>Prossimamente in apertura</b><div class="row" style="justify-content:flex-start;gap:6px"><span class="pill pill-new">' + (u.locale === '7' ? 'Su due piani' : 'Locale libero') + '</span></div><p>' + (u.locale === '7' ? 'L’unico locale del centro su due livelli. ' : '') + 'Vuoi aprire qui un negozio o un temporary?</p><a class="btn btn-dark" href="' + ROOT + 'apri-un-negozio/?locale=' + encodeURIComponent(u.locale) + '">Richiedi informazioni</a>';
    } else if (u.stato === 'da_verificare') {
      html += '<b>Locale ' + esc(u.locale) + '</b><p>Informazioni in aggiornamento.</p>';
    } else {
      html += '<b>' + esc(u.nome) + '</b><div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap"><span class="pill" style="background:' + cat.colore + ';color:' + cat.testo + ';border:0">' + esc(cat.nome) + '</span><span class="pill ' + (u.stato === 'nuova_apertura' ? 'pill-new">Nuova apertura' : 'pill-ok">Aperto oggi') + '</span></div><a class="btn btn-dark" href="' + ROOT + 'negozi/' + u.slug + '/">Vai alla vetrina</a>';
    }
    pop.innerHTML = html;
    pop.querySelector('.x').addEventListener('click', function () { select(null); });
  }
  function logoCss(i) { return 'background-position:' + ((i % 8) / 7 * 100).toFixed(3) + '% ' + (Math.floor(i / 8) / 8 * 100).toFixed(3) + '%'; }

  var raf = 0;
  function redraw() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; render(); applyView(); }); }
  function view() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; applyView(); }); }

  function fit() {
    var r = box.getBoundingClientRect(); W = r.width; H = r.height;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var P = proj(), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    D.locali.forEach(function (u) { if (u.piano !== S.piano) return; u.contorni.forEach(function (p) { p.forEach(function (q) { [0, 26].forEach(function (z) { var r = P.pt(q[0], q[1], z); x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0]); y0 = Math.min(y0, r[1]); y1 = Math.max(y1, r[1]); }); }); }); });
    fitK = Math.min((W - 24) / (x1 - x0), (H - 110) / (y1 - y0));
    S._fitC = [(x0 + x1) / 2, (y0 + y1) / 2 + 12];
  }
  function defRot() { return box.getBoundingClientRect().width < 640 && S.piano === 'T' ? -78 : -12; }
  function reset() { S.rot = defRot(); S.tilt = 50; fit(); S.k = fitK; S.px = -S.k * S._fitC[0]; S.py = -S.k * S._fitC[1]; redraw(); syncButtons(); }
  function select(n, center) {
    S.sel = n; fillPop();
    if (n && center) {
      var u = D.locali.filter(function (x) { return x.locale === n; })[0];
      if (u && u.piano !== S.piano) { S.piano = u.piano; syncButtons(); }
      if (u) {
        var c = centroid(u.contorni[0]), P = proj(), q = P.pt(c[0], c[1], 20);
        S.k = Math.max(S.k, fitK * 1.6);
        S.px = -S.k * q[0]; S.py = -S.k * q[1] + 120;
      }
    }
    redraw();
  }

  /* Gesti: mouse e touch */
  var ptrs = {}, g = null, moved = false, downT = null;
  svg.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  svg.addEventListener('pointerdown', function (e) {
    downT = e.target;
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { g = { kind: (e.button === 2 || e.shiftKey) ? 'orbit' : 'pan', x: e.clientX, y: e.clientY, s: { px: S.px, py: S.py, rot: S.rot, tilt: S.tilt } }; moved = false; }
    else if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      g = { kind: 'pinch', d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: { px: S.px, py: S.py, rot: S.rot, k: S.k } };
      moved = true;
    }
  });
  svg.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) {
      if (e.pointerType === 'mouse') {
        var t = e.target.closest && e.target.closest('.u'), n = t ? t.getAttribute('data-n') : null;
        if (n !== S.hover) { S.hover = n; redraw(); }
      }
      return;
    }
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!g) return;
    if (g.kind === 'pinch') {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      var d = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      S.k = Math.max(fitK * 0.6, Math.min(fitK * 6, g.s.k * d / g.d));
      S.px = g.s.px + (a.x + b.x) / 2 - g.mx; S.py = g.s.py + (a.y + b.y) / 2 - g.my;
      var nr = g.s.rot + (ang - g.ang) * 180 / Math.PI;
      if (Math.abs(nr - S.rot) > 0.5) { S.rot = nr; redraw(); } else view();
      return;
    }
    var dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    if (!moved) { moved = true; box.classList.add('dragging'); }
    if (g.kind === 'orbit') { S.rot = g.s.rot + dx * 0.4; S.tilt = Math.max(0, Math.min(62, g.s.tilt - dy * 0.3)); syncButtons(); redraw(); }
    else { S.px = g.s.px + dx; S.py = g.s.py + dy; view(); }
  });
  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    var left = Object.keys(ptrs);
    if (left.length === 0) {
      if (!moved && g && g.kind === 'pan') {
        var t = downT && downT.closest && downT.closest('.u');
        select(t ? t.getAttribute('data-n') : null);
      }
      g = null; box.classList.remove('dragging');
    } else if (g && g.kind === 'pinch') {
      var p = ptrs[left[0]]; g = { kind: 'pan', x: p.x, y: p.y, s: { px: S.px, py: S.py } }; moved = true;
    }
  }
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = box.getBoundingClientRect(), mx = e.clientX - r.left - W / 2, my = e.clientY - r.top - H / 2;
    var nk = Math.max(fitK * 0.6, Math.min(fitK * 6, S.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    var X = (mx - S.px) / S.k, Y = (my - S.py) / S.k;
    S.px = mx - nk * X; S.py = my - nk * Y; S.k = nk; view();
  }, { passive: false });

  /* Pulsanti */
  function on(sel, fn) { var el = box.querySelector(sel); if (el) el.addEventListener('click', fn); }
  on('[data-z="+"]', function () { S.k = Math.min(fitK * 6, S.k * 1.25); view(); });
  on('[data-z="-"]', function () { S.k = Math.max(fitK * 0.6, S.k / 1.25); view(); });
  on('[data-rot]', function () { S.rot += 45; redraw(); });
  on('[data-tilt]', function () { S.tilt = S.tilt > 5 ? 0 : 50; syncButtons(); redraw(); });
  on('[data-reset]', reset);
  box.querySelectorAll('[data-piano]').forEach(function (b) {
    b.addEventListener('click', function () { S.piano = b.getAttribute('data-piano'); S.sel = null; fillPop(); reset(); });
  });
  function syncButtons() {
    box.querySelectorAll('[data-piano]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-piano') === S.piano ? 'true' : 'false'); });
    var t = box.querySelector('[data-tilt]'); if (t) { t.textContent = S.tilt > 5 ? '2D' : '3D'; t.setAttribute('aria-label', S.tilt > 5 ? 'Vista dall’alto' : 'Vista 3D'); }
  }

  /* Filtri, ricerca ed elenco (l'elenco è già nella pagina: qui si filtra soltanto) */
  var chips = document.querySelectorAll('[data-cat]');
  function syncList() {
    chips.forEach(function (c) {
      var id = c.getAttribute('data-cat'), onn = id === S.cat, col = c.getAttribute('data-col') || '#17140F';
      c.setAttribute('aria-pressed', onn ? 'true' : 'false');
      c.style.background = onn ? col : '#fff'; c.style.borderColor = onn ? col : '#D6CFC5'; c.style.color = onn ? (c.getAttribute('data-ink') || '#fff') : '#17140F';
    });
    var count = 0;
    document.querySelectorAll('[data-shop]').forEach(function (a) {
      var u = { categoria: a.getAttribute('data-c'), nome: a.getAttribute('data-name'), locale: a.getAttribute('data-shop'), stato: a.getAttribute('data-st') };
      var ok = matches(u); a.hidden = !ok; if (ok) count++;
    });
    document.querySelectorAll('[data-group]').forEach(function (gr) { gr.hidden = !gr.querySelector('[data-shop]:not([hidden])'); });
    var tot = document.querySelector('[data-total]'); if (tot) tot.textContent = count + (count === 1 ? ' risultato' : ' risultati');
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { S.cat = c.getAttribute('data-cat'); syncList(); redraw(); }); });
  var search = document.querySelector('[data-search]');
  if (search) search.addEventListener('input', function () {
    S.q = search.value.trim(); syncList();
    var hits = D.locali.filter(function (u) { return u.nome && matches(u); });
    if (S.q && hits.length === 1) select(hits[0].locale, true); else redraw();
  });
  document.querySelectorAll('[data-shop]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault(); select(a.getAttribute('data-shop'), true);
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  window.addEventListener('resize', function () { var ok = S.k / fitK; fit(); S.k = fitK * ok; redraw(); });
  syncButtons(); syncList(); reset();
  var want = new URLSearchParams(location.search).get('locale') || (location.hash || '').slice(1);
  if (want && D.locali.some(function (u) { return u.locale === want; })) select(want, true);
})();
