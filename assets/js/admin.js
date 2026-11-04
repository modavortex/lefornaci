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
      disegnaVetrina(r.vetrina); disegnaDest(r.destinatari); disegnaRichieste(r.richieste); disegnaSchede(); accessi = r.accessi || []; disegnaAccessi();
    }).catch(function () { vista('login'); });
  }
  // Schede locali (solo admin)
  var CATS = window.LF ? window.LF.categorie : [], STATI = { aperto: 'Aperto', nuova_apertura: 'Nuova apertura', libero: 'Libero' }, aperto = null;
  root.querySelector('[data-categorie]').innerHTML = CATS.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('');
  function tutti() { return (window.LF ? window.LF.locali : []).slice().sort(function (a, b) { return a.locale - b.locale; }); }
  function disegnaSchede() {
    var q = (root.querySelector('[data-cerca-schede]').value || '').toLowerCase(), st = root.querySelector('[data-filtro-schede]').value;
    root.querySelector('[data-schede]').innerHTML = tutti().filter(function (u) {
      return (!st || u.stato === st || (st === 'aperto' && u.stato === 'da_verificare')) && (!q || u.locale === q || (u.nome || '').toLowerCase().indexOf(q) >= 0);
    }).map(function (u) {
      var lib = u.stato === 'libero';
      return '<button type="button" class="srow" data-apri="' + u.locale + '"><span class="vnum">' + u.locale + '</span><span><b>' + (lib ? 'Libero' : esc(u.nome)) + '</b><small class="muted">' + (lib ? 'Inserisci un nuovo ingresso' : (STATI[u.stato] || 'Aperto') + (u.categoria ? ' · ' + esc((CATS.filter(function (c) { return c.id === u.categoria; })[0] || {}).nome || '') : '')) + '</small></span><span class="pill' + (lib ? ' pill-new' : '') + '">' + (lib ? 'Prossimamente' : 'Apri') + '</span></button>';
    }).join('');
  }
  root.querySelector('[data-cerca-schede]').addEventListener('input', disegnaSchede);
  root.querySelector('[data-filtro-schede]').addEventListener('change', disegnaSchede);
  var fl = root.querySelector('[data-form="locale"]'), elenco = root.querySelector('[data-schede-elenco]');
  function mostraCampi() { var st = fl.stato.value; fl.querySelector('[data-se-occupato]').hidden = st === 'libero'; fl.querySelector('[data-se-nuovo]').hidden = st !== 'nuova_apertura'; fl.nome.required = st !== 'libero'; fl.querySelector('[data-invia-accesso]').hidden = st === 'libero'; }
  fl.stato.addEventListener('change', mostraCampi);
  root.querySelector('[data-schede]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-apri]'); if (!b) return;
    var u = tutti().filter(function (x) { return x.locale === b.getAttribute('data-apri'); })[0]; aperto = u.locale;
    fl.reset(); fl.querySelector('.form-msg').hidden = true;
    fl.stato.value = u.stato === 'da_verificare' ? 'aperto' : u.stato;
    ['nome', 'categoria', 'apertura', 'email_operatore', 'telefono', 'whatsapp', 'email', 'sito', 'instagram', 'orari', 'descrizione'].forEach(function (k) { if (u[k] !== undefined && u[k] !== null) fl[k].value = u[k]; });
    if (!u.categoria) fl.categoria.value = CATS[0] ? CATS[0].id : '';
    if (u.stato === 'libero') fl.stato.value = 'nuova_apertura';
    root.querySelector('[data-ed-titolo]').textContent = u.stato === 'libero' ? 'Nuovo ingresso · locale ' + u.locale : (u.nome + ' · locale ' + u.locale);
    root.querySelector('[data-ed-sotto]').textContent = (u.piano === 'P' ? 'Primo piano' : 'Piano terra') + (u.stato === 'libero' ? ' · oggi il locale è libero: compila i dati del nuovo negozio.' : '');
    var v = root.querySelector('[data-ed-vedi]'); v.hidden = u.stato === 'libero'; v.href = '../negozi/' + (u.slug ? u.slug + '/' : 'scheda/?locale=' + u.locale);
    mostraCampi(); elenco.hidden = true; fl.hidden = false; fl.scrollIntoView({ block: 'start' });
  });
  root.querySelector('[data-torna]').addEventListener('click', function () { fl.hidden = true; elenco.hidden = false; disegnaSchede(); });
  function datiForm() { var o = {}; ['stato', 'nome', 'categoria', 'apertura', 'email_operatore', 'telefono', 'whatsapp', 'email', 'sito', 'instagram', 'orari', 'descrizione'].forEach(function (k) { o[k] = fl[k].value.trim(); }); return o; }
  function salvaLocale() {
    var o = datiForm();
    return call({ azione: 'salva_locale', locale: aperto, dati: o }).then(function (r) {
      if (r.ok && window.LF) { var u = window.LF.locali.filter(function (x) { return x.locale === aperto; })[0]; window.LF = window.LF; u = window.LF.locali.filter(function (x) { return x.locale === aperto; })[0]; if (u) { if (o.stato === 'libero') { u.stato = 'libero'; u.nome = ''; } else { Object.keys(o).forEach(function (k) { u[k] = o[k]; }); } } }
      if (r.ok) call({ azione: 'stato' }).then(function (x) { if (x.ok) { accessi = x.accessi || []; disegnaAccessi(); } });
      return r;
    });
  }
  fl.addEventListener('submit', function (e) {
    e.preventDefault();
    salvaLocale().then(function (r) {
      msg(fl, r.ok ? (fl.stato.value === 'libero' ? 'Locale liberato: sul sito ora risulta “Prossimamente”.' : 'Scheda salvata: mappa, elenco e pagina del negozio sono aggiornati.') : r.errore, r.ok);
      if (r.ok) { root.querySelector('[data-ed-vedi]').hidden = fl.stato.value === 'libero'; root.querySelector('[data-ed-titolo]').textContent = (fl.stato.value === 'libero' ? 'Locale ' : fl.nome.value + ' · locale ') + aperto; }
    });
  });
  var bz = root.querySelector('[data-bozza]');
  fl.querySelector('[data-invia-accesso]').addEventListener('click', function () {
    if (!fl.email_operatore.value.trim()) { msg(fl, 'Inserisci l’email dell’operatore.'); fl.email_operatore.focus(); return; }
    if (!fl.reportValidity()) return;
    salvaLocale().then(function (r) {
      if (!r.ok) { msg(fl, r.errore); return; }
      return call({ azione: 'bozza_accesso', locale: aperto }).then(function (b) {
        if (!b.ok) { msg(fl, b.errore); return; }
        bz.querySelector('[data-b="a"]').textContent = b.a; bz.querySelector('[data-b="oggetto"]').textContent = b.oggetto; bz.querySelector('[data-b="testo"]').textContent = b.testo;
        call({ azione: 'stato' }).then(function (x) { if (x.ok) { accessi = x.accessi || []; disegnaAccessi(); } });
        bz.hidden = false; msg(fl, 'Bozza pronta. Il codice precedente di questo locale non vale più.', true);
      });
    });
  });
  bz.querySelector('[data-b-chiudi]').addEventListener('click', function () { bz.hidden = true; });
  bz.addEventListener('click', function (e) { if (e.target === bz) bz.hidden = true; });
  bz.querySelector('[data-b-copia]').addEventListener('click', function (e) {
    var t = 'A: ' + bz.querySelector('[data-b="a"]').textContent + '\nOggetto: ' + bz.querySelector('[data-b="oggetto"]').textContent + '\n\n' + bz.querySelector('[data-b="testo"]').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { e.target.textContent = 'Copiato ✓'; setTimeout(function () { e.target.textContent = 'Copia il testo'; }, 1800); }).catch(function () {});
  });
  // Accessi negozi (solo admin)
  var accessi = [];
  function disegnaAccessi() {
    var q = (root.querySelector('[data-cerca-accessi]').value || '').toLowerCase();
    root.querySelector('[data-accessi]').innerHTML = accessi.filter(function (a) { return !q || (/^\d+$/.test(q) ? a.utente === q : a.utente.toLowerCase().indexOf(q) >= 0) || !/^\d+$/.test(q) && String(a.negozio).toLowerCase().indexOf(q) >= 0; }).map(function (a) {
      return '<div class="acc"><span class="vnum" style="width:auto;border-radius:8px;padding:0 8px">' + esc(a.utente) + '</span><span><b>' + esc(a.negozio) + '</b><small class="muted">' + (a.email ? esc(a.email) + ' · ' : '') + (a.ultimo ? 'Ultimo accesso ' + esc(a.ultimo) : 'Mai entrato') + (a.cambiare ? ' · codice da cambiare' : '') + '</small>' + (a.demo ? '<small class="demo-code">Codice di prova: <code>' + esc(a.demo) + '</code></small>' : '') + '</span>' +
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
