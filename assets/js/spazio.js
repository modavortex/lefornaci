/* Pagina "Apri il tuo spazio": scelta del tipo e invio della richiesta al motore (Google Apps Script). */
(function () {
  'use strict';
  var form = document.querySelector('[data-spazio-form]'); if (!form) return;
  var TESTI = { negozio: 'Locale che ti interessa', temporary: 'Periodo che ti interessa', banchetto: 'Date o occasione' };
  var tipo = 'negozio';
  function setTipo(t) {
    tipo = TESTI[t] ? t : 'negozio';
    form.tipo.value = tipo;
    document.querySelectorAll('[data-tipo]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tipo') === tipo ? 'true' : 'false'); });
    document.querySelectorAll('[data-solo]').forEach(function (el) { el.hidden = el.getAttribute('data-solo').split(' ').indexOf(tipo) < 0; });
    form.querySelector('[data-dettaglio-testo]').textContent = TESTI[tipo];
  }
  document.querySelectorAll('[data-tipo]').forEach(function (b) {
    b.addEventListener('click', function () { setTipo(b.getAttribute('data-tipo')); document.getElementById('modulo').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  });
  var q = new URLSearchParams(location.search);
  setTipo(q.get('tipo') || 'negozio');
  if (q.get('locale')) { var sel = form.dettaglio_locale; sel.value = 'Locale ' + q.get('locale'); }

  var msg = form.querySelector('[data-msg]'), btn = form.querySelector('[data-invia]');
  function say(t, ok) { msg.hidden = false; msg.textContent = t; msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.nome.value.trim() || !form.telefono.value.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim())) { say('Inserisci nome, telefono ed email validi.'); return; }
    if (!form.privacy.checked) { say('Serve il consenso per poterti ricontattare.'); return; }
    var dati = { azione: 'richiesta', tipo: tipo, nome: form.nome.value, azienda: form.azienda.value, telefono: form.telefono.value, email: form.email.value,
                 dettaglio: tipo === 'negozio' ? form.dettaglio_locale.value : form.dettaglio_testo.value, messaggio: form.messaggio.value, sito_web: form.sito_web.value };
    if (!window.LF_MOTORE) {
      var body = Object.keys(dati).filter(function (k) { return k !== 'azione' && k !== 'sito_web' && dati[k]; }).map(function (k) { return k + ': ' + dati[k]; }).join('\n');
      location.href = 'mailto:' + (window.LF_EMAIL || '') + '?subject=' + encodeURIComponent('Richiesta spazio Le Fornaci') + '&body=' + encodeURIComponent(body);
      return;
    }
    btn.disabled = true; btn.textContent = 'Invio in corso…';
    fetch(window.LF_MOTORE, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dati) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.errore || 'Errore');
        form.innerHTML = '<div class="grazie"><b>Richiesta ricevuta!</b><p>Ti abbiamo appena mandato una email con gli spazi disponibili e la conferma che la richiesta è stata presa in carico. Controlla anche la cartella spam.</p><p>La direzione ti ricontatta entro un giorno lavorativo.</p></div>';
      })
      .catch(function (err) { btn.disabled = false; btn.textContent = 'Invia la richiesta'; say('Non siamo riusciti a inviare: ' + err.message + '. Riprova o scrivi a ' + (window.LF_EMAIL || '') + '.'); });
  });
})();
