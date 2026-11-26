/* App Le Fornaci: installazione sul telefono (Android/Chrome e iPhone) e funzionamento offline. */
(function () {
  'use strict';
  var me = document.currentScript, base = me ? me.src.replace(/assets\/js\/pwa\.js.*$/, '') : '/';
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(function () {}); });
  }
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var evento = null;
  if (standalone) document.documentElement.classList.add('in-app');
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); evento = e; });
  window.addEventListener('appinstalled', function () { evento = null; document.querySelectorAll('[data-app-banner]').forEach(function (b) { b.hidden = true; }); });
  document.querySelectorAll('[data-app-banner]').forEach(function (b) { if (standalone) b.hidden = true; });

  function guida() {
    var ov = document.createElement('div'); ov.className = 'qr-full'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Installa l’app');
    var passi = ios
      ? '<li>Tocca <b>Condividi</b> <span class="ios-share" aria-hidden="true">⬆︎</span> nella barra di Safari</li><li>Scorri e scegli <b>Aggiungi alla schermata Home</b></li><li>Tocca <b>Aggiungi</b>: l’icona Le Fornaci compare tra le tue app</li>'
      : '<li>Apri il menu del browser <b>⋮</b> in alto a destra</li><li>Scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b></li><li>Conferma: l’icona Le Fornaci compare tra le tue app</li>';
    ov.innerHTML = '<div class="qr-box guida"><img src="' + base + 'assets/img/app/icon-192.png" alt="" width="72" height="72"><b>Installa l’app Le Fornaci</b><span class="muted">Tessera, punti e gift card sempre con te, anche senza connessione.</span><ol>' + passi + '</ol><button class="btn btn-dark" type="button">Ho capito</button></div>';
    ov.addEventListener('click', function (ev) { if (ev.target === ov || ev.target.tagName === 'BUTTON') ov.remove(); });
    document.body.appendChild(ov);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-installa]'); if (!b) return;
    e.preventDefault();
    if (standalone) return;
    if (evento) { evento.prompt(); evento.userChoice.finally(function () { evento = null; }); }
    else guida();
  });
})();
