/* Le Fornaci — piccole funzioni comuni a tutte le pagine. */
(function () {
  'use strict';
  // menu su telefono
  var btn = document.querySelector('[data-menu]'), drawer = document.querySelector('.drawer');
  if (btn && drawer) btn.addEventListener('click', function () {
    var open = drawer.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // "Aperto ora" in base all'orario della galleria (9:00–20:30)
  var now = new Date(), mins = now.getHours() * 60 + now.getMinutes(), open = mins >= 540 && mins < 1230;
  document.querySelectorAll('[data-open-now]').forEach(function (el) {
    el.textContent = open ? 'Aperto ora · fino alle 20:30' : 'Chiuso · apre alle 9:00';
    el.classList.toggle('closed', !open);
    if (!open) { el.style.background = '#F1EEEA'; el.style.color = '#5E584F'; }
  });
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  function day(s) { return new Date(s + 'T00:00:00'); }
  // eventi: in programma oppure ultimi passati
  document.querySelectorAll('[data-eventi]').forEach(function (wrap) {
    var items = [].slice.call(wrap.querySelectorAll('[data-al]'));
    var up = items.filter(function (el) { return day(el.getAttribute('data-al')) >= today; });
    var title = document.querySelector('[data-eventi-titolo]');
    if (!up.length) { if (title) title.textContent = 'Gli ultimi eventi'; return; }
    items.forEach(function (el) { if (day(el.getAttribute('data-al')) < today) el.hidden = true; });
    if (title) title.textContent = 'In programma';
  });
  var hero = document.querySelector('[data-hero-evento]');
  if (hero && window.LF_EVENTI) {
    var next = window.LF_EVENTI.filter(function (e) { return day(e.al) >= today; }).sort(function (a, b) { return a.dal < b.dal ? -1 : 1; })[0];
    if (next) {
      hero.querySelector('.tag').textContent = next.quando; hero.querySelector('.tag').classList.remove('grey');
      hero.querySelector('h2').textContent = next.titolo; hero.querySelector('p').textContent = next.testo;
      var cta = hero.querySelector('[data-hero-cta]'); if (cta) cta.hidden = true;
    }
  }
  // prossime aperture: visibili per 45 giorni dalla creazione della scheda
  document.querySelectorAll('[data-creato]').forEach(function (el) {
    var d = (today - day(el.getAttribute('data-creato'))) / 86400000;
    el.hidden = !(d >= 0 && d <= 45);
  });
  document.querySelectorAll('[data-aperture]').forEach(function (sec) { sec.hidden = !sec.querySelector('[data-creato]:not([hidden])'); });
  // vetrina: con meno di 4 sponsor, i posti liberi ruotano ogni giorno
  var v = document.querySelector('[data-vetrina]');
  function vetrina(sponsorSlugs) {
    var all = [].slice.call(v.querySelectorAll('[data-slug]')), spons = [];
    all.forEach(function (el) { el.hidden = true; var bd = el.querySelector('.badge'); if (bd) bd.textContent = 'Scelto per te'; });
    (sponsorSlugs || []).slice(0, 4).forEach(function (slug) {
      var el = all.filter(function (x) { return x.getAttribute('data-slug') === slug; })[0];
      if (el) { el.hidden = false; el.querySelector('.badge').textContent = 'In evidenza'; spons.push(el); }
    });
    var pool = all.filter(function (x) { return spons.indexOf(x) < 0 && x.getAttribute('data-logo') === '1'; }), seed = Math.floor(today / 86400000), shown = spons.slice();
    for (var i = 0; shown.length < 4 && pool.length; i++) { var k = (seed * 7 + i * 13) % pool.length; pool[k].hidden = false; shown.push(pool[k]); pool.splice(k, 1); }
    shown.forEach(function (el) { v.appendChild(el); });
  }
  if (v) {
    var fallback = [].slice.call(v.querySelectorAll('[data-sponsor]')).map(function (x) { return x.getAttribute('data-slug'); });
    vetrina(fallback);
    if (!window.LF_MOTORE && window.LF_DEMO) window.LF_DEMO({ azione: 'vetrina' }).then(function (r) { if (r.vetrina.length) vetrina(r.vetrina); });
    else if (window.LF_MOTORE && window.fetch) {
      var ctl = window.AbortController ? new AbortController() : null; if (ctl) setTimeout(function () { ctl.abort(); }, 4000);
      fetch(window.LF_MOTORE + '?azione=vetrina', ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); })
        .then(function (r) { if (r && r.ok && r.vetrina && r.vetrina.length) vetrina(r.vetrina); }).catch(function () {});
    }
  }
  // scheda aggiornata dal negozio (area riservata): sostituisce i dati della pagina
  var sc = document.querySelector('[data-locale]');
  if (sc && (window.LF_MOTORE ? window.fetch : window.LF_DEMO)) {
    (window.LF_MOTORE ? fetch(window.LF_MOTORE + '?azione=scheda&locale=' + encodeURIComponent(sc.getAttribute('data-locale'))).then(function (r) { return r.json(); }) : window.LF_DEMO({ azione: 'scheda', locale: sc.getAttribute('data-locale') })).then(function (r) {
      var d = r && r.ok && r.scheda; if (!d || d.pausa) return;
      function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
      if (d.descrizione) { var p = sc.querySelector('[data-f="descrizione"]'); if (p) { p.hidden = false; p.innerHTML = d.descrizione.split(/\n+/).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''); } }
      var info = sc.querySelector('[data-info]');
      function row(k, html) { if (!info) return; var r = info.querySelector('[data-row="' + k + '"]'); if (!r) { r = document.createElement('div'); r.setAttribute('data-row', k); r.innerHTML = '<dt>' + k + '</dt><dd></dd>'; info.appendChild(r); } r.querySelector('dd').innerHTML = html; }
      function tel(t) { var x = t.replace(/[^\d+]/g, ''); return x.charAt(0) === '+' ? x : '+39' + x; }
      if (d.orari) row('Orari', esc(d.orari));
      if (d.telefono) { row('Telefono', '<a href="tel:' + tel(d.telefono) + '">' + esc(d.telefono) + '</a>'); document.querySelectorAll('a[href^="tel:"]').forEach(function (a) { if (!a.closest('.foot')) a.href = 'tel:' + tel(d.telefono); }); }
      if (d.whatsapp) row('WhatsApp', '<a href="https://wa.me/' + tel(d.whatsapp).replace('+', '') + '">' + esc(d.whatsapp) + '</a>');
      if (d.email) row('Email', '<a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a>');
      if (d.sito) { var u = /^https?:/.test(d.sito) ? d.sito : 'https://' + d.sito; row('Sito', '<a href="' + esc(u) + '" rel="noopener">' + esc(d.sito.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a>'); }
      if (d.instagram) row('Instagram', '<a href="' + esc(d.instagram) + '" rel="noopener">Instagram</a>');
    }).catch(function () {});
  }
})();
