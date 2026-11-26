/* Le Fornaci — Fornaci Club (tessera, punti, premi) e Gift card.
   VERSIONE DIMOSTRATIVA: tutto resta sul telefono di chi prova (localStorage), nessun pagamento vero.
   Con il motore collegato, le stesse funzioni passeranno dal Foglio Google. */
(function () {
  'use strict';
  var KEY = 'lf_club_v1', CONF = window.LF_CONF || {}, CLUB = CONF.club || { benvenuto: 50, compleanno: 100, euro_per_punto: 1, premi: [] }, GC = CONF.giftcard || { design: [] };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(n, set) { set = set || '0123456789'; var o = '', a = new Uint32Array(n); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 1e9; }); for (var i = 0; i < n; i++) o += set[a[i] % set.length]; return o; }
  var AZ = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function oggi() { return new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function euro(n) { return (Math.round(n * 100) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0 }); }
  function scadenza(mesi) { var d = new Date(); d.setMonth(d.getMonth() + (mesi || 12)); return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function mov(d, testo, punti) { d.movimenti = d.movimenti || []; d.movimenti.unshift({ data: oggi(), testo: testo, punti: punti }); d.punti = (d.punti || 0) + punti; }

  var FC = {
    conf: CLUB, gc: GC, esc: esc, euro: euro,
    dati: load,
    socio: function () { return load().socio || null; },
    iscrivi: function (s) {
      var d = load(); if (d.socio) return d.socio;
      s.numero = 'LF ' + rnd(4) + ' ' + rnd(4) + ' ' + rnd(4); s.dal = oggi(); d.socio = s; d.punti = 0;
      mov(d, 'Benvenuto nel ' + (CLUB.nome || 'Fornaci Club'), CLUB.benvenuto || 0);
      if (s.nascita) { var n = new Date(s.nascita), t = new Date(); if (n.getDate() === t.getDate() && n.getMonth() === t.getMonth()) mov(d, 'Buon compleanno!', CLUB.compleanno || 0); }
      save(d); return s;
    },
    esci: function () { var d = load(); delete d.socio; d.punti = 0; d.movimenti = []; d.premi = []; save(d); },
    riscatta: function (i) {
      var d = load(), p = CLUB.premi[i]; if (!p || (d.punti || 0) < p.punti) return null;
      var b = { codice: 'PR-' + rnd(4, AZ) + '-' + rnd(4, AZ), titolo: p.titolo, testo: p.testo, data: oggi(), scade: scadenza(3), usato: false };
      d.premi = d.premi || []; d.premi.unshift(b); mov(d, 'Premio: ' + p.titolo, -p.punti); save(d); return b;
    },
    compraGift: function (o) {
      var d = load(), g = { codice: 'GC-' + rnd(4, AZ) + '-' + rnd(4, AZ) + '-' + rnd(4, AZ), importo: o.importo, saldo: o.importo, design: o.design, per: o.per || '', da: o.da || '', email: o.email || '', messaggio: o.messaggio || '', regalo: !!o.regalo, data: oggi(), scade: scadenza(GC.validita_mesi), usi: [] };
      d.gift = d.gift || []; d.gift.unshift(g);
      if (d.socio) mov(d, 'Acquisto gift card ' + euro(o.importo), Math.floor(o.importo / (CLUB.euro_per_punto || 1)));
      save(d); return g;
    },
    trovaGift: function (c) { c = String(c || '').toUpperCase().replace(/\s/g, ''); return (load().gift || []).filter(function (g) { return g.codice.replace(/-/g, '') === c.replace(/-/g, ''); })[0] || null; },
    // cassa del negozio
    accredita: function (numero, importo, negozio) {
      var d = load(), n = String(numero || '').replace(/\D/g, '');
      if (!d.socio || d.socio.numero.replace(/\D/g, '') !== n) return { ok: false, errore: 'Tessera non trovata. In questa demo funziona con la tessera creata su questo telefono.' };
      var p = Math.floor(importo / (CLUB.euro_per_punto || 1)); if (!(p > 0)) return { ok: false, errore: 'Importo non valido.' };
      mov(d, 'Acquisto da ' + (negozio || 'negozio') + ' · ' + euro(importo), p); save(d); return { ok: true, punti: p, totale: d.punti, nome: d.socio.nome };
    },
    usaGift: function (codice, importo, negozio) {
      var d = load(), c = String(codice || '').toUpperCase().replace(/[\s-]/g, ''), g = (d.gift || []).filter(function (x) { return x.codice.replace(/-/g, '') === c; })[0];
      if (!g) return { ok: false, errore: 'Gift card non trovata.' };
      if (!(importo > 0)) return { ok: false, errore: 'Importo non valido.' };
      if (importo > g.saldo + 0.001) return { ok: false, errore: 'Saldo insufficiente: disponibili ' + euro(g.saldo) + '.' };
      g.saldo = Math.round((g.saldo - importo) * 100) / 100; g.usi = g.usi || []; g.usi.unshift({ data: oggi(), importo: importo, negozio: negozio || '' }); save(d);
      return { ok: true, saldo: g.saldo };
    },
    usaPremio: function (codice) {
      var d = load(), c = String(codice || '').toUpperCase().replace(/[\s-]/g, ''), b = (d.premi || []).filter(function (x) { return x.codice.replace(/-/g, '') === c; })[0];
      if (!b) return { ok: false, errore: 'Codice premio non trovato.' }; if (b.usato) return { ok: false, errore: 'Premio già utilizzato il ' + b.usato + '.' };
      b.usato = oggi(); save(d); return { ok: true, titolo: b.titolo };
    },
    // grafica
    qr: function (text, px) {
      if (!window.qrcode) return '';
      var q = window.qrcode(0, 'M'); q.addData(text); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'Codice QR ' + text });
    },
    design: function (id) { return GC.design.filter(function (x) { return x.id === id; })[0] || GC.design[0] || { sfondo: '#1E1A16', testo: '#fff', accento: '#E9967F' }; },
    tessera: function (s, punti) {
      return '<div class="tessera"><div class="t-top"><span class="t-brand">LE FORNACI<small>' + esc(CLUB.nome || 'Fornaci Club') + '</small></span><span class="t-punti"><b>' + (punti || 0) + '</b>punti</span></div>' +
        '<div class="t-chip" aria-hidden="true"></div><div class="t-bottom"><span><small>Socio</small><b>' + esc(s.nome + ' ' + (s.cognome || '')) + '</b><span class="t-num">' + esc(s.numero) + '</span></span><button type="button" class="t-qr" data-mostra-qr="' + esc(s.numero) + '" aria-label="Mostra il codice alla cassa">' + FC.qr(s.numero) + '</button></div></div>';
    },
    giftCard: function (g, opts) {
      var dz = FC.design(g.design); opts = opts || {};
      return '<div class="giftc" style="background:' + dz.sfondo + ';color:' + dz.testo + '"><div class="g-top"><span class="t-brand" style="color:' + dz.testo + '">LE FORNACI<small style="color:' + dz.accento + '">Gift card</small></span><b class="g-imp">' + euro(opts.saldo ? g.saldo : g.importo) + '</b></div>' +
        (g.per ? '<div class="g-per" style="color:' + dz.accento + '">Per ' + esc(g.per) + '</div>' : '<div class="g-per" style="color:' + dz.accento + '">In tutti i negozi del centro</div>') +
        (g.messaggio ? '<p class="g-msg">“' + esc(g.messaggio) + '”' + (g.da ? '<br><small>— ' + esc(g.da) + '</small>' : '') + '</p>' : '<p class="g-msg"></p>') +
        '<div class="g-bottom"><span class="t-num">' + esc(g.codice || 'GC-••••-••••-••••') + '</span>' + (g.codice && !opts.noQr ? '<button type="button" class="t-qr" data-mostra-qr="' + esc(g.codice) + '" aria-label="Mostra il codice alla cassa">' + FC.qr(g.codice) + '</button>' : '') + '</div></div>';
    }
  };
  window.FC = FC;

  // QR a tutto schermo per la cassa (alza anche la luminosità percepita: sfondo bianco)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mostra-qr]'); if (!b) return;
    var c = b.getAttribute('data-mostra-qr'), ov = document.createElement('div');
    ov.className = 'qr-full'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Codice da mostrare alla cassa');
    ov.innerHTML = '<div class="qr-box">' + FC.qr(c) + '<b>' + esc(c) + '</b><span class="muted">Mostra questo codice alla cassa</span><button class="btn btn-dark" type="button">Chiudi</button></div>';
    ov.addEventListener('click', function (ev) { if (ev.target === ov || ev.target.tagName === 'BUTTON') ov.remove(); });
    document.body.appendChild(ov);
  });
})();
