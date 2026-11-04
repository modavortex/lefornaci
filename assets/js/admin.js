/* Area amministrazione: tutto passa dal motore (Google Apps Script). Qui non c'è nessuna password salvata. */
(function () {
  'use strict';
  var root = document.querySelector('[data-admin]'); if (!root) return;
  var URL_ = window.LF_MOTORE, DEMO = !URL_ && window.LF_DEMO;
  if (!URL_ && !DEMO) return;
  if (DEMO) { var nota = root.querySelector('[data-no-motore]'); nota.hidden = false; root.querySelector('[data-vista="login"]').appendChild(nota); }
  var token = null; try { token = sessionStorage.getItem('lf_admin'); } catch (e) {}
  var shops = (window.LF ? window.LF.locali : []).filter(function (u) { return u.nome; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
  function call(dati) {
    if (token) dati.token = token;
    if (DEMO) return DEMO(dati).then(function (r) { if (r.scaduta) { esci(); } return r; });
    return fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dati) }).then(function (r) { return r.json(); })
      .then(function (r) { if (r.scaduta) { esci(); } return r; });
  }
  function msg(el, t, ok) { var m = el.querySelector('.form-msg'); if (!m) return; m.hidden = false; m.textContent = t; m.className = 'form-msg ' + (ok ? 'ok' : 'err'); }
  function vista(v) { root.querySelectorAll('[data-vista]').forEach(function (s) { s.hidden = s.getAttribute('data-vista') !== v; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function esci() { if (token) call({ azione: 'esci' }); token = null; try { sessionStorage.removeItem('lf_admin'); } catch (e) {} vista('login'); }

  root.querySelectorAll('[data-vai]').forEach(function (b) { b.addEventListener('click', function () { vista(b.getAttribute('data-vai')); }); });
  root.querySelector('[data-form="login"]').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, b = f.querySelector('button[type=submit]'); b.disabled = true;
    call({ azione: 'login', utente: f.utente.value.trim(), password: f.password.value }).then(function (r) {
      b.disabled = false;
      if (!r.ok) { msg(f, r.errore); return; }
      token = r.token; try { sessionStorage.setItem('lf_admin', token); } catch (x) {}
      f.reset(); avvia();
    }).catch(function () { b.disabled = false; msg(f, 'Collegamento non riuscito, riprova.'); });
  });
  var rs = root.querySelector('[data-vista="reset"]');
  rs.querySelector('[data-azione="reset_chiedi"]').addEventListener('click', function () {
    call({ azione: 'reset_chiedi' }).then(function (r) { msg(rs, r.ok ? (DEMO ? 'In prova il codice è 123456.' : 'Codice inviato all’email di recupero: vale 15 minuti.') : r.errore, r.ok); });
  });
  rs.querySelector('[data-azione="reset_conferma"]').addEventListener('click', function () {
    call({ azione: 'reset_conferma', codice: rs.querySelector('[name=codice]').value, nuova: rs.querySelector('[name=nuova]').value })
      .then(function (r) { msg(rs, r.ok ? 'Password aggiornata: ora puoi accedere.' : r.errore, r.ok); if (r.ok) setTimeout(function () { vista('login'); }, 1500); });
  });
  root.querySelectorAll('[data-esci]').forEach(function (b) { b.addEventListener('click', esci); });
  root.querySelectorAll('[data-tab]').forEach(function (t) {
    t.addEventListener('click', function () {
      root.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      root.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== t.getAttribute('data-tab'); });
    });
  });

  function avvia() {
    call({ azione: 'mia_scheda' }).then(function (r) {
      if (!r.ok) { vista('login'); return; }
      if (r.ruolo === 'admin') carica(); else apriScheda(r);
    }).catch(function () { vista('login'); });
  }
  function carica() {
    call({ azione: 'stato' }).then(function (r) {
      if (!r.ok) { vista('login'); return; }
      vista('pannello');
      root.querySelector('[data-cambiare]').hidden = !r.cambiare;
      disegnaVetrina(r.vetrina); disegnaDest(r.destinatari); disegnaRichieste(r.richieste); accessi = r.accessi || []; disegnaAccessi();
    }).catch(function () { vista('login'); });
  }
  // Accessi negozi (solo admin)
  var accessi = [];
  function disegnaAccessi() {
    var q = (root.querySelector('[data-cerca-accessi]').value || '').toLowerCase();
    root.querySelector('[data-accessi]').innerHTML = accessi.filter(function (a) { return !q || a.utente.toLowerCase().indexOf(q) >= 0 || String(a.negozio).toLowerCase().indexOf(q) >= 0; }).map(function (a) {
      return '<div class="acc"><span class="vnum" style="width:auto;border-radius:8px;padding:0 8px">' + esc(a.utente) + '</span><span><b>' + esc(a.negozio) + '</b><small class="muted">' + (a.ultimo ? 'Ultimo accesso ' + esc(a.ultimo) : 'Mai entrato') + (a.cambiare ? ' · codice da cambiare' : '') + '</small>' + (a.demo ? '<small class="demo-code">Codice di prova: <code>' + esc(a.demo) + '</code></small>' : '') + '</span>' +
        '<label class="tick"><input type="checkbox" data-attivo="' + esc(a.utente) + '"' + (a.attivo ? ' checked' : '') + '>Attivo</label><button class="btn" type="button" data-rigenera="' + esc(a.utente) + '">Nuovo codice</button></div>';
    }).join('');
  }
  root.querySelector('[data-cerca-accessi]').addEventListener('input', disegnaAccessi);
  root.querySelector('[data-accessi]').addEventListener('click', function (e) {
    var u = e.target.getAttribute('data-rigenera'); if (!u) return;
    e.target.disabled = true;
    call({ azione: 'rigenera', utente: u }).then(function (r) {
      e.target.disabled = false;
      var box = root.querySelector('[data-nuovo-codice]'); box.hidden = false;
      box.innerHTML = r.ok ? '<b>' + esc(r.negozio) + '</b> · utente <b>' + esc(r.utente) + '</b> · nuovo codice <code>' + esc(r.password) + '</code><br><small>Copialo ora e consegnalo al negozio: non verrà più mostrato. Il vecchio codice non funziona più.</small>' : esc(r.errore);
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
  root.querySelector('[data-accessi]').addEventListener('change', function (e) {
    var u = e.target.getAttribute('data-attivo'); if (u) call({ azione: 'attiva', utente: u, attivo: e.target.checked });
  });
  // Scheda del negozio (ruolo negozio)
  function apriScheda(r) {
    vista('negozio');
    var base = (window.LF ? window.LF.locali : []).filter(function (u) { return u.locale === r.locale; })[0] || {};
    var sc = r.scheda || {}, f = root.querySelector('[data-form="scheda"]');
    root.querySelector('[data-mio-locale]').textContent = 'Locale ' + r.locale;
    root.querySelector('[data-mio-nome]').textContent = r.negozio || base.nome || 'La tua scheda';
    root.querySelector('[data-cambiare-n]').hidden = !r.cambiare;
    ['telefono', 'whatsapp', 'email', 'sito', 'instagram', 'orari', 'descrizione'].forEach(function (k) { f[k].value = sc[k] !== undefined && r.scheda ? sc[k] : (base[k] || ''); });
    f.pausa.checked = !!sc.pausa;
    root.querySelector('[data-aggiornato]').textContent = sc.aggiornato ? 'Ultimo salvataggio: ' + sc.aggiornato + '.' : '';
    var link = root.querySelector('[data-vedi-scheda]'); if (base.slug) link.href = '../negozi/' + base.slug + '/'; else link.hidden = true;
  }
  root.querySelector('[data-form="scheda"]').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, d = { pausa: f.pausa.checked };
    ['telefono', 'whatsapp', 'email', 'sito', 'instagram', 'orari', 'descrizione'].forEach(function (k) { d[k] = f[k].value.trim(); });
    call({ azione: 'salva_scheda', scheda: d }).then(function (r) { msg(f, r.ok ? (d.pausa ? 'Salvato. Le modifiche sono in pausa: toglila per pubblicarle.' : 'Salvato: la tua pagina mostra già i nuovi dati.') : r.errore, r.ok); });
  });
  root.querySelector('[data-form="password-n"]').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    call({ azione: 'cambia_password', attuale: f.attuale.value, nuova: f.nuova.value }).then(function (r) { msg(f, r.ok ? 'Password cambiata.' : r.errore, r.ok); if (r.ok) { f.reset(); root.querySelector('[data-cambiare-n]').hidden = true; } });
  });
  // Vetrina
  var opts = '<option value="">— posto libero (rotazione) —</option>' + shops.map(function (s) { return '<option value="' + s.slug + '">' + esc(s.nome) + ' · ' + s.locale + '</option>'; }).join('');
  function disegnaVetrina(v) {
    var box = root.querySelector('[data-vetrina-righe]'), h = '';
    for (var i = 0; i < 4; i++) {
      var x = v[i] || {};
      h += '<div class="vrow"><span class="vnum">' + (i + 1) + '</span><select data-v="slug">' + opts + '</select><label>Dal<input type="date" data-v="dal" value="' + (x.dal || '') + '"></label><label>Al<input type="date" data-v="al" value="' + (x.al || '') + '"></label></div>';
    }
    box.innerHTML = h;
    box.querySelectorAll('.vrow').forEach(function (row, i) { row.querySelector('select').value = (v[i] || {}).slug || ''; });
  }
  root.querySelector('[data-salva="vetrina"]').addEventListener('click', function () {
    var pane = root.querySelector('[data-pane="vetrina"]');
    var lista = [].map.call(pane.querySelectorAll('.vrow'), function (r) { return { slug: r.querySelector('[data-v=slug]').value, dal: r.querySelector('[data-v=dal]').value, al: r.querySelector('[data-v=al]').value }; }).filter(function (x) { return x.slug; });
    call({ azione: 'salva_vetrina', vetrina: lista }).then(function (r) { msg(pane, r.ok ? 'Vetrina salvata: la home si aggiorna subito.' : r.errore, r.ok); });
  });
  // Destinatari
  function rigaDest(d) {
    d = d || { email: '', nome: '', negozio: true, temporary: true, banchetto: true };
    return '<div class="drow"><input type="email" placeholder="email@esempio.it" data-d="email" value="' + esc(d.email) + '"><input placeholder="Nome o agenzia" data-d="nome" value="' + esc(d.nome) + '">' +
      ['negozio', 'temporary', 'banchetto'].map(function (k) { return '<label class="tick"><input type="checkbox" data-d="' + k + '"' + (d[k] ? ' checked' : '') + '>' + { negozio: 'Negozio', temporary: 'Temporary', banchetto: 'Banchetto' }[k] + '</label>'; }).join('') +
      '<button type="button" class="linklike" data-togli aria-label="Togli destinatario">Togli</button></div>';
  }
  function disegnaDest(list) { var b = root.querySelector('[data-destinatari]'); b.innerHTML = (list.length ? list : [null]).map(rigaDest).join(''); }
  root.querySelector('[data-destinatari]').addEventListener('click', function (e) { if (e.target.hasAttribute('data-togli')) e.target.closest('.drow').remove(); });
  root.querySelector('[data-aggiungi]').addEventListener('click', function () { root.querySelector('[data-destinatari]').insertAdjacentHTML('beforeend', rigaDest()); });
  root.querySelector('[data-salva="destinatari"]').addEventListener('click', function () {
    var pane = root.querySelector('[data-pane="destinatari"]');
    var lista = [].map.call(pane.querySelectorAll('.drow'), function (r) { var o = {}; r.querySelectorAll('[data-d]').forEach(function (i) { o[i.getAttribute('data-d')] = i.type === 'checkbox' ? i.checked : i.value.trim(); }); return o; }).filter(function (x) { return x.email; });
    call({ azione: 'salva_destinatari', destinatari: lista }).then(function (r) { msg(pane, r.ok ? 'Destinatari salvati.' : r.errore, r.ok); });
  });
  // Richieste
  function disegnaRichieste(list) {
    var b = root.querySelector('[data-richieste]');
    if (!list.length) { b.innerHTML = '<p class="muted">Ancora nessuna richiesta.</p>'; return; }
    b.innerHTML = list.map(function (r) {
      return '<div class="rq"><div class="rq-top"><span class="pill">' + esc(r.tipo) + '</span><small class="muted">' + esc(r.data) + '</small>' +
        '<select data-riga="' + r.riga + '">' + ['Nuova', 'In trattativa', 'Chiusa'].map(function (s) { return '<option' + (s === r.stato ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
        '<b>' + esc(r.azienda || r.nome) + '</b><span class="muted">' + esc(r.nome) + ' · <a href="tel:' + esc(r.telefono) + '">' + esc(r.telefono) + '</a> · <a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a></span>' +
        (r.dettaglio ? '<span>' + esc(r.dettaglio) + '</span>' : '') + (r.messaggio ? '<p>' + esc(r.messaggio) + '</p>' : '') + '</div>';
    }).join('');
    b.querySelectorAll('select[data-riga]').forEach(function (s) { s.addEventListener('change', function () { call({ azione: 'stato_richiesta', riga: s.getAttribute('data-riga'), stato: s.value }); }); });
  }
  // Password
  root.querySelector('[data-form="password"]').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target;
    call({ azione: 'cambia_password', attuale: f.attuale.value, nuova: f.nuova.value }).then(function (r) {
      msg(f, r.ok ? 'Password cambiata.' : r.errore, r.ok); if (r.ok) { f.reset(); root.querySelector('[data-cambiare]').hidden = true; }
    });
  });

  if (token) avvia(); else vista('login');
})();
