/* Le Fornaci — Fornaci Club e Gift card.
   PUNTI: il cliente carica la foto dello scontrino di un acquisto al centro, la direzione lo verifica e accredita i punti.
   GIFT CARD: carta prepagata su circuito di pagamento, spendibile al POS dei negozi aderenti. Online si ordina e si paga;
   si ritira all'Info Point (o arriva a casa) e si attiva alla consegna.
   VERSIONE DIMOSTRATIVA: dati sul telefono di chi prova (localStorage), pagamento simulato. */
(function () {
  'use strict';
  var KEY = 'lf_club_v2', CONF = window.LF_CONF || {}, CLUB = CONF.club || { benvenuto: 50, compleanno: 100, euro_per_punto: 1, premi: [], scontrino: { giorni: 30, min_importo: 5 } }, GC = CONF.giftcard || { design: [], consegna: [] };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(n, set) { set = set || '0123456789'; var o = '', a = new Uint32Array(n); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (var j = 0; j < n; j++) a[j] = Math.random() * 1e9; for (var i = 0; i < n; i++) o += set[a[i] % set.length]; return o; }
  var AZ = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function oggi() { return new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function euro(n) { n = +n || 0; return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function scadenza(mesi) { var d = new Date(); d.setMonth(d.getMonth() + (mesi || 12)); return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function mov(d, testo, punti) { d.movimenti = d.movimenti || []; d.movimenti.unshift({ data: oggi(), testo: testo, punti: punti }); d.punti = (d.punti || 0) + punti; }
  function puntiDa(importo) { return Math.floor(importo / (CLUB.euro_per_punto || 1)); }
  var STATI_GC = { infopoint: ['Ordine ricevuto', 'In preparazione', 'Pronta al ritiro', 'Attiva'], casa: ['Ordine ricevuto', 'In preparazione', 'Spedita', 'Attiva'] };

  var FC = {
    conf: CLUB, gc: GC, esc: esc, euro: euro, puntiDa: puntiDa, statiGift: STATI_GC,
    dati: load,
    socio: function () { return load().socio || null; },
    iscrivi: function (s) {
      var d = load(); if (d.socio) return d.socio;
      s.numero = 'LF ' + rnd(4) + ' ' + rnd(4) + ' ' + rnd(4); s.dal = oggi(); d.socio = s; d.punti = 0;
      mov(d, 'Benvenuto nel ' + (CLUB.nome || 'Fornaci Club'), CLUB.benvenuto || 0);
      if (s.nascita) { var n = new Date(s.nascita), t = new Date(); if (n.getDate() === t.getDate() && n.getMonth() === t.getMonth()) mov(d, 'Buon compleanno!', CLUB.compleanno || 0); }
      save(d); return s;
    },
    esci: function () { var d = load(); ['socio', 'movimenti', 'premi', 'scontrini'].forEach(function (k) { delete d[k]; }); d.punti = 0; save(d); },

    // --- scontrini ---
    caricaScontrino: function (o) {
      var d = load(); if (!d.socio) return { ok: false, errore: 'Iscriviti prima al Club.' };
      var S = CLUB.scontrino || {}, imp = +o.importo;
      if (!o.foto) return { ok: false, errore: 'Scatta o scegli la foto dello scontrino.' };
      if (!o.negozio) return { ok: false, errore: 'Scegli il negozio.' };
      if (!(imp >= (S.min_importo || 0))) return { ok: false, errore: 'Importo minimo ' + euro(S.min_importo || 0) + '.' };
      var gg = (Date.now() - new Date(o.data + 'T12:00:00').getTime()) / 864e5;
      if (!o.data || gg < -1) return { ok: false, errore: 'Controlla la data dello scontrino.' };
      if (gg > (S.giorni || 30)) return { ok: false, errore: 'Si possono caricare scontrini degli ultimi ' + (S.giorni || 30) + ' giorni.' };
      d.scontrini = d.scontrini || [];
      if (d.scontrini.some(function (x) { return x.negozio === o.negozio && x.data === o.data && Math.abs(x.importo - imp) < .01 && x.stato !== 'rifiutato'; }))
        return { ok: false, errore: 'Questo scontrino risulta già caricato.' };
      var sc = { id: 'SC' + rnd(6), foto: o.foto, negozio: o.negozio, locale: o.locale || '', importo: imp, data: o.data, numero: o.numero || '', caricato: oggi(), stato: 'in_verifica', punti: puntiDa(imp) };
      d.scontrini.unshift(sc); d.scontrini = d.scontrini.slice(0, 25);
      if (!save(d)) { d.scontrini.shift(); return { ok: false, errore: 'Memoria del telefono piena: elimina qualche vecchio scontrino.' }; }
      return { ok: true, scontrino: sc };
    },
    verificaScontrino: function (id, approva, motivo) {
      var d = load(), s = (d.scontrini || []).filter(function (x) { return x.id === id; })[0]; if (!s || s.stato !== 'in_verifica') return { ok: false };
      if (approva) { s.stato = 'approvato'; mov(d, 'Scontrino ' + s.negozio + ' · ' + euro(s.importo), s.punti); }
      else { s.stato = 'rifiutato'; s.motivo = motivo || 'Scontrino non leggibile'; }
      s.verificato = oggi(); save(d); return { ok: true };
    },

    // --- premi (si ritirano all'Info Point) ---
    riscatta: function (i) {
      var d = load(), p = CLUB.premi[i]; if (!p || (d.punti || 0) < p.punti) return null;
      var b = { codice: 'PR-' + rnd(4, AZ) + '-' + rnd(4, AZ), titolo: p.titolo, testo: p.testo, data: oggi(), scade: scadenza(3), usato: false };
      d.premi = d.premi || []; d.premi.unshift(b); mov(d, 'Premio: ' + p.titolo, -p.punti); save(d); return b;
    },
    usaPremio: function (codice) {
      var d = load(), c = String(codice || '').toUpperCase().replace(/[\s-]/g, ''), b = (d.premi || []).filter(function (x) { return x.codice.replace(/-/g, '') === c; })[0];
      if (!b) return { ok: false, errore: 'Codice premio non trovato.' }; if (b.usato) return { ok: false, errore: 'Premio già consegnato il ' + b.usato + '.' };
      b.usato = oggi(); save(d); return { ok: true, titolo: b.titolo };
    },

    // --- gift card prepagata ---
    consegna: function (id) { return (GC.consegna || []).filter(function (c) { return c.id === id; })[0] || (GC.consegna || [])[0] || { id: 'infopoint', nome: 'Ritiro all’Info Point', costo: 0 }; },
    ordinaGift: function (o) {
      var d = load(), cons = FC.consegna(o.consegna);
      var g = { ordine: 'GC' + rnd(6), numero: '•••• •••• •••• ' + rnd(4), importo: o.importo, saldo: o.importo, design: o.design, per: o.per || '', da: o.da || '', messaggio: o.messaggio || '', regalo: !!o.regalo,
        consegna: cons.id, costo: cons.costo || 0, indirizzo: o.indirizzo || '', data: oggi(), stato: 0, scade: '', usi: [] };
      d.gift = d.gift || []; d.gift.unshift(g);
      if (d.socio) mov(d, 'Acquisto gift card ' + euro(o.importo), puntiDa(o.importo));
      save(d); return g;
    },
    avanzaGift: function (ordine) {
      var d = load(), g = (d.gift || []).filter(function (x) { return x.ordine === ordine; })[0]; if (!g || g.stato >= 3) return null;
      g.stato++; if (g.stato === 3) { g.scade = scadenza(GC.validita_mesi); g.attivata = oggi(); }
      save(d); return g;
    },
    trovaGift: function (c) { c = String(c || '').toUpperCase().replace(/[\s-]/g, ''); return (load().gift || []).filter(function (g) { return g.ordine === c || g.numero.slice(-4) === c.slice(-4) && c.length === 4; })[0] || null; },
    statoGift: function (g) { return (STATI_GC[g.consegna] || STATI_GC.infopoint)[g.stato] || ''; },

    // --- grafica ---
    qr: function (text) {
      if (!window.qrcode) return '';
      var q = window.qrcode(0, 'M'); q.addData(text); q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'Codice QR ' + text });
    },
    design: function (id) { return GC.design.filter(function (x) { return x.id === id; })[0] || GC.design[0] || { sfondo: '#1E1A16', testo: '#fff', accento: '#E9967F' }; },
    tessera: function (s, punti) {
      return '<div class="tessera"><div class="t-top"><span class="t-brand">LE FORNACI<small>' + esc(CLUB.nome || 'Fornaci Club') + '</small></span><span class="t-punti"><b>' + (punti || 0) + '</b>punti</span></div>' +
        '<div class="t-chip" aria-hidden="true"></div><div class="t-bottom"><span><small>Socio</small><b>' + esc(s.nome + ' ' + (s.cognome || '')) + '</b><span class="t-num">' + esc(s.numero) + '</span></span><button type="button" class="t-qr" data-mostra-qr="' + esc(s.numero) + '" aria-label="Mostra la tessera all’Info Point">' + FC.qr(s.numero) + '</button></div></div>';
    },
    // la gift card è una carta di pagamento: chip, numero, scritta "prepagata". Nessun QR.
    giftCard: function (g, opts) {
      var dz = FC.design(g.design); opts = opts || {};
      return '<div class="giftc" style="background:' + dz.sfondo + ';color:' + dz.testo + '"><div class="g-top"><span class="t-brand" style="color:' + dz.testo + '">LE FORNACI<small style="color:' + dz.accento + '">Gift card</small></span><b class="g-imp">' + euro(opts.saldo ? g.saldo : g.importo) + '</b></div>' +
        '<div class="g-mid"><span class="t-chip" aria-hidden="true"></span><span class="g-nfc" aria-hidden="true">)))</span>' + (g.per ? '<span class="g-per" style="color:' + dz.accento + '">Per ' + esc(g.per) + '</span>' : '') + '</div>' +
        '<div class="g-bottom"><span class="t-num">' + esc(g.numero || '•••• •••• •••• ••••') + '</span><span class="g-circ">PREPAGATA</span></div></div>';
    }
  };
  window.FC = FC;

  // QR della tessera a tutto schermo (per l'Info Point)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mostra-qr]'); if (!b) return;
    var c = b.getAttribute('data-mostra-qr'), ov = document.createElement('div');
    ov.className = 'qr-full'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Codice da mostrare all’Info Point');
    ov.innerHTML = '<div class="qr-box">' + FC.qr(c) + '<b>' + esc(c) + '</b><span class="muted">Mostra questo codice all’Info Point</span><button class="btn btn-dark" type="button">Chiudi</button></div>';
    ov.addEventListener('click', function (ev) { if (ev.target === ov || ev.target.tagName === 'BUTTON') ov.remove(); });
    document.body.appendChild(ov);
  });
})();
