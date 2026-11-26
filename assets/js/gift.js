/* Gift card prepagata: importo, grafica, regalo, consegna (Info Point o casa), pagamento SIMULATO, saldo. */
(function () {
  'use strict';
  var root = document.querySelector('[data-gift]'); if (!root || !window.FC) return;
  var FC = window.FC, esc = FC.esc, GC = FC.gc;
  var st = { importo: (GC.tagli || [50])[1] || 50, design: (GC.design[0] || {}).id, regalo: true, consegna: (GC.consegna[0] || {}).id, metodo: 'carta' };
  var f = root.querySelector('[data-gift-form]'), prev = root.querySelector('[data-anteprima]'), altro;

  root.querySelector('[data-tagli]').innerHTML = (GC.tagli || []).map(function (t) { return '<button type="button" class="chip-opt" data-taglio="' + t + '">' + FC.euro(t) + '</button>'; }).join('') + '<label class="chip-opt chip-altro"><span>Altro</span><input inputmode="decimal" placeholder="€" data-altro aria-label="Altro importo in euro"></label>';
  root.querySelector('[data-design]').innerHTML = GC.design.map(function (d) { return '<button type="button" class="sw" data-dz="' + d.id + '" style="background:' + d.sfondo + '" aria-label="Grafica ' + esc(d.nome) + '"><span>' + esc(d.nome) + '</span></button>'; }).join('');
  root.querySelector('[data-consegne]').innerHTML = GC.consegna.map(function (c) { return '<button type="button" class="opt" data-cons="' + c.id + '"><b>' + esc(c.nome) + '</b><span class="muted">' + esc(c.testo) + '</span><em>' + (c.costo ? FC.euro(c.costo) : 'Gratis') + '</em></button>'; }).join('');
  altro = root.querySelector('[data-altro]');

  function totale() { return (st.importo || 0) + (FC.consegna(st.consegna).costo || 0); }
  function aggiorna() {
    root.querySelectorAll('[data-taglio]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-taglio') === st.importo && !altro.value ? 'true' : 'false'); });
    root.querySelectorAll('[data-dz]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-dz') === st.design ? 'true' : 'false'); });
    root.querySelectorAll('[data-per-chi]').forEach(function (b) { b.setAttribute('aria-pressed', (b.getAttribute('data-per-chi') === 'regalo') === st.regalo ? 'true' : 'false'); });
    root.querySelectorAll('[data-cons]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cons') === st.consegna ? 'true' : 'false'); });
    f.querySelector('[data-campi-regalo]').hidden = !st.regalo;
    f.querySelector('[data-indirizzo]').hidden = st.consegna !== 'casa';
    prev.innerHTML = FC.giftCard({ importo: st.importo || 0, design: st.design, per: st.regalo ? f.per.value.trim() : '' });
    var c = FC.consegna(st.consegna), pt = FC.puntiDa(st.importo || 0);
    root.querySelector('[data-righe]').innerHTML = '<div><span>Gift card</span><span>' + FC.euro(st.importo || 0) + '</span></div><div><span>' + esc(c.nome) + '</span><span>' + (c.costo ? FC.euro(c.costo) : 'Gratis') + '</span></div>';
    root.querySelector('[data-totale]').textContent = FC.euro(totale());
    root.querySelector('[data-punti-info]').innerHTML = FC.socio() ? 'Con questo acquisto guadagni <b>' + pt + ' punti</b> Fornaci Club.' : 'Sei del Fornaci Club? <a href="../club/">Iscriviti gratis</a> e guadagni <b>' + pt + ' punti</b> con questo acquisto.';
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-taglio],[data-dz],[data-per-chi],[data-cons]'); if (!t) return;
    if (t.hasAttribute('data-taglio')) { st.importo = +t.getAttribute('data-taglio'); altro.value = ''; }
    if (t.hasAttribute('data-dz')) st.design = t.getAttribute('data-dz');
    if (t.hasAttribute('data-per-chi')) st.regalo = t.getAttribute('data-per-chi') === 'regalo';
    if (t.hasAttribute('data-cons')) st.consegna = t.getAttribute('data-cons');
    aggiorna();
  });
  altro.addEventListener('input', function () { var v = parseFloat(altro.value.replace(',', '.')); st.importo = v > 0 ? Math.round(v * 100) / 100 : 0; aggiorna(); });
  ['per', 'messaggio'].forEach(function (k) { f[k].addEventListener('input', aggiorna); });
  var s = FC.socio(); if (s) { f.da.value = s.nome; }

  // pagamento simulato
  var sheet = root.querySelector('[data-checkout]'), msg = f.querySelector('.form-msg');
  function errore(t, el) { msg.hidden = false; msg.className = 'form-msg err'; msg.textContent = t; if (el) el.focus(); }
  f.addEventListener('submit', function (e) {
    e.preventDefault(); msg.hidden = true;
    if (!(st.importo >= GC.min && st.importo <= GC.max)) return errore('Scegli un importo tra ' + FC.euro(GC.min) + ' e ' + FC.euro(GC.max) + '.');
    if (st.regalo && !f.per.value.trim()) return errore('Scrivi il nome di chi riceve il regalo.', f.per);
    if (!f.da.value.trim()) return errore('Scrivi il tuo nome: serve per il ritiro o la spedizione.', f.da);
    if (st.consegna === 'casa' && f.indirizzo.value.trim().length < 8) return errore('Scrivi l’indirizzo completo per la spedizione.', f.indirizzo);
    var c = FC.consegna(st.consegna);
    sheet.querySelector('[data-riepilogo]').innerHTML = '<div><span>Gift card prepagata' + (st.regalo && f.per.value.trim() ? ' · per ' + esc(f.per.value.trim()) : '') + '</span><b>' + FC.euro(st.importo) + '</b></div><div class="muted"><span>' + esc(c.nome) + '</span><span>' + (c.costo ? FC.euro(c.costo) : '0 €') + '</span></div><div class="tot"><span>Totale</span><b>' + FC.euro(totale()) + '</b></div>';
    sheet.querySelector('[data-paga]').textContent = 'Paga ' + FC.euro(totale());
    sheet.hidden = false; document.body.style.overflow = 'hidden';
  });
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet || e.target.hasAttribute('data-chiudi')) { sheet.hidden = true; document.body.style.overflow = ''; return; }
    var m = e.target.closest('[data-metodo]'); if (m) { st.metodo = m.getAttribute('data-metodo'); sheet.querySelectorAll('[data-metodo]').forEach(function (x) { x.setAttribute('aria-pressed', x === m ? 'true' : 'false'); }); }
  });
  sheet.querySelector('[data-paga]').addEventListener('click', function (e) {
    var b = e.target; b.disabled = true; b.textContent = 'Pagamento in corso…';
    setTimeout(function () {
      var g = FC.ordinaGift({ importo: st.importo, design: st.design, regalo: st.regalo, per: st.regalo ? f.per.value.trim() : '', messaggio: st.regalo ? f.messaggio.value.trim() : '', da: f.da.value.trim(), consegna: st.consegna, indirizzo: f.indirizzo.value.trim() });
      sheet.hidden = true; document.body.style.overflow = ''; b.disabled = false;
      var ok = root.querySelector('[data-fatto]'), casa = g.consegna === 'casa', passi = FC.statiGift[g.consegna];
      ok.querySelector('[data-ordine]').textContent = 'Ordine ' + g.ordine;
      ok.querySelector('[data-carta]').innerHTML = FC.giftCard(g);
      ok.querySelector('[data-track]').innerHTML = passi.map(function (p, i) { return '<li class="' + (i === 0 ? 'now' : '') + '">' + esc(p) + '</li>'; }).join('');
      ok.querySelector('[data-fatto-testo]').innerHTML = (casa
        ? 'La carta arriva con raccomandata in 3–5 giorni lavorativi' + (g.regalo ? ', in una busta regalo con il tuo messaggio' : '') + '. Si attiva con un SMS alla consegna.'
        : 'Tra 24 ore la carta è pronta all’<b>Info Point</b> del centro' + (g.regalo ? ', in una busta regalo con il tuo messaggio' : '') + '. Si ritira con un documento e si attiva subito.') +
        ' Poi si paga direttamente al POS dei negozi aderenti, anche in più volte.' + (FC.socio() ? ' Hai guadagnato <b>' + FC.puntiDa(g.importo) + ' punti</b>.' : '');
      root.querySelector('.gift-grid').hidden = true; root.querySelector('[data-scelta]').hidden = true; ok.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1300);
  });
  root.querySelector('[data-un-altra]').addEventListener('click', function () { root.querySelector('[data-fatto]').hidden = true; root.querySelector('.gift-grid').hidden = false; root.querySelector('[data-scelta]').hidden = false; f.reset(); altro.value = ''; if (s) f.da.value = s.nome; aggiorna(); });
  // saldo
  var sf = root.querySelector('[data-saldo-form]');
  sf.addEventListener('submit', function (e) {
    e.preventDefault(); var g = FC.trovaGift(sf.codice.value), out = sf.querySelector('.form-msg'); out.hidden = false;
    if (!g) { out.className = 'form-msg err'; out.textContent = 'Carta non trovata. Scrivi il numero d’ordine (es. GC123456) o le ultime 4 cifre della carta.'; return; }
    if (g.stato < 3) { out.className = 'form-msg ok'; out.textContent = 'Ordine ' + g.ordine + ': ' + FC.statoGift(g).toLowerCase() + '. Il saldo è visibile dopo l’attivazione.'; return; }
    out.className = 'form-msg ok'; out.innerHTML = 'Saldo disponibile: <b>' + FC.euro(g.saldo) + '</b> di ' + FC.euro(g.importo) + ' · valida fino al ' + esc(g.scade) + '.';
  });
  aggiorna();
})();
