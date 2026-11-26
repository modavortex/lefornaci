/* Pagina Fornaci Club: iscrizione, tessera digitale, punti, premi e gift card. */
(function () {
  'use strict';
  var root = document.querySelector('[data-club]'); if (!root || !window.FC) return;
  var FC = window.FC, esc = FC.esc, C = FC.conf;
  var iscr = root.querySelector('[data-club-iscriviti]'), area = root.querySelector('[data-club-socio]');

  function disegna(flash) {
    var s = FC.socio(); iscr.hidden = !!s; area.hidden = !s;
    if (!s) return;
    var d = FC.dati(), punti = d.punti || 0, premi = C.premi || [];
    var next = premi.filter(function (p) { return p.punti > punti; })[0];
    var prog = next ? Math.min(100, Math.round(punti / next.punti * 100)) : 100;
    area.querySelector('[data-tessera]').innerHTML = FC.tessera(s, punti);
    area.querySelector('[data-ciao]').textContent = 'Ciao ' + s.nome + '!';
    area.querySelector('[data-progresso]').innerHTML = next
      ? '<div class="prog-top"><span><b>' + punti + '</b> punti</span><span class="muted">Ancora ' + (next.punti - punti) + ' per: <b>' + esc(next.titolo) + '</b></span></div><div class="bar"><span style="width:' + prog + '%"></span></div>'
      : '<div class="prog-top"><span><b>' + punti + '</b> punti</span><span class="muted">Puoi riscattare tutti i premi!</span></div><div class="bar"><span style="width:100%"></span></div>';
    area.querySelector('[data-premi]').innerHTML = premi.map(function (p, i) {
      var ok = punti >= p.punti;
      return '<div class="premio' + (ok ? ' ok' : '') + '"><span class="p-pt">' + p.punti + '<small>punti</small></span><span><b>' + esc(p.titolo) + '</b><small class="muted">' + esc(p.testo) + '</small></span>' +
        (ok ? '<button class="btn btn-primary" type="button" data-riscatta="' + i + '">Riscatta</button>' : '<span class="p-manca">−' + (p.punti - punti) + '</span>') + '</div>';
    }).join('');
    var miei = d.premi || [];
    var mp = area.querySelector('[data-miei-premi]'); mp.hidden = !miei.length;
    mp.querySelector('[data-lista]').innerHTML = miei.map(function (b) {
      return '<div class="buono' + (b.usato ? ' usato' : '') + '"><span><b>' + esc(b.titolo) + '</b><small class="muted">' + (b.usato ? 'Usato il ' + esc(b.usato) : 'Valido fino al ' + esc(b.scade)) + '</small><span class="t-num">' + esc(b.codice) + '</span></span>' +
        (b.usato ? '<span class="pill">Usato</span>' : '<button type="button" class="btn" data-mostra-qr="' + esc(b.codice) + '">Mostra in cassa</button>') + '</div>';
    }).join('');
    var gift = d.gift || [];
    area.querySelector('[data-wallet]').innerHTML = gift.length ? gift.map(function (g) {
      return '<div class="wallet-item">' + FC.giftCard(g, { saldo: true }) + '<small class="muted">' + (g.regalo && g.per ? 'Regalo per ' + esc(g.per) + ' · ' : '') + 'Saldo ' + FC.euro(g.saldo) + ' di ' + FC.euro(g.importo) + ' · valida fino al ' + esc(g.scade) + '</small></div>';
    }).join('') : '<div class="vuoto"><b>Nessuna gift card</b><span class="muted">Regalane una o comprala per te: guadagni anche i punti.</span><a class="btn btn-dark" href="../gift-card/">Scegli una gift card</a></div>';
    area.querySelector('[data-movimenti]').innerHTML = (d.movimenti || []).slice(0, 20).map(function (m) {
      return '<li><span>' + esc(m.testo) + '<small class="muted">' + esc(m.data) + '</small></span><b class="' + (m.punti < 0 ? 'neg' : 'pos') + '">' + (m.punti > 0 ? '+' : '') + m.punti + '</b></li>';
    }).join('');
    if (flash) { var f = area.querySelector('[data-flash]'); f.hidden = false; f.textContent = flash; setTimeout(function () { f.hidden = true; }, 5000); }
  }

  var form = iscr.querySelector('form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var m = form.querySelector('.form-msg');
    if (!form.nome.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim())) { m.hidden = false; m.className = 'form-msg err'; m.textContent = 'Inserisci almeno nome ed email.'; return; }
    if (!form.privacy.checked) { m.hidden = false; m.className = 'form-msg err'; m.textContent = 'Serve il consenso al regolamento del Club.'; return; }
    FC.iscrivi({ nome: form.nome.value.trim(), cognome: form.cognome.value.trim(), email: form.email.value.trim(), telefono: form.telefono.value.trim(), nascita: form.nascita.value, marketing: form.marketing.checked });
    disegna('Benvenuto! Hai ricevuto ' + (C.benvenuto || 0) + ' punti.'); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  area.addEventListener('click', function (e) {
    var r = e.target.getAttribute && e.target.getAttribute('data-riscatta');
    if (r !== null && r !== undefined && r !== '') { var b = FC.riscatta(+r); if (b) disegna('Premio riscattato: ' + b.titolo + '. Lo trovi in “I miei premi”.'); }
    if (e.target.hasAttribute && e.target.hasAttribute('data-esci-club')) {
      var c = area.querySelector('[data-conferma-esci]'); c.hidden = !c.hidden;
    }
    if (e.target.hasAttribute && e.target.hasAttribute('data-esci-si')) { FC.esci(); disegna(); window.scrollTo({ top: 0 }); }
  });
  disegna();
  // arrivo da una gift card appena comprata: apri il portafoglio
  if (location.hash === '#portafoglio') setTimeout(function () { var w = document.getElementById('portafoglio'); if (w) w.scrollIntoView({ behavior: 'smooth' }); }, 300);
})();
