/**
 * Le Fornaci – motore del sito (Google Apps Script).
 *
 * Fa tre cose:
 *  1. riceve le richieste "Apri il tuo spazio", risponde subito al richiedente e avvisa i destinatari scelti;
 *  2. gestisce l'area admin (password, cambio e reset password);
 *  3. salva e restituisce la vetrina della home (fino a 4 negozi in evidenza).
 *
 * Installazione (una volta sola): vedi backend/LEGGIMI.md
 */

var SITO = 'https://modavortex.github.io/lefornaci/';           // indirizzo pubblico del sito (cambia quando va sul dominio ufficiale)
var PASSWORD_INIZIALE = 'LeFornaci2026';                          // valida solo al primo accesso: poi va cambiata
var EMAIL_RECUPERO = 'modavortex@gmail.com';                      // dove arriva il codice per reimpostare la password
var NOME_MITTENTE = 'Le Fornaci Mega Shopping';
var TIPI = { negozio: 'Negozio fisico', temporary: 'Temporary', banchetto: 'Banchetto in galleria' };

/* ---------- avvio ---------- */
function setup() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SHEET_ID')) {
    var ss = SpreadsheetApp.create('Le Fornaci – Sito (richieste e impostazioni)');
    ss.getSheets()[0].setName('Richieste').appendRow(['Data', 'Tipo', 'Nome', 'Azienda / insegna', 'Telefono', 'Email', 'Locale o periodo', 'Messaggio', 'Stato']);
    ss.insertSheet('Destinatari').appendRow(['Email', 'Nome', 'Negozio fisico', 'Temporary', 'Banchetto']);
    ss.getSheetByName('Destinatari').appendRow([EMAIL_RECUPERO, 'Pier', true, true, true]);
    ss.insertSheet('Vetrina').appendRow(['Slug negozio', 'Dal', 'Al']);
    ss.insertSheet('Registro').appendRow(['Data', 'Evento']);
    ss.insertSheet('Accessi').appendRow(['Utente', 'Ruolo', 'Negozio', 'Hash', 'Salt', 'Da cambiare', 'Ultimo accesso', 'Attivo']);
    ss.insertSheet('Schede').appendRow(['Locale', 'Aggiornato', 'In pausa', 'Telefono', 'WhatsApp', 'Email', 'Sito', 'Instagram', 'Orari', 'Descrizione']);
    p.setProperty('SHEET_ID', ss.getId());
  }
  if (!trovaUtente_('admin')) creaUtente_('admin', 'admin', 'Amministrazione', PASSWORD_INIZIALE, true);
  importaNegozi_();
  Logger.log('Pronto. Foglio: https://docs.google.com/spreadsheets/d/' + p.getProperty('SHEET_ID'));
}

/* ---------- ingressi web ---------- */
function doGet(e) {
  var a = (e.parameter.azione || '').toLowerCase();
  if (a === 'vetrina') return json_({ ok: true, vetrina: vetrinaAttiva_() });
  if (a === 'scheda') return json_({ ok: true, scheda: schedaPubblica_(e.parameter.locale) });
  return json_({ ok: true, servizio: 'Le Fornaci' });
}

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents || '{}'); } catch (x) { return json_({ ok: false, errore: 'Richiesta non valida' }); }
  try {
    switch (d.azione) {
      case 'richiesta': return json_(nuovaRichiesta_(d));
      case 'login': return json_(login_(d.utente, d.password));
      case 'reset_chiedi': return json_(resetChiedi_());
      case 'reset_conferma': return json_(resetConferma_(d.codice, d.nuova));
    }
    var s = sessione_(d.token);
    if (!s) return json_({ ok: false, errore: 'Sessione scaduta: accedi di nuovo', scaduta: true });
    switch (d.azione) {
      case 'cambia_password': return json_(cambiaPassword_(s.utente, d.attuale, d.nuova));
      case 'esci': CacheService.getScriptCache().remove('s_' + d.token); return json_({ ok: true });
      case 'mia_scheda': return json_({ ok: true, ruolo: s.ruolo, negozio: s.negozio, locale: s.utente, cambiare: s.cambiare, scheda: leggiScheda_(s.utente) });
      case 'salva_scheda': if (s.ruolo !== 'negozio') break; return json_(salvaScheda_(s.utente, d.scheda));
    }
    if (s.ruolo !== 'admin') return json_({ ok: false, errore: 'Permesso negato' });
    switch (d.azione) {
      case 'stato': return json_({ ok: true, ruolo: 'admin', vetrina: leggiVetrina_(), destinatari: leggiDestinatari_(), richieste: ultimeRichieste_(30), accessi: elencoAccessi_(), cambiare: s.cambiare });
      case 'rigenera': return json_(rigenera_(d.utente));
      case 'attiva': return json_(attivaUtente_(d.utente, d.attivo));
      case 'salva_vetrina': return json_(salvaVetrina_(d.vetrina));
      case 'salva_destinatari': return json_(salvaDestinatari_(d.destinatari));
      case 'stato_richiesta': return json_(statoRichiesta_(d.riga, d.stato));
    }
    return json_({ ok: false, errore: 'Azione sconosciuta' });
  } catch (err) {
    log_('Errore: ' + err);
    return json_({ ok: false, errore: 'Errore interno, riprova' });
  }
}

