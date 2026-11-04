/* Le Fornaci — MODALITÀ DIMOSTRATIVA.
   Finché data/centro.json "motore" è vuoto, questo file simula il motore Google:
   accessi fissi, dati salvati solo nel browser di chi prova (localStorage).
   Quando il motore vero è collegato, questo file viene ignorato. */
(function () {
  'use strict';
  if (window.LF_MOTORE) return;
  var KEY = 'lf_demo_v1', ADMIN_PASS = 'LeFornaci2026';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  // codice fisso e "credibile" per ogni locale, es. 40 → KMTR-4071
  function codice(loc, giro) {
    var s = (parseInt(loc, 10) || 0) * 7919 + (giro || 0) * 104729 + 12345, L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', out = '';
    for (var i = 0; i < 4; i++) { s = (s * 1103515245 + 12345) % 2147483648; out += L[s % L.length]; }
    s = (s * 1103515245 + 12345) % 2147483648; return out + '-' + (1000 + s % 9000);
  }
  var CAMPI = ['telefono', 'whatsapp', 'email', 'sito', 'instagram', 'orari', 'descrizione'];
  function unisci(LF) {
    var d = load(), L = d.locali || {}, S = d.schede || {};
    (LF.locali || []).forEach(function (u) {
      var o = L[u.locale], sc = S[u.locale];
      if (o) {
        if (o.stato === 'libero') { u.stato = 'libero'; u.nome = ''; u.slug = ''; u.logo = null; u.categoria = ''; }
        else {
          if (o.nuova || u.stato === 'libero') { u.slug = ''; u.logo = null; u.foto = []; CAMPI.forEach(function (k) { u[k] = ''; }); }
          u.stato = o.stato || u.stato; u.nome = o.nome || u.nome; u.categoria = o.categoria || u.categoria; u.apertura = o.apertura || u.apertura;
        }
      }
      if (sc && !sc.pausa && u.stato !== 'libero') CAMPI.forEach(function (k) { if (sc[k] !== undefined) u[k] = sc[k]; });
    });
    return LF;
  }
  var _lf;
  try { Object.defineProperty(window, 'LF', { configurable: true, get: function () { return _lf; }, set: function (v) { _lf = unisci(v); } }); } catch (e) {}
  // elenco negozi (pagina /negozi/): allinea le righe ai locali modificati dall'admin
  document.addEventListener('DOMContentLoaded', function () {
    var d = load(); if (!d.locali || !window.LF) return;
    Object.keys(d.locali).forEach(function (loc) {
      var u = window.LF.locali.filter(function (x) { return x.locale === loc; })[0], row = document.querySelector('.shop-row[data-shop="' + loc + '"]'); if (!u || !row) return;
      var b = row.querySelector('b'), sm = row.querySelector('small');
      row.setAttribute('data-st', u.stato); row.setAttribute('data-name', u.nome || ''); row.setAttribute('data-c', u.categoria || '');
      if (u.stato === 'libero') { b.textContent = 'Prossimamente'; row.href = (row.getAttribute('href').indexOf('../') === 0 ? '' : '../') + 'apri-il-tuo-spazio/?locale=' + loc; return; }
      b.textContent = u.nome; if (sm) sm.textContent = 'Locale ' + loc + (u.stato === 'nuova_apertura' ? ' · Nuova apertura' : '');
      if (!u.slug) {
        row.href = 'scheda/?locale=' + loc;
        var ic = row.querySelector('.logo,.monogram'); if (ic) { var m = document.createElement('span'); m.className = 'monogram'; m.setAttribute('aria-hidden', 'true'); m.textContent = u.nome.replace(/[^A-Za-zÀ-ú0-9 ]/g, '').split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(); ic.replaceWith(m); }
      }
    });
  });
  function oggi() { var d = new Date(); return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); }
  function negozi() { return (window.LF ? window.LF.locali : []).filter(function (u) { return u.nome && u.stato !== 'libero'; }); }
  function acc(d, u) { d.acc = d.acc || {}; return d.acc[u] = d.acc[u] || { giro: 0, attivo: true }; }
  function pass(d, u) { var a = acc(d, u); return a.password || codice(u, a.giro); }
  var R = {
    login: function (x, d) {
      var u = String(x.utente || '').trim().toLowerCase();
      if (u === 'admin') { if (x.password !== (d.adminPass || ADMIN_PASS)) return { ok: false, errore: 'Utente o password non corretti.' }; d.sess = 'admin'; return { ok: true, token: 'demo-admin' }; }
      var n = negozi().filter(function (s) { return s.locale === u; })[0];
      if (!n || String(x.password || '').trim().toUpperCase() !== pass(d, u).toUpperCase()) return { ok: false, errore: 'Utente o password non corretti.' };
      if (!acc(d, u).attivo) return { ok: false, errore: 'Accesso sospeso: contatta la direzione.' };
      acc(d, u).ultimo = oggi(); d.sess = u; return { ok: true, token: 'demo-' + u };
    },
    esci: function (x, d) { d.sess = null; return { ok: true }; },
    mia_scheda: function (x, d) {
      if (!d.sess) return { ok: false, scaduta: true };
      if (d.sess === 'admin') return { ok: true, ruolo: 'admin' };
      var n = negozi().filter(function (s) { return s.locale === d.sess; })[0] || {};
      return { ok: true, ruolo: 'negozio', locale: d.sess, negozio: n.nome, cambiare: !acc(d, d.sess).password, scheda: (d.schede || {})[d.sess] || null };
    },
    salva_scheda: function (x, d) { if (!d.sess || d.sess === 'admin') return { ok: false, errore: 'Sessione scaduta.' }; d.schede = d.schede || {}; x.scheda.aggiornato = oggi(); d.schede[d.sess] = x.scheda; return { ok: true }; },
    cambia_password: function (x, d) {
      if (!d.sess) return { ok: false, errore: 'Sessione scaduta.' };
      if (!x.nuova || x.nuova.length < 8) return { ok: false, errore: 'La nuova password deve avere almeno 8 caratteri.' };
      if (d.sess === 'admin') { if (x.attuale !== (d.adminPass || ADMIN_PASS)) return { ok: false, errore: 'La password attuale non è corretta.' }; d.adminPass = x.nuova; return { ok: true }; }
      if (String(x.attuale).trim().toUpperCase() !== pass(d, d.sess).toUpperCase()) return { ok: false, errore: 'La password attuale non è corretta.' };
      acc(d, d.sess).password = x.nuova; return { ok: true };
    },
    reset_chiedi: function () { return { ok: true }; },
    reset_conferma: function (x, d) { if (String(x.codice).trim() !== '123456') return { ok: false, errore: 'Codice non valido (in prova è 123456).' }; if (!x.nuova || x.nuova.length < 8) return { ok: false, errore: 'Almeno 8 caratteri.' }; d.adminPass = x.nuova; return { ok: true }; },
    stato: function (x, d) {
      if (d.sess !== 'admin') return { ok: false, scaduta: true };
      return { ok: true, cambiare: !d.adminPass, vetrina: d.vetrina || [], richieste: (d.richieste || []).slice().reverse(),
        destinatari: d.destinatari || [{ email: 'direzione@centrolefornaci.com', nome: 'Direzione Le Fornaci', negozio: true, temporary: true, banchetto: true }],
        accessi: negozi().sort(function (a, b) { return a.locale - b.locale; }).map(function (s) { var a = acc(d, s.locale); return { utente: s.locale, negozio: s.nome, email: ((d.locali || {})[s.locale] || {}).email_operatore || '', ultimo: a.ultimo || '', cambiare: !a.password, attivo: a.attivo, demo: a.password ? '' : codice(s.locale, a.giro) }; }) };
    },
    rigenera: function (x, d) { var a = acc(d, x.utente); a.giro++; delete a.password; var n = negozi().filter(function (s) { return s.locale === x.utente; })[0] || {}; return { ok: true, utente: x.utente, negozio: n.nome, password: codice(x.utente, a.giro) }; },
    attiva: function (x, d) { acc(d, x.utente).attivo = !!x.attivo; return { ok: true }; },
    salva_vetrina: function (x, d) { d.vetrina = x.vetrina; return { ok: true }; },
    salva_destinatari: function (x, d) { d.destinatari = x.destinatari; return { ok: true }; },
    stato_richiesta: function (x, d) { (d.richieste || []).forEach(function (r) { if (String(r.riga) === String(x.riga)) r.stato = x.stato; }); return { ok: true }; },
    richiesta: function (x, d) {
      if (x.sito_web) return { ok: true };
      d.richieste = d.richieste || [];
      d.richieste.push({ riga: d.richieste.length + 2, data: oggi(), stato: 'Nuova', tipo: { negozio: 'Negozio fisico', temporary: 'Temporary', banchetto: 'Banchetto' }[x.tipo] || x.tipo, nome: x.nome, azienda: x.azienda, telefono: x.telefono, email: x.email, dettaglio: x.dettaglio, messaggio: x.messaggio });
      return { ok: true, demo: true };
    },
    vetrina: function (x, d) {
      var t = new Date().toISOString().slice(0, 10);
      return { ok: true, vetrina: (d.vetrina || []).filter(function (v) { return (!v.dal || v.dal <= t) && (!v.al || v.al >= t); }).map(function (v) { return v.slug; }) };
    },
    scheda: function (x, d) {
      var sc = (d.schede || {})[x.locale] || null, o = (d.locali || {})[x.locale];
      if (o && (o.nuova || o.stato === 'libero')) return { ok: true, spostato: true };
      if (o && o.nome && o.stato !== 'libero') { sc = sc ? JSON.parse(JSON.stringify(sc)) : {}; sc.nome = o.nome; }
      return { ok: true, scheda: sc };
    },
    salva_locale: function (x, d) {
      if (d.sess !== 'admin') return { ok: false, scaduta: true };
      var v = x.dati; d.locali = d.locali || {}; d.schede = d.schede || {};
      var prima = d.locali[x.locale] || {};
      if (v.azzera) { delete d.schede[x.locale]; if (d.acc) delete d.acc[x.locale]; }
      d.locali[x.locale] = { stato: v.stato, nome: v.nome, categoria: v.categoria, apertura: v.apertura, email_operatore: v.stato === 'libero' ? '' : v.email_operatore, nuova: v.stato !== 'libero' && (v.azzera || prima.nuova || (prima.stato === 'libero') || !!v.da_libero) };
      if (v.stato === 'libero') { delete d.schede[x.locale]; if (d.acc) delete d.acc[x.locale]; }
      else { var sc = d.schede[x.locale] || {}; CAMPI.forEach(function (k) { sc[k] = v[k] || ''; }); sc.aggiornato = oggi() + ' (direzione)'; d.schede[x.locale] = sc; }
      return { ok: true };
    },
    bozza_accesso: function (x, d) {
      if (d.sess !== 'admin') return { ok: false, scaduta: true };
      var o = (d.locali || {})[x.locale] || {}; if (!o.email_operatore) return { ok: false, errore: 'Inserisci e salva prima l’email dell’operatore.' };
      var a = acc(d, x.locale); a.giro++; delete a.password; a.attivo = true;
      var pw = codice(x.locale, a.giro), base = location.href.split('/admin')[0] + '/';
      return { ok: true, a: o.email_operatore, oggetto: 'Le Fornaci – il tuo accesso per la scheda di ' + o.nome, testo:
        'Buongiorno,\n\nbenvenuti alle Fornaci! Da oggi potete aggiornare da soli la scheda di ' + o.nome + ' sul sito del centro: telefono, WhatsApp, orari, sito, Instagram e descrizione.\n\n' +
        'Indirizzo: ' + base + 'admin/\nUtente: ' + x.locale + '\nPassword: ' + pw + '\n\nAl primo accesso vi chiederemo di scegliere una password vostra.\nCopertina e foto del negozio le carica la direzione, così tutte le pagine restano uniformi.\n\nPer qualsiasi dubbio rispondete a questa email.\n\nLa direzione\nLe Fornaci Mega Shopping – Beinasco' };
    }
  };
  window.LF_DEMO = function (x) {
    var d = load(), f = R[x.azione], r = f ? f(x, d) : { ok: false, errore: 'Azione sconosciuta' };
    save(d); return new Promise(function (ok) { setTimeout(function () { ok(JSON.parse(JSON.stringify(r))); }, 250); });
  };
})();
