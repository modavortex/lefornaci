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
  if (v) {
    var spons = [].slice.call(v.querySelectorAll('[data-sponsor]')), pool = [].slice.call(v.querySelectorAll('[data-rotazione]'));
    var free = Math.max(0, 4 - spons.length), seed = Math.floor(today / 86400000);
    pool.forEach(function (el) { el.hidden = true; });
    for (var i = 0; i < free && pool.length; i++) { var k = (seed * 7 + i * 13) % pool.length; pool[k].hidden = false; v.appendChild(pool[k]); pool.splice(k, 1); }
  }
})();