/* ---------- richieste "Apri il tuo spazio" ---------- */
function nuovaRichiesta_(d) {
  var tipo = TIPI[d.tipo] ? d.tipo : 'negozio';
  var email = String(d.email || '').trim(), nome = String(d.nome || '').trim();
  if (!nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, errore: 'Nome ed email sono obbligatori' };
  if (d.sito_web) return { ok: true }; // campo nascosto anti-spam
  var c = CacheService.getScriptCache(), k = 'rq_' + email.toLowerCase();
  if (c.get(k)) return { ok: true, gia: true };
  c.put(k, '1', 120);
  var r = { tipo: tipo, nome: nome.slice(0, 120), azienda: String(d.azienda || '').slice(0, 120), telefono: String(d.telefono || '').slice(0, 40),
            email: email.slice(0, 120), dettaglio: String(d.dettaglio || '').slice(0, 200), messaggio: String(d.messaggio || '').slice(0, 2000) };
  foglio_('Richieste').appendRow([new Date(), TIPI[tipo], r.nome, r.azienda, r.telefono, r.email, r.dettaglio, r.messaggio, 'Nuova']);
  var liberi = localiLiberi_();
  // 1) risposta immediata al richiedente
  MailApp.sendEmail({ to: r.email, name: NOME_MITTENTE, subject: 'Le Fornaci – abbiamo ricevuto la tua richiesta (' + TIPI[tipo] + ')', htmlBody: emailRichiedente_(r, liberi) });
  // 2) avviso ai destinatari scelti dall'amministrazione per questo tipo
  var dest = leggiDestinatari_().filter(function (x) { return x[tipo]; }).map(function (x) { return x.email; });
  if (dest.length) MailApp.sendEmail({ to: dest.join(','), replyTo: r.email, name: 'Sito Le Fornaci', subject: 'Nuova richiesta ' + TIPI[tipo] + ': ' + (r.azienda || r.nome), htmlBody: emailInterna_(r) });
  log_('Richiesta ' + tipo + ' da ' + r.email);
  return { ok: true };
}

function localiLiberi_() {
  try {
    var t = UrlFetchApp.fetch(SITO + 'assets/js/dati.js', { muteHttpExceptions: true }).getContentText();
    var d = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    var nomi = d.piani;
    return d.locali.filter(function (l) { return l.stato === 'libero'; }).map(function (l) { return { locale: l.locale, piano: nomi[l.piano].nome }; });
  } catch (x) { return []; }
}

function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function cornice_(titolo, corpo) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;background:#F6F4F1;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;color:#17140F">' +
    '<p style="margin:0 0 18px;font-size:13px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#B4472B">Le Fornaci Mega Shopping</p>' +
    '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.2">' + titolo + '</h1>' + corpo +
    '<p style="margin:24px 0 0;font-size:13px;color:#5E584F">Strada Torino 34/36, Beinasco (TO)<br>Tel. 011 397 1809 · info@centrolefornaci.com</p></div></div>';
}

