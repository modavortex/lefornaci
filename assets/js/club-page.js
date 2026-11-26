/* Pagina Fornaci Club: iscrizione, tessera, scontrini, punti, premi e gift card. */
(function () {
  'use strict';
  var root = document.querySelector('[data-club]'); if (!root || !window.FC) return;
  var FC = window.FC, esc = FC.esc, C = FC.conf;
  var iscr = root.querySelector('[data-club-iscriviti]'), area = root.querySelector('[data-club-socio]');
  var STATO_SC = { in_verifica: ['In verifica', ''], approvato: ['Approvato', 'ok'], rifiutato: ['Non valido', 'no'] };

  function disegna(flash) {
    var s = FC.socio(); iscr.hidden = !!s; area.hidden = !s;
    if (!s) return;
    var d = FC.dati(), punti = d.punti || 0, premi = C.premi || [];
    var next = premi.filter(function (p) { return p.punti > punti; })[0];
    var attesa = (d.scontrini || []).filter(function (x) { return x.stato === 'in_verifica'; }).reduce(function (t, x) { return t + x.punti; }, 0);
    area.querySelector('[data-tessera]').innerHTML = FC.tessera(s, punti);
    area.querySelector('[data-ciao]').textContent = 'Ciao ' + s.nome + '!';
    area.querySelector('[data-progresso]').innerHTML = '<div class="prog-top"><span><b>' + punti + '</b> punti' + (attesa ? ' <span class="pill pill-wait">+' + attesa + ' in verifica</span>' : '') + '</span><span class="muted">' +
      (next ? 'Ancora ' + (next.punti - punti) + ' per: <b>' + esc(next.titolo) + '</b>' : 'Puoi riscattare tutti i premi!') + '</span></div><div class="bar"><span style="width:' + (next ? Math.min(100, Math.round(punti / next.punti * 100)) : 100) + '%"></span></div>';
    // scontrini
    var sc = d.scontrini || [];
    area.querySelector('[data-scontrini]').innerHTML = sc.length ? sc.slice(0, 8).map(function (x) {
      var st = STATO_SC[x.stato] || ['', ''];
      return '<li class="sc"><img src="' + x.foto + '" alt="Scontrino ' + esc(x.negozio) + '" loading="lazy"><span><b>' + esc(x.negozio) + '</b><small class="muted">' + FC.euro(x.importo) + ' · ' + esc(new Date(x.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })) + (x.stato === 'rifiutato' ? ' · ' + esc(x.motivo) : '') + '</small></span><span class="sc-st ' + st[1] + '">' + (x.stato === 'approvato' ? '+' + x.punti : st[0]) + '</span></li>';
    }).join('') : '<li class="vuoto-sc muted">Nessuno scontrino caricato. Fotografa lo scontrino dopo ogni acquisto al centro.</li>';
    // premi
    area.querySelector('[data-premi]').innerHTML = premi.map(function (p, i) {
      var ok = punti >= p.punti;
      return '<div class="premio' + (ok ? ' ok' : '') + '"><span class="p-pt">' + p.punti + '<small>punti</small></span><span><b>' + esc(p.titolo) + '</b><small class="muted">' + esc(p.testo) + '</small></span>' +
        (ok ? '<button class="btn btn-primary" type="button" data-riscatta="' + i + '">Riscatta</button>' : '<span class="p-manca">−' + (p.punti - punti) + '</span>') + '</div>';
    }).join('');
    var miei = d.premi || [], mp = area.querySelector('[data-miei-premi]'); mp.hidden = !miei.length;
    mp.querySelector('[data-lista]').innerHTML = miei.map(function (b) {
      return '<div class="buono' + (b.usato ? ' usato' : '') + '"><span><b>' + esc(b.titolo) + '</b><small class="muted">' + (b.usato ? 'Ritirato il ' + esc(b.usato) : 'Ritiralo all’Info Point entro il ' + esc(b.scade)) + '</small><span class="t-num">' + esc(b.codice) + '</span></span>' +
        (b.usato ? '<span class="pill">Ritirato</span>' : '<button type="button" class="btn" data-mostra-qr="' + esc(b.codice) + '">Mostra</button>') + '</div>';
    }).join('');
    // gift card
    var gift = d.gift || [];
    area.querySelector('[data-wallet]').innerHTML = gift.length ? gift.map(function (g) {
      var passi = FC.statiGift[g.consegna] || FC.statiGift.infopoint;
      return '<div class="wallet-item">' + FC.giftCard(g, { saldo: g.stato === 3 }) +
        '<ol class="track">' + passi.map(function (p, i) { return '<li class="' + (i < g.stato ? 'done' : i === g.stato ? 'now' : '') + '">' + esc(p) + '</li>'; }).join('') + '</ol>' +
        '<small class="muted">Ordine ' + esc(g.ordine) + (g.regalo && g.per ? ' · regalo per ' + esc(g.per) : '') + (g.stato === 3 ? ' · saldo ' + FC.euro(g.saldo) + ' · valida fino al ' + esc(g.scade) : g.consegna === 'infopoint' ? ' · ritiro all’Info Point con un documento' : ' · spedizione a casa') + '</small></div>';
    }).join('') : '<div class="vuoto"><b>Nessuna gift card</b><span class="muted">Regalane una o comprala per te: guadagni anche i punti.</span><a class="btn btn-dark" href="../gift-card/">Scegli una gift card</a></div>';
    area.querySelector('[data-movimenti]').innerHTML = (d.movimenti || []).slice(0, 20).map(function (m) {
      return '<li><span>' + esc(m.testo) + '<small class="muted">' + esc(m.data) + '</small></span><b class="' + (m.punti < 0 ? 'neg' : 'pos') + '">' + (m.punti > 0 ? '+' : '') + m.punti + '</b></li>';
    }).join('');
    if (flash) { var f = area.querySelector('[data-flash]'); f.hidden = false; f.textContent = flash; clearTimeout(disegna.t); disegna.t = setTimeout(function () { f.hidden = true; }, 6000); }
  }

  var form = iscr.querySelector('form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var m = form.querySelector('.form-msg');
    if (!form.nome.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim())) { m.hidden = false; m.className = 'form-msg err'; m.textContent = 'Inserisci almeno nome ed email.'; return; }
    if (!form.privacy.checked) { m.hidden = false; m.className = 'form-msg err'; m.textContent = 'Serve il consenso al regolamento del Club.'; return; }
    FC.iscrivi({ nome: form.nome.value.trim(), cognome: form.cognome.value.trim(), email: form.email.value.trim(), telefono: form.telefono.value.trim(), nascita: form.nascita.value, marketing: form.marketing.checked });
    disegna('Benvenuto! Hai ricevuto ' + (C.benvenuto || 0) + ' punti. Ora carica il tuo primo scontrino.'); window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- caricamento scontrino ---
  var sh = root.querySelector('[data-sheet-scontrino]'), fs = sh.querySelector('form'), foto = '';
  var negozi = (window.LF ? window.LF.locali : []).filter(function (u) { return u.nome && u.stato !== 'libero'; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  fs.negozio.innerHTML = '<option value="">Scegli il negozio…</option>' + negozi.map(function (u) { return '<option value="' + esc(u.locale) + '">' + esc(u.nome) + '</option>'; }).join('');
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function apri() {
    fs.reset(); foto = ''; sh.querySelector('[data-anteprima-sc]').innerHTML = '<span>Scatta una foto allo scontrino intero, ben leggibile</span>';
    var t = new Date(), m = new Date(); m.setDate(m.getDate() - ((C.scontrino || {}).giorni || 30));
    fs.data.value = iso(t); fs.data.max = iso(t); fs.data.min = iso(m); fs.querySelector('.form-msg').hidden = true;
    sh.hidden = false; document.body.style.overflow = 'hidden';
  }
  function chiudi() { sh.hidden = true; document.body.style.overflow = ''; }
  root.querySelectorAll('[data-apri-scontrino]').forEach(function (b) { b.addEventListener('click', apri); });
  sh.addEventListener('click', function (e) { if (e.target === sh || e.target.hasAttribute('data-chiudi')) chiudi(); });
  fs.foto.addEventListener('change', function () {
    var file = fs.foto.files[0]; if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1000 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        foto = cv.toDataURL('image/jpeg', 0.6);
        sh.querySelector('[data-anteprima-sc]').innerHTML = '<img src="' + foto + '" alt="Anteprima dello scontrino">';
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
  fs.addEventListener('submit', function (e) {
    e.preventDefault();
    var m = fs.querySelector('.form-msg'), u = negozi.filter(function (x) { return x.locale === fs.negozio.value; })[0];
    var res = FC.caricaScontrino({ foto: foto, negozio: u ? u.nome : '', locale: fs.negozio.value, importo: parseFloat(String(fs.importo.value).replace(',', '.')), data: fs.data.value, numero: fs.numero.value.trim() });
    if (!res.ok) { m.hidden = false; m.className = 'form-msg err'; m.textContent = res.errore; return; }
    chiudi(); disegna('Scontrino inviato! ' + res.scontrino.punti + ' punti in verifica: arrivano ' + ((C.scontrino || {}).verifica || 'entro 24 ore') + '.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  area.addEventListener('click', function (e) {
    var t = e.target, r = t.getAttribute && t.getAttribute('data-riscatta');
    if (r) { var b = FC.riscatta(+r); if (b) disegna('Premio riscattato: ' + b.titolo + '. Mostra il codice all’Info Point per ritirarlo.'); }
    if (t.hasAttribute && t.hasAttribute('data-esci-club')) { var c = area.querySelector('[data-conferma-esci]'); c.hidden = !c.hidden; }
    if (t.hasAttribute && t.hasAttribute('data-esci-si')) { FC.esci(); disegna(); window.scrollTo({ top: 0 }); }
  });
  disegna();
  if (location.hash === '#portafoglio') setTimeout(function () { var w = document.getElementById('portafoglio'); if (w) w.scrollIntoView({ behavior: 'smooth' }); }, 300);
  if (location.hash === '#scontrino' && FC.socio()) apri();
})();
