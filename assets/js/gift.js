/* Gift card: scelta importo e grafica, regalo, pagamento SIMULATO (demo), saldo. */
(function () {
  'use strict';
  var root = document.querySelector('[data-gift]'); if (!root || !window.FC) return;
  var FC = window.FC, esc = FC.esc, GC = FC.gc, C = FC.conf;
  var st = { importo: (GC.tagli || [50])[1] || 50, design: (GC.design[0] || {}).id, regalo: true, metodo: 'carta' };
  var f = root.querySelector('[data-gift-form]'), prev = root.querySelector('[data-anteprima]');

  root.querySelector('[data-tagli]').innerHTML = (GC.tagli || []).map(function (t) { return '<button type="button" class="chip-opt" data-taglio="' + t + '">' + FC.euro(t) + '</button>'; }).join('') + '<label class="chip-opt chip-altro"><span>Altro</span><input inputmode="decimal" placeholder="€" data-altro aria-label="Altro importo in euro"></label>';
  root.querySelector('[data-design]').innerHTML = GC.design.map(function (d) { return '<button type="button" class="sw" data-dz="' + d.id + '" style="background:' + d.sfondo + '" aria-label="Grafica ' + esc(d.nome) + '"><span>' + esc(d.nome) + '</span></button>'; }).join('');

  function aggiorna() {
    root.querySelectorAll('[data-taglio]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-taglio') === st.importo && !root.querySelector('[data-altro]').value ? 'true' : 'false'); });
    root.querySelectorAll('[data-dz]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-dz') === st.design ? 'true' : 'false'); });
    root.querySelectorAll('[data-per-chi]').forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-per-chi') === 'regalo') === st.regalo ? 'true' : 'false'); });
    f.querySelector('[data-campi-regalo]').hidden = !st.regalo;
    prev.innerHTML = FC.giftCard({ importo: st.importo || 0, design: st.design, per: st.regalo ? f.per.value.trim() : '', messaggio: st.regalo ? f.messaggio.value.trim() : '', da: st.regalo ? f.da.value.trim() : '' }, { noQr: true });
    var socio = FC.socio(), pt = Math.floor((st.importo || 0) / (C.euro_per_punto || 1));
    root.querySelector('[data-totale]').textContent = FC.euro(st.importo || 0);
    root.querySelector('[data-punti-info]').innerHTML = socio ? 'Con questo acquisto guadagni <b>' + pt + ' punti</b> Fornaci Club.' : 'Sei del Fornaci Club? <a href="../club/">Iscriviti gratis</a> e guadagni <b>' + pt + ' punti</b> con questo acquisto.';
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-taglio],[data-dz],[data-per-chi]'); if (!t) return;
    if (t.hasAttribute('data-taglio')) { st.importo = +t.getAttribute('data-taglio'); root.querySelector('[data-altro]').value = ''; }
    if (t.hasAttribute('data-dz')) st.design = t.getAttribute('data-dz');
    if (t.hasAttribute('data-per-chi')) st.regalo = t.getAttribute('data-per-chi') === 'regalo';
    aggiorna();
  });
  root.querySelector('[data-altro]').addEventListener('input', function (e) { var v = parseFloat(e.target.value.replace(',', '.')); st.importo = v > 0 ? v : 0; aggiorna(); });
  ['per', 'messaggio', 'da'].forEach(function (k) { f[k].addEventListener('input', aggiorna); });
  var s = FC.socio(); if (s) f.da.value = s.nome;

  // pagamento simulato
  var sheet = root.querySelector('[data-checkout]'), msg = f.querySelector('.form-msg');
  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    if (!(st.importo >= GC.min && st.importo <= GC.max)) { msg.hidden = false; msg.className = 'form-msg err'; msg.textContent = 'Scegli un importo tra ' + FC.euro(GC.min) + ' e ' + FC.euro(GC.max) + '.'; return; }
    if (st.regalo && !f.per.value.trim()) { msg.hidden = false; msg.className = 'form-msg err'; msg.textContent = 'Scrivi il nome di chi riceve il regalo.'; f.per.focus(); return; }
    sheet.querySelector('[data-riepilogo]').innerHTML = '<div><span>Gift card Le Fornaci' + (st.regalo && f.per.value.trim() ? ' · per ' + esc(f.per.value.trim()) : '') + '</span><b>' + FC.euro(st.importo) + '</b></div><div class="muted"><span>Commissioni</span><span>0 €</span></div><div class="tot"><span>Totale</span><b>' + FC.euro(st.importo) + '</b></div>';
    sheet.querySelector('[data-paga]').textContent = 'Paga ' + FC.euro(st.importo);
    sheet.hidden = false; document.body.style.overflow = 'hidden';
  });
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet || e.target.hasAttribute('data-chiudi')) { sheet.hidden = true; document.body.style.overflow = ''; return; }
    var m = e.target.closest('[data-metodo]'); if (m) { st.metodo = m.getAttribute('data-metodo'); sheet.querySelectorAll('[data-metodo]').forEach(function (x) { x.setAttribute('aria-pressed', x === m ? 'true' : 'false'); }); }
  });
  sheet.querySelector('[data-paga]').addEventListener('click', function (e) {
    var b = e.target; b.disabled = true; b.textContent = 'Pagamento in corso…';
    setTimeout(function () {
      var g = FC.compraGift({ importo: st.importo, design: st.design, regalo: st.regalo, per: st.regalo ? f.per.value.trim() : '', email: st.regalo ? f.email.value.trim() : '', messaggio: st.regalo ? f.messaggio.value.trim() : '', da: f.da.value.trim() });
      sheet.hidden = true; document.body.style.overflow = ''; b.disabled = false;
      var ok = root.querySelector('[data-fatto]'), testo = 'Ti ho regalato una gift card Le Fornaci da ' + FC.euro(g.importo) + '! Codice: ' + g.codice + ' — spendibile in tutti i negozi del centro.';
      ok.querySelector('[data-carta]').innerHTML = FC.giftCard(g);
      ok.querySelector('[data-fatto-testo]').innerHTML = (g.regalo && g.email ? 'In versione reale la gift card arriva subito via email a <b>' + esc(g.email) + '</b>. ' : '') + 'La trovi anche nel tuo portafoglio, con il saldo sempre aggiornato. Valida fino al ' + esc(g.scade) + '.' + (FC.socio() ? ' Hai guadagnato <b>' + Math.floor(g.importo / (C.euro_per_punto || 1)) + ' punti</b>.' : '');
      ok.querySelector('[data-wa]').href = 'https://wa.me/?text=' + encodeURIComponent(testo);
      ok.querySelector('[data-copia]').onclick = function (ev) { if (navigator.clipboard) navigator.clipboard.writeText(g.codice).then(function () { ev.target.textContent = 'Copiato ✓'; }); };
      root.querySelector('.gift-grid').hidden = true; root.querySelector('[data-scelta]').hidden = true; ok.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1300);
  });
  root.querySelector('[data-un-altra]').addEventListener('click', function () { root.querySelector('[data-fatto]').hidden = true; root.querySelector('.gift-grid').hidden = false; root.querySelector('[data-scelta]').hidden = false; f.reset(); aggiorna(); });
  // saldo
  var sf = root.querySelector('[data-saldo-form]');
  sf.addEventListener('submit', function (e) {
    e.preventDefault(); var g = FC.trovaGift(sf.codice.value), out = sf.querySelector('.form-msg'); out.hidden = false;
    if (!g) { out.className = 'form-msg err'; out.textContent = 'Codice non trovato. Controlla di averlo scritto bene (es. GC-AB12-CD34-EF56).'; return; }
    out.className = 'form-msg ok'; out.innerHTML = 'Saldo disponibile: <b>' + FC.euro(g.saldo) + '</b> di ' + FC.euro(g.importo) + ' · valida fino al ' + esc(g.scade) + '.';
  });
  aggiorna();
})();