function emailRichiedente_(r, liberi) {
  var corpo = '<p style="font-size:16px;line-height:1.6">Ciao ' + esc_(r.nome) + ', grazie per l’interesse. La tua richiesta per <b>' + TIPI[r.tipo] + '</b> è stata <b>presa in carico</b>: ti ricontattiamo entro un giorno lavorativo.</p>';
  if (r.tipo === 'negozio') {
    corpo += liberi.length
      ? '<p style="font-size:16px;margin:18px 0 8px"><b>Locali disponibili oggi</b></p><ul style="font-size:15px;line-height:1.7;padding-left:18px">' + liberi.map(function (l) { return '<li>Locale ' + esc_(l.locale) + ' · ' + esc_(l.piano) + (l.locale === '7' ? ' (su due piani)' : '') + ' – <a href="' + SITO + 'negozi/?locale=' + encodeURIComponent(l.locale) + '" style="color:#B4472B">vedi sulla mappa</a></li>'; }).join('') + '</ul>'
      : '<p style="font-size:15px">In questo momento i locali sono tutti assegnati: ti avvisiamo appena se ne libera uno.</p>';
  } else if (r.tipo === 'temporary') {
    corpo += '<p style="font-size:15px;line-height:1.6">Per i temporary verifichiamo i locali liberi e le date che ci hai indicato, e ti mandiamo una proposta con spazio, durata e condizioni.</p>';
  } else {
    corpo += '<p style="font-size:15px;line-height:1.6">I banchetti sono postazioni in galleria per esporre e vendere senza un negozio: ideali per lanci, stagionalità ed eventi. Ti proponiamo posizione e date disponibili.</p>';
  }
  corpo += '<p style="margin:22px 0 0"><a href="' + SITO + 'negozi/" style="display:inline-block;background:#B4472B;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">Guarda la mappa del centro</a></p>';
  return cornice_('Richiesta ricevuta', corpo);
}

function emailInterna_(r) {
  var righe = [['Tipo', TIPI[r.tipo]], ['Nome', r.nome], ['Azienda / insegna', r.azienda], ['Telefono', r.telefono], ['Email', r.email], ['Locale o periodo', r.dettaglio], ['Messaggio', r.messaggio]];
  var t = '<table style="width:100%;border-collapse:collapse;font-size:15px">' + righe.filter(function (x) { return x[1]; }).map(function (x) { return '<tr><td style="padding:8px 0;color:#5E584F;width:150px;vertical-align:top">' + x[0] + '</td><td style="padding:8px 0;font-weight:bold">' + esc_(x[1]).replace(/\n/g, '<br>') + '</td></tr>'; }).join('') + '</table>';
  return cornice_('Nuova richiesta dal sito', t + '<p style="font-size:14px;color:#5E584F">Rispondi direttamente a questa email per scrivere al richiedente. Il richiedente ha già ricevuto una conferma automatica.</p>');
}

/* ---------- accessi: admin e negozi (foglio "Accessi") ---------- */
function hash_(pwd, salt) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pwd, Utilities.Charset.UTF_8);
  for (var i = 0; i < 2000; i++) b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b.concat(Utilities.newBlob(salt).getBytes()));
  return Utilities.base64Encode(b);
}
function genera_() {
  var L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', N = '23456789', s = '';
  for (var i = 0; i < 4; i++) s += L.charAt(Math.floor(Math.random() * L.length));
  s += '-';
  for (var j = 0; j < 4; j++) s += N.charAt(Math.floor(Math.random() * N.length));
  return s; // es. KPTR-4829: facile da dettare al telefono
}
function righeAccessi_() { return foglio_('Accessi').getDataRange().getValues(); }
function trovaUtente_(u) {
  u = String(u || '').trim().toLowerCase(); var v = righeAccessi_();
  for (var i = 1; i < v.length; i++) if (String(v[i][0]).toLowerCase() === u) return { riga: i + 1, utente: String(v[i][0]), ruolo: v[i][1], negozio: v[i][2], hash: v[i][3], salt: v[i][4], cambiare: v[i][5] === true, attivo: v[i][7] !== false };
  return null;
}
function creaUtente_(utente, ruolo, negozio, pwd, cambiare) {
  var salt = Utilities.getUuid();
  foglio_('Accessi').appendRow([utente, ruolo, negozio, hash_(pwd, salt), salt, !!cambiare, '', true]);
}
function impostaPassword_(utente, pwd, cambiare) {
  var u = trovaUtente_(utente); if (!u) return false;
  var salt = Utilities.getUuid();
  foglio_('Accessi').getRange(u.riga, 4, 1, 3).setValues([[hash_(pwd, salt), salt, !!cambiare]]);
  return true;
}
/** Crea un accesso per ogni negozio del sito che non ce l'ha ancora (utente = numero del locale). */
function importaNegozi_() {
  try {
    var t = UrlFetchApp.fetch(SITO + 'assets/js/dati.js', { muteHttpExceptions: true }).getContentText();
    var d = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)), n = 0;
    d.locali.forEach(function (l) { if (l.nome && !trovaUtente_(l.locale)) { creaUtente_(l.locale, 'negozio', l.nome, genera_(), true); n++; } });
    log_('Accessi negozi creati: ' + n);
  } catch (x) { log_('Import negozi non riuscito: ' + x); }
}
function login_(utente, pwd) {
  var c = CacheService.getScriptCache(), key = 'tent_' + String(utente || '').toLowerCase(), n = Number(c.get(key) || 0);
  if (n >= 8) return { ok: false, errore: 'Troppi tentativi: riprova tra 10 minuti' };
  var u = trovaUtente_(utente);
  if (!u || !u.attivo || !pwd || hash_(String(pwd), u.salt) !== u.hash) {
    c.put(key, String(n + 1), 600); Utilities.sleep(700);
    log_('Accesso fallito: ' + utente); return { ok: false, errore: 'Utente o password errati' };
  }
  c.remove(key);
  var token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  c.put('s_' + token, JSON.stringify({ utente: u.utente, ruolo: u.ruolo, negozio: u.negozio }), 21600);
  foglio_('Accessi').getRange(u.riga, 7).setValue(new Date());
  log_('Accesso: ' + u.utente);
  return { ok: true, token: token, ruolo: u.ruolo, cambiare: u.cambiare };
}
function sessione_(token) {
  var raw = token && CacheService.getScriptCache().get('s_' + token); if (!raw) return null;
  var s = JSON.parse(raw), u = trovaUtente_(s.utente); if (!u || !u.attivo) return null;
  s.cambiare = u.cambiare; return s;
}
function valida_(pwd) { return pwd && pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /\d/.test(pwd); }
function cambiaPassword_(utente, attuale, nuova) {
  var u = trovaUtente_(utente);
  if (!u || hash_(String(attuale || ''), u.salt) !== u.hash) return { ok: false, errore: 'La password attuale non è corretta' };
  if (!valida_(nuova)) return { ok: false, errore: 'Usa almeno 8 caratteri con lettere e numeri' };
  impostaPassword_(utente, nuova, false); log_('Password cambiata: ' + utente); return { ok: true };
}
function rigenera_(utente) {
  var u = trovaUtente_(utente); if (!u || u.ruolo !== 'negozio') return { ok: false, errore: 'Negozio non trovato' };
  var pwd = genera_(); impostaPassword_(utente, pwd, true); log_('Password rigenerata: ' + utente);
  return { ok: true, utente: u.utente, negozio: u.negozio, password: pwd }; // mostrata una sola volta all'admin
}
function attivaUtente_(utente, attivo) {
  var u = trovaUtente_(utente); if (!u || u.ruolo === 'admin') return { ok: false, errore: 'Utente non valido' };
  foglio_('Accessi').getRange(u.riga, 8).setValue(!!attivo); return { ok: true };
}
function elencoAccessi_() {
  return righeAccessi_().slice(1).filter(function (r) { return r[1] === 'negozio'; }).map(function (r) {
    return { utente: String(r[0]), negozio: r[2], ultimo: r[6] ? Utilities.formatDate(new Date(r[6]), 'Europe/Rome', 'dd/MM/yyyy') : '', cambiare: r[5] === true, attivo: r[7] !== false };
  });
}
/* Reset della password admin con codice via email */
function resetChiedi_() {
  var c = CacheService.getScriptCache();
  if (c.get('reset_inviato')) return { ok: true };
  var codice = String(Math.floor(100000 + Math.random() * 900000));
  c.put('reset_codice', codice, 900); c.put('reset_inviato', '1', 120);
  MailApp.sendEmail({ to: EMAIL_RECUPERO, name: NOME_MITTENTE, subject: 'Le Fornaci – codice per reimpostare la password admin', htmlBody: cornice_('Reimposta la password', '<p style="font-size:16px">Il tuo codice è:</p><p style="font-size:32px;font-weight:bold;letter-spacing:.2em;margin:8px 0">' + codice + '</p><p style="font-size:14px;color:#5E584F">Vale 15 minuti. Se non l’hai chiesto tu, ignora questa email.</p>') });
  log_('Richiesto reset password admin'); return { ok: true };
}
function resetConferma_(codice, nuova) {
  var c = CacheService.getScriptCache(), giusto = c.get('reset_codice');
  if (!giusto || String(codice).trim() !== giusto) return { ok: false, errore: 'Codice errato o scaduto' };
  if (!valida_(nuova)) return { ok: false, errore: 'Usa almeno 8 caratteri con lettere e numeri' };
  c.remove('reset_codice'); impostaPassword_('admin', nuova, false); log_('Password admin reimpostata con codice'); return { ok: true };
}

/* ---------- schede aggiornate dai negozi (foglio "Schede") ---------- */
var CAMPI = ['pausa', 'telefono', 'whatsapp', 'email', 'sito', 'instagram', 'orari', 'descrizione'];
function rigaScheda_(locale) {
  var v = foglio_('Schede').getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === String(locale)) return { riga: i + 1, v: v[i] };
  return null;
}
function leggiScheda_(locale) {
  var r = rigaScheda_(locale); if (!r) return null;
  var o = { aggiornato: r.v[1] ? Utilities.formatDate(new Date(r.v[1]), 'Europe/Rome', 'dd/MM/yyyy HH:mm') : '' };
  CAMPI.forEach(function (k, i) { o[k] = k === 'pausa' ? r.v[2] === true : String(r.v[i + 2] || ''); });
  return o;
}
function schedaPubblica_(locale) { var s = locale && leggiScheda_(locale); return s || null; }
function salvaScheda_(locale, d) {
  d = d || {};
  var riga = [String(locale), new Date(), !!d.pausa].concat(CAMPI.slice(1).map(function (k) { return String(d[k] || '').slice(0, k === 'descrizione' ? 1500 : 200); }));
  var r = rigaScheda_(locale), sh = foglio_('Schede');
  if (r) sh.getRange(r.riga, 1, 1, riga.length).setValues([riga]); else sh.appendRow(riga);
  log_('Scheda aggiornata dal negozio ' + locale); return { ok: true };
}

/* ---------- vetrina, destinatari, richieste ---------- */
function leggiVetrina_() {
  return foglio_('Vetrina').getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    return { slug: String(r[0]), dal: r[1] ? Utilities.formatDate(new Date(r[1]), 'Europe/Rome', 'yyyy-MM-dd') : '', al: r[2] ? Utilities.formatDate(new Date(r[2]), 'Europe/Rome', 'yyyy-MM-dd') : '' };
  });
}
function vetrinaAttiva_() {
  var oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  return leggiVetrina_().filter(function (v) { return (!v.dal || v.dal <= oggi) && (!v.al || v.al >= oggi); }).slice(0, 4).map(function (v) { return v.slug; });
}
function salvaVetrina_(lista) {
  lista = (lista || []).filter(function (v) { return v && v.slug; }).slice(0, 4);
  var sh = foglio_('Vetrina'); sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), 3).clearContent();
  if (lista.length) sh.getRange(2, 1, lista.length, 3).setValues(lista.map(function (v) { return [v.slug, v.dal || '', v.al || '']; }));
  log_('Vetrina aggiornata: ' + lista.map(function (v) { return v.slug; }).join(', ')); return { ok: true };
}
function leggiDestinatari_() {
  return foglio_('Destinatari').getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(function (r) {
    return { email: String(r[0]), nome: String(r[1] || ''), negozio: r[2] === true, temporary: r[3] === true, banchetto: r[4] === true };
  });
}
function salvaDestinatari_(lista) {
  lista = (lista || []).filter(function (x) { return x && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(x.email || '').trim()); }).slice(0, 20);
  var sh = foglio_('Destinatari'); sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), 5).clearContent();
  if (lista.length) sh.getRange(2, 1, lista.length, 5).setValues(lista.map(function (x) { return [String(x.email).trim(), x.nome || '', !!x.negozio, !!x.temporary, !!x.banchetto]; }));
  log_('Destinatari aggiornati (' + lista.length + ')'); return { ok: true };
}
function ultimeRichieste_(n) {
  var v = foglio_('Richieste').getDataRange().getValues(), out = [];
  for (var i = v.length - 1; i >= 1 && out.length < n; i--) {
    out.push({ riga: i + 1, data: Utilities.formatDate(new Date(v[i][0]), 'Europe/Rome', 'dd/MM/yyyy HH:mm'), tipo: v[i][1], nome: v[i][2], azienda: v[i][3], telefono: v[i][4], email: v[i][5], dettaglio: v[i][6], messaggio: v[i][7], stato: v[i][8] });
  }
  return out;
}
function statoRichiesta_(riga, stato) {
  if (['Nuova', 'In trattativa', 'Chiusa'].indexOf(stato) < 0) return { ok: false, errore: 'Stato non valido' };
  foglio_('Richieste').getRange(Number(riga), 9).setValue(stato); return { ok: true };
}

/* ---------- utilità ---------- */
function foglio_(nome) { return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getSheetByName(nome); }
function log_(t) { try { foglio_('Registro').appendRow([new Date(), t]); } catch (x) {} }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
