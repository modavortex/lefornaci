#!/usr/bin/env python3
"""Genera il sito Le Fornaci a partire dai file in data/.
Uso:  python3 build.py
Tutte le pagine sono HTML statico: nessun database, nessun plugin, niente che si rompe."""
import json, os, html, re, datetime

ANTEPRIMA = True  # True finché il sito vive su GitHub Pages: dice a Google di non indicizzarlo
SITO = 'https://centrolefornaci.com'
OGGI = datetime.date.today()

R = os.path.dirname(os.path.abspath(__file__))
def load(p): return json.load(open(os.path.join(R, p), encoding='utf-8'))
C = load('data/centro.json'); N = load('data/negozi.json'); M = load('data/mappa.json')
CATS = N['categorie']; CAT = {c['id']: c for c in CATS}
MAP = {l['n']: l for l in M['locali']}
# Contorni ridisegnati con /strumenti/traccia/ (data/tracciati.json) hanno la precedenza
TR = os.path.join(R, 'data/tracciati.json')
if os.path.exists(TR):
    import numpy as np, cv2
    def _fit(poly, ratio):
        x0 = min(p[0] for p in poly); y0 = min(p[1] for p in poly)
        m = np.zeros((int(max(p[1] for p in poly) - y0) + 12, int(max(p[0] for p in poly) - x0) + 12), np.uint8)
        cv2.fillPoly(m, [np.array([[p[0] - x0 + 6, p[1] - y0 + 6] for p in poly], np.int32)], 255)
        m = cv2.erode(m, np.ones((5, 5), np.uint8)) > 0
        ii = np.pad(m.astype(np.int32).cumsum(0).cumsum(1), ((1, 0), (1, 0))); ys, xs = np.nonzero(m)
        if not len(xs): return None
        lo, hi, best = 4, max(m.shape), None
        while lo <= hi:
            w = (lo + hi) // 2; h = max(2, int(round(w / ratio)))
            if h >= m.shape[0] or w >= m.shape[1]: hi = w - 1; continue
            ss = ii[h:, w:] - ii[:-h, w:] - ii[h:, :-w] + ii[:-h, :-w]; ok = np.argwhere(ss == w * h)
            if len(ok):
                d = (ok[:, 0] + h / 2 - ys.mean()) ** 2 + (ok[:, 1] + w / 2 - xs.mean()) ** 2; yy, xx = ok[np.argmin(d)]
                best = [round(float(xx + w / 2 + x0 - 6), 1), round(float(yy + h / 2 + y0 - 6), 1), int(w), int(h)]; lo = w + 1
            else: hi = w - 1
        return best
    for t in json.load(open(TR, encoding='utf-8'))['locali']:
        if not t['contorni'] or not t['contorni'][0]: continue
        main = max(t['contorni'], key=len)
        MAP[t['n']] = {'n': t['n'], 'piano': t['piano'], 'contorni': t['contorni'], 'logo_o': _fit(main, 2.0), 'logo_v': _fit(main, 0.5)}
LOC = []
for l in N['locali']:
    g = MAP.get(l['locale'])
    if not g: continue
    LOC.append(dict(l, contorni=g['contorni'], logo_o=g.get('logo_o'), logo_v=g.get('logo_v')))
SHOPS = sorted([l for l in LOC if l.get('nome')], key=lambda x: x['nome'].lower())
LIBERI = [l for l in LOC if l['stato'] == 'libero']
PIANO = {k: v['nome'] for k, v in M['piani'].items()}
e = lambda s: html.escape(str(s or ''), quote=True)

def write(path, text):
    full = os.path.join(R, path); os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(text)

# ---------- icone (SVG a tratto) ----------
I = {
 'tel': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
 'wa': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>',
 'pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
 'web': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
 'ig': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
 'home': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
 'map': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
 'cal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 'menu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
}

def logo_style(i):
    return 'background-position:%.3f%% %.3f%%' % ((i % 8) / 7 * 100, (i // 8) / 8 * 100)
def logo_or_mono(s, cls=''):
    if s.get('logo') is not None:
        return '<span class="logo %s" style="%s" role="img" aria-label="Logo %s"></span>' % (cls, logo_style(s['logo']), e(s['nome']))
    words = re.sub(r'[^A-Za-zÀ-ÿ0-9 ]', ' ', s['nome']).split()
    mono = 'DAMICO' if s['locale'] == '40' else ((words[0][0] + words[1][0]) if len(words) > 1 else words[0][:2]).upper()
    return '<span class="monogram %s %s" aria-hidden="true">%s</span>' % (cls, 'dark' if s['locale'] == '40' else '', e(mono))

def page(rel, title, desc, body, current='', extra_head='', scripts='', body_class='has-tabbar', canonical=''):
    nav = [('', 'Home', 'home'), ('negozi/', 'Negozi e mappa', 'negozi'), ('eventi/', 'Eventi', 'eventi'), ('apri-un-negozio/', 'Apri un negozio', 'apri')]
    navhtml = ''.join('<a href="%s%s"%s>%s</a>' % (rel, u, ' aria-current="page"' if k == current else '', t) for u, t, k in nav)
    tabs = [('', 'Home', 'home', I['home']), ('negozi/', 'Negozi', 'negozi', I['map']), ('eventi/', 'Eventi', 'eventi', I['cal']), ('#arrivare', 'Arrivare', 'arrivare', I['pin'])]
    tabhtml = ''.join('<a href="%s%s"%s>%s%s</a>' % ('' if u.startswith('#') else rel, u if not u.startswith('#') else (rel + u if current != 'home' else u), ' aria-current="page"' if k == current else '', ic, t) for u, t, k, ic in tabs)
    robots = '<meta name="robots" content="noindex">' if ANTEPRIMA else '<meta name="robots" content="index,follow">'
    canon = '<link rel="canonical" href="%s/%s">' % (SITO, canonical) if canonical is not None else ''
    return '''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
%(robots)s
%(canon)s
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="%(rel)sassets/img/logo-lefornaci.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Instrument+Sans:wght@400..700&display=swap">
<link rel="stylesheet" href="%(rel)sassets/css/site.css">
%(extra)s
</head>
<body class="%(bc)s">
<header class="top">
 <div class="wrap">
  <a class="brand" href="%(rel)s" aria-label="Le Fornaci, home"><img src="%(rel)sassets/img/logo-lefornaci.png" alt="Le Fornaci Mega Shopping" width="72" height="50"></a>
  <nav class="nav" aria-label="Menu principale">%(nav)s</nav>
  <span class="spacer"></span>
  <span class="open-now" data-open-now>Galleria 9:00–20:30</span>
  <button class="menu-btn" type="button" data-menu aria-expanded="false" aria-label="Menu">%(menu)s</button>
 </div>
 <nav class="drawer" aria-label="Menu">%(nav)s<a href="%(rel)saccesso-operatori/">Accesso operatori</a></nav>
</header>
<main>
%(body)s
</main>
%(foot)s
<nav class="tabbar" aria-label="Navigazione rapida">%(tabs)s</nav>
<script src="%(rel)sassets/js/site.js" defer></script>
%(scripts)s
</body>
</html>
''' % dict(title=e(title), desc=e(desc), robots=robots, canon=canon, rel=rel, extra=extra_head, bc=body_class, nav=navhtml, menu=I['menu'], body=body, foot=footer(rel), tabs=tabhtml, scripts=scripts)

def footer(rel):
    orari = ''.join('<li>%s: %s</li>' % (e(o['cosa']), e(o['quando'])) for o in C['orari'])
    return '''<footer class="foot" id="footer">
 <div class="wrap">
  <div>
   <span class="chip"><img src="%(rel)sassets/img/logo-lefornaci.png" alt="Le Fornaci Mega Shopping" width="66" height="46"></span>
   <p>%(ind)s<br>Tel. <a href="tel:+390113971809">%(tel)s</a> · <a href="mailto:%(mail)s">%(mail)s</a></p>
   <form action="mailto:%(mail)s" method="post" enctype="text/plain">
    <label class="sr" for="nl">La tua email</label>
    <input id="nl" type="email" name="email" placeholder="La tua email" required>
    <button class="btn btn-primary" type="submit">Iscriviti</button>
   </form>
   <p class="muted" style="color:#BDB5AA;font-size:13px;margin-top:6px">Newsletter: -10%% sul primo acquisto.</p>
  </div>
  <div><h3>Orari</h3><ul>%(orari)s</ul></div>
  <div><h3>Visita</h3><ul><li><a href="%(rel)snegozi/">Negozi e mappa</a></li><li><a href="%(rel)seventi/">Eventi</a></li><li><a href="%(ig)s">Instagram</a></li><li><a href="%(fb)s">Facebook</a></li></ul></div>
  <div><h3>Business</h3><ul><li><a href="%(rel)sapri-un-negozio/">Apri un negozio</a></li><li><a href="%(rel)sapri-un-negozio/#temporary">Spazi temporary</a></li><li><a href="%(rel)saccesso-operatori/">Accesso operatori</a></li></ul></div>
 </div>
 <div class="bottom"><div class="wrap">
  <span style="display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap">© %(anno)s Le Fornaci Mega Shopping Center · Centro gestito da <span class="chip" style="padding:5px 9px"><img src="%(rel)sassets/img/logo-svicom.png" alt="Svicom Real Estate Managers" width="70" height="22" style="height:22px;width:auto"></span></span>
  <span>Creato con <span class="heart" aria-label="amore">&#9829;</span> da <a href="https://damicoshop.com">DamicoShop</a></span>
 </div></div>
</footer>''' % dict(rel=rel, ind=e(C['indirizzo']), tel=e(C['telefono']), mail=e(C['email']), orari=orari, ig=C['instagram'], fb=C['facebook'], anno=OGGI.year)

# ---------- mini mappa statica (vista dall'alto) ----------
def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; return min(xs), min(ys), max(xs), max(ys)
def minimap(piano, hl=None, fill='#ECE6DC', hl_fill='#B4472B', bg='#FFFFFF', stroke='#FFFFFF', pad=8):
    slab = M['piani'][piano]['sagoma']; x0, y0, x1, y1 = bbox(slab)
    for l in LOC:
        if l['piano'] == piano:
            for p in l['contorni']:
                a, b, c, d = bbox(p); x0, y0, x1, y1 = min(x0, a), min(y0, b), max(x1, c), max(y1, d)
    out = ['<svg viewBox="%d %d %d %d" role="img" aria-label="Posizione sulla mappa">' % (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)]
    out.append('<path d="M%sZ" fill="%s"/>' % ('L'.join('%d %d' % tuple(p) for p in slab), bg))
    hl_shape = ''
    for l in LOC:
        if l['piano'] != piano: continue
        for p in l['contorni']:
            d = 'M%sZ' % 'L'.join('%d %d' % tuple(q) for q in p)
            if hl and l['locale'] == hl: hl_shape += '<path d="%s" fill="%s"/>' % (d, hl_fill)
            else: out.append('<path d="%s" fill="%s" stroke="%s" stroke-width="1"/>' % (d, fill, stroke))
    out.append(hl_shape); out.append('</svg>')
    return ''.join(out)

# ---------- dati per la mappa interattiva ----------
def dati_js():
    loc = [{k: l.get(k) for k in ('locale', 'piano', 'stato', 'nome', 'slug', 'categoria', 'logo', 'contorni', 'logo_o', 'logo_v')} for l in LOC]
    d = {'categorie': CATS, 'piani': M['piani'], 'aree': M.get('aree', {}), 'servizi': M['servizi'], 'ingressi': M['ingressi'], 'locali': loc}
    write('assets/js/dati.js', '/* Generato da build.py: non modificare a mano. */\nwindow.LF=' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')

# ---------- HOME ----------
def home():
    ev = C['eventi']
    hero = '''<a class="event-hero" href="eventi/" data-hero-evento>
  <span class="tag grey">Prossimamente</span>
  <h2>Il programma di Natale sta arrivando</h2>
  <p>Iscriviti alla newsletter e ti avvisiamo appena escono le date.</p>
  <span class="btn btn-light" data-hero-cta style="align-self:flex-start">Avvisami</span>
 </a>'''
    past = sorted(ev, key=lambda x: x['dal'], reverse=True)[:2]
    minis = ''.join('<a class="mini-event" href="eventi/"><small>%s · com’è andata</small><b>%s</b></a>' % (e(x['quando'].split(' · ')[0]), e(x['titolo'])) for x in past)
    arrivi = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (e(x['come'].replace('In ', '').capitalize()), e(x['testo'])) for x in C['come_arrivare'])
    orari = '<div><dt>Orari</dt><dd>%s</dd></div>' % ' · '.join('%s %s' % (o['cosa'].replace('Galleria negozi', 'Galleria'), o['quando'].replace('Tutti i giorni ', '')) for o in C['orari'])
    sponsor = [s for s in SHOPS if s.get('in_evidenza')][:4]
    pool = [s for s in SHOPS if s.get('logo') is not None and not s.get('in_evidenza')]
    tints = ['#E6DED3', '#DDE3E0', '#E5DEE8', '#E8E2D2']
    def card(s, i, attr, badge):
        return '<a class="shop-card" href="negozi/%s/" %s><div class="cover" style="background:%s"><span class="badge">%s</span>%s</div><div class="body"><small>%s · Locale %s</small><b>%s</b></div></a>' % (
            s['slug'], attr, tints[i % 4], badge, logo_or_mono(s), e(CAT[s['categoria']]['nome']), e(s['locale']), e(s['nome']))
    vetrina = ''.join(card(s, i, 'data-sponsor', 'In evidenza') for i, s in enumerate(sponsor))
    vetrina += ''.join(card(s, i, 'data-rotazione' + (' hidden' if i >= 4 - len(sponsor) else ''), 'Scelto per te') for i, s in enumerate(pool))
    nuovi = [s for s in SHOPS if s['stato'] == 'nuova_apertura' and s.get('creato_il')]
    aperture = ''.join('<a class="card opening" href="negozi/%s/" data-creato="%s"><span class="mark monogram dark" style="font-size:16px">%s</span><span><small class="muted" style="font-weight:700;color:var(--accent)">Apre a %s</small><br><b style="font-family:var(--f-display);font-size:22px">%s</b><br><span class="muted">%s · Locale %s</span></span></a>' % (
        s['slug'], s['creato_il'], 'DAMICO' if s['locale'] == '40' else e(s['nome'][:2].upper()), e(s.get('apertura', '').lower()), e(s['nome']), e(CAT[s['categoria']]['nome']), e(s['locale'])) for s in nuovi)
    cta_map = minimap('T', fill='#FFFFFF', bg='#E9967F', stroke='#B4472B', hl=None)
    body = '''
<div class="wrap">
 <div class="hero-grid">
  <section aria-labelledby="ev-t">
   <div class="section-head"><h1 id="ev-t" style="font-size:clamp(26px,4vw,34px)">Eventi in programma</h1><a href="eventi/">Tutti</a></div>
   %(hero)s
   <div class="mini-events">%(minis)s</div>
  </section>
  <section id="arrivare" aria-labelledby="ar-t">
   <div class="section-head"><h2 id="ar-t">Come raggiungerci</h2></div>
   <div class="card visit">
    <b style="font-size:17px">%(ind)s</b>
    <dl>%(arrivi)s%(orari)s</dl>
    <div class="actions"><a class="btn btn-dark" href="%(gm)s">Maps</a><a class="btn" href="%(wz)s">Waze</a><a class="btn" href="tel:+390113971809">Chiama</a></div>
   </div>
  </section>
 </div>

 <section class="section">
  <a class="cta-map" href="negozi/">
   <div><h2>Scopri i negozi</h2><p style="margin:10px 0 16px">%(n)d negozi su due piani. Esplora la mappa 3D e trova subito quello che cerchi.</p><span class="btn btn-light">Apri la mappa</span></div>
   <div style="perspective:900px"><div style="transform:rotateX(48deg) rotateZ(-12deg);transform-origin:50%% 60%%">%(cta)s</div></div>
  </a>
 </section>

 <section class="section" aria-labelledby="vt-t">
  <div class="section-head"><h2 id="vt-t">In vetrina</h2><span class="muted" style="font-size:13px">Spazi in evidenza</span></div>
  <div class="scroller" data-vetrina>%(vetrina)s</div>
 </section>

 <section class="section" data-aperture aria-labelledby="ap-t">
  <div class="section-head"><h2 id="ap-t">Prossime aperture</h2></div>
  <div class="grid grid-2">%(aperture)s</div>
 </section>
</div>''' % dict(hero=hero, minis=minis, ind=e(C['indirizzo']), arrivi=arrivi, orari=orari, gm=C['mappe']['google'], wz=C['mappe']['waze'], n=len(SHOPS), cta=cta_map, vetrina=vetrina, aperture=aperture)
    ld = {'@context': 'https://schema.org', '@type': 'ShoppingCenter', 'name': C['nome'], 'url': SITO,
          'telephone': '+39 011 397 1809', 'address': {'@type': 'PostalAddress', 'streetAddress': 'Strada Torino 34/36', 'postalCode': '10092', 'addressLocality': 'Beinasco', 'addressRegion': 'TO', 'addressCountry': 'IT'},
          'openingHours': 'Mo-Su 09:00-20:30'}
    head = '<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False)
    scripts = '<script>window.LF_EVENTI=%s;</script>' % json.dumps(ev, ensure_ascii=False)
    write('index.html', page('', 'Le Fornaci Mega Shopping – Beinasco (Torino)', 'Centro commerciale Le Fornaci a Beinasco: %d negozi, Ipercoop, The Space Cinema, eventi e mappa 3D dei negozi.' % len(SHOPS), body, 'home', head, scripts, canonical=''))

# ---------- MAPPA + ELENCO ----------
def negozi_index():
    chips = '<button class="chip" type="button" data-cat="tutti" data-col="#17140F">Tutti</button>' + ''.join(
        '<button class="chip" type="button" data-cat="%s" data-col="%s" data-ink="%s"><i style="background:%s"></i>%s</button>' % (c['id'], c['colore'], c['testo'], c['colore'], e(c['nome'])) for c in CATS) + \
        '<button class="chip" type="button" data-cat="liberi" data-col="#B4472B"><i style="border:1.5px dashed #B4472B;background:#fff"></i>Locali disponibili</button>'
    groups = ''
    for c in CATS:
        items = [s for s in SHOPS if s['categoria'] == c['id']]
        if not items: continue
        rows = ''.join('<a class="shop-row" href="%s/" data-shop="%s" data-c="%s" data-name="%s" data-st="%s">%s<span><b>%s</b><small>Locale %s · %s</small></span></a>' % (
            s['slug'], e(s['locale']), s['categoria'], e(s['nome']), s['stato'], logo_or_mono(s), e(s['nome']), e(s['locale']), e(PIANO[s['piano']])) for s in items)
        groups += '<div class="list-group" data-group><h3><i style="background:%s"></i>%s <em>%d</em></h3><div class="shop-list">%s</div></div>' % (c['colore'], e(c['nome']), len(items), rows)
    liberi = ''.join('<a class="shop-row" href="../apri-un-negozio/?locale=%s" data-shop="%s" data-c="" data-name="" data-st="libero"><span class="monogram" style="width:64px;height:32px;font-size:12px;background:#fff;border:1.5px dashed #B4472B;border-radius:8px">%s</span><span><b>Prossimamente</b><small>%s</small></span></a>' % (
        e(l['locale']), e(l['locale']), e(l['locale']), 'Su due piani' if l['locale'] == '7' else 'Locale libero') for l in LIBERI)
    groups += '<div class="list-group" data-group><h3><i style="border:1.5px dashed #B4472B"></i>Locali disponibili <em>%d</em></h3><div class="shop-list">%s</div></div>' % (len(LIBERI), liberi)
    body = '''
<div class="wrap map-intro">
 <div class="row"><h1>Negozi e mappa</h1><label class="sr" for="cerca">Cerca un negozio o un numero di locale</label><input class="search" id="cerca" type="search" placeholder="Cerca negozio o n. locale…" data-search autocomplete="off"></div>
 <div class="chips" role="group" aria-label="Filtra per settore">%(chips)s</div>
</div>
<div class="wrap" style="padding:0">
 <div class="mapbox" data-mappa data-root="../">
  <svg class="stage" role="img" aria-label="Mappa 3D del centro commerciale"></svg>
  <div class="pop" hidden></div>
  <div class="map-ui map-floors" role="group" aria-label="Piano"><button type="button" data-piano="T" aria-pressed="true">Piano terra</button><button type="button" data-piano="P" aria-pressed="false">Piano primo</button></div>
  <div class="map-ui map-tools">
   <button type="button" data-z="+" aria-label="Ingrandisci">+</button>
   <button type="button" data-z="-" aria-label="Riduci">−</button>
   <button type="button" data-rot aria-label="Ruota"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg></button>
   <button type="button" data-tilt aria-label="Vista dall’alto">2D</button>
   <button type="button" data-reset aria-label="Centra la mappa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></button>
  </div>
  <div class="map-hint"><span>Trascina per spostare · rotellina o due dita per lo zoom · tasto destro o due dita per girare</span></div>
 </div>
</div>
<div class="wrap">
 <div class="legend"><span><i>WC</i>Bagni e fasciatoio</span><span><i>€</i>Bancomat</span><span><i>&#8597;</i>Ascensori e scale mobili</span><span><i style="background:#17140F;border-radius:6px;width:auto;padding:0 6px">IN</i>Ingressi</span></div>
 <div class="section-head" style="margin-top:28px"><h2>Elenco negozi</h2><span class="muted" data-total></span></div>
 %(groups)s
</div>''' % dict(chips=chips, groups=groups)
    scripts = '<script src="../assets/js/dati.js" defer></script><script src="../assets/js/mappa.js" defer></script>'
    write('negozi/index.html', page('../', 'Negozi e mappa – Le Fornaci Beinasco', 'Tutti i %d negozi del centro commerciale Le Fornaci di Beinasco con la mappa 3D interattiva: trova subito il negozio che cerchi.' % len(SHOPS), body, 'negozi', '', scripts, canonical='negozi/'))

# ---------- PAGINA NEGOZIO ----------
def norm_url(u):
    u = (u or '').strip()
    if u and not u.startswith('http'): u = 'https://' + u
    return u
def tel_link(t):
    first = re.split(r'\s+-\s+|/(?=\d{6,})', t)[0]
    d = re.sub(r'[^\d+]', '', first)
    if d and not d.startswith('+'): d = '+39' + d
    return d
def shop_page(s):
    rel = '../../'; cat = CAT[s['categoria']]
    nuovo = s['stato'] == 'nuova_apertura'
    pills = '<span class="pill %s">%s</span><span class="pill">Locale %s · %s</span><span class="pill" style="background:%s;color:%s;border:0">%s</span>' % (
        'pill-new' if nuovo else 'pill-ok', ('Apre a ' + s.get('apertura', 'breve').lower()) if nuovo else 'Aperto', e(s['locale']), e(PIANO[s['piano']]), cat['colore'], cat['testo'], e(cat['nome']))
    acts, sticky = [], []
    if s.get('telefono'):
        acts.append('<a class="btn btn-primary" href="tel:%s">%sChiama</a>' % (tel_link(s['telefono']), I['tel'])); sticky.append(acts[-1])
    if s.get('whatsapp'):
        w = re.sub(r'\D', '', s['whatsapp']); w = w if w.startswith('39') else '39' + w
        acts.append('<a class="btn %s" href="https://wa.me/%s">%sWhatsApp</a>' % ('btn-primary' if not acts else '', w, I['wa'])); sticky.append(acts[-1])
    mapa = '<a class="btn %s" href="../?locale=%s">%sTrovalo sulla mappa</a>' % ('btn-primary' if not acts else '', e(s['locale']), I['pin'])
    acts.append(mapa); sticky.append(mapa.replace('Trovalo sulla mappa', 'Portami lì'))
    if s.get('sito'): acts.append('<a class="btn" href="%s" rel="noopener">%sSito web</a>' % (e(norm_url(s['sito'])), I['web']))
    if s.get('instagram'): acts.append('<a class="btn" href="%s" rel="noopener">%sInstagram</a>' % (e(s['instagram']), I['ig']))
    rows = [('Orari', s.get('orari') or 'Tutti i giorni 9:00–20:30'), ('Posizione', '%s · locale %s' % (PIANO[s['piano']], s['locale']))]
    if s.get('telefono'): rows.append(('Telefono', '<a href="tel:%s">%s</a>' % (tel_link(s['telefono']), e(s['telefono']))))
    if s.get('whatsapp'): rows.append(('WhatsApp', e(s['whatsapp'])))
    if s.get('email'): rows.append(('Email', '<a href="mailto:%s">%s</a>' % (e(s['email']), e(s['email']))))
    if s.get('sito'): rows.append(('Sito', '<a href="%s" rel="noopener">%s</a>' % (e(norm_url(s['sito'])), e(re.sub(r'^https?://(www\.)?', '', norm_url(s['sito'])).rstrip('/')))))
    info = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (k, v if k in ('Telefono', 'Email', 'Sito') else e(v)) for k, v in rows)
    paras = ''.join('<p>%s</p>' % e(p) for p in (s.get('descrizione') or '').split('\n') if p.strip())
    photos = ''
    if s.get('foto'):
        photos = '<section class="section"><h2 style="font-size:22px;margin-bottom:12px">Il negozio</h2><div class="scroller">%s</div></section>' % ''.join('<img src="%s" alt="%s" loading="lazy" style="border-radius:16px;aspect-ratio:4/3;object-fit:cover">' % (e(f), e(s['nome'])) for f in s['foto'])
    same = [x for x in SHOPS if x['categoria'] == s['categoria'] and x['slug'] != s['slug']][:8]
    related = ''.join('<a href="../%s/">%s%s</a>' % (x['slug'], logo_or_mono(x), e(x['nome'])) for x in same)
    shop_logo = logo_or_mono(s)
    if s.get('logo') is not None: head_logo = '<div class="shop-logo logo-chip">%s</div>' % shop_logo
    else: head_logo = shop_logo.replace('class="monogram ', 'class="shop-logo monogram ')
    body = '''
<div class="wrap">
 <nav class="crumbs" aria-label="Percorso"><a href="%(rel)s">Home</a> / <a href="../">Negozi</a> / %(cat)s</nav>
 <div class="shop-head">
  %(logo)s
  <div><div class="pills">%(pills)s</div><h1>%(name)s</h1></div>
 </div>
 <div class="shop-actions">%(acts)s</div>
 <div class="shop-body">
  <div class="grid">
   %(prose)s
   %(photos)s
  </div>
  <div class="grid">
   <dl class="card info">%(info)s</dl>
   <a class="card where" href="../?locale=%(loc)s">%(mini)s<span><b>Dove si trova:</b> %(piano)s, locale %(loc)s · <b style="color:var(--accent)">Apri la mappa</b></span></a>
  </div>
 </div>
 <section class="section"><div class="section-head"><h2 style="font-size:22px">Nello stesso settore</h2><a href="../">Tutti i negozi</a></div><div class="related">%(related)s</div></section>
 <a class="owner-hint" href="%(rel)saccesso-operatori/">Sei il titolare di %(name)s? Aggiorna orari, contatti, foto e promozioni. <b style="color:var(--accent)">Accesso operatori →</b></a>
</div>
<div class="sticky-actions">%(sticky)s</div>''' % dict(rel=rel, cat=e(cat['nome']), logo=head_logo, pills=pills, name=e(s['nome']), acts=''.join(acts),
        prose=('<div class="card prose">%s</div>' % paras) if paras else '', photos=photos, info=info, loc=e(s['locale']), piano=e(PIANO[s['piano']]),
        mini=minimap(s['piano'], s['locale']), related=related, sticky=''.join(sticky[:2]))
    ld = {'@context': 'https://schema.org', '@type': 'Store', 'name': s['nome'], 'url': '%s/negozi/%s/' % (SITO, s['slug']),
          'description': (s.get('descrizione') or '').split('\n')[0][:300],
          'address': {'@type': 'PostalAddress', 'streetAddress': 'Strada Torino 34/36 – Centro commerciale Le Fornaci, locale ' + s['locale'], 'postalCode': '10092', 'addressLocality': 'Beinasco', 'addressRegion': 'TO', 'addressCountry': 'IT'},
          'containedInPlace': {'@type': 'ShoppingCenter', 'name': C['nome'], 'url': SITO}}
    if s.get('telefono'): ld['telephone'] = s['telefono']
    head = '<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False)
    first = re.split(r'(?<=[.!?])\s', (s.get('descrizione') or '').replace('\n', ' '))[0]
    desc = ('%s al centro commerciale Le Fornaci di Beinasco, locale %s. %s' % (s['nome'], s['locale'], first))[:158]
    write('negozi/%s/index.html' % s['slug'], page(rel, '%s – Le Fornaci Beinasco' % s['nome'], desc, body, 'negozi', head, '', 'has-tabbar has-sticky', canonical='negozi/%s/' % s['slug']))

# ---------- EVENTI ----------
def eventi():
    mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
    rows = ''
    for x in sorted(C['eventi'], key=lambda x: x['dal'], reverse=True):
        d = datetime.date.fromisoformat(x['dal'])
        rows += '<article class="ev" data-al="%s"><div class="date"><b>%d</b><small>%s</small></div><div><span class="pill">%s</span> <span class="muted" style="font-size:14px">%s</span><h3>%s</h3><p>%s</p></div></article>' % (
            x['al'], d.day, mesi[d.month - 1], e(x['tipo']), e(x['quando']), e(x['titolo']), e(x['testo']))
    body = '''<div class="wrap" style="padding-top:24px">
 <h1>Eventi</h1>
 <div class="event-hero" style="margin-top:18px;min-height:220px"><span class="tag grey">Prossimamente</span><h2>Il programma di Natale sta arrivando</h2><p>Iscriviti alla newsletter in fondo alla pagina e ti avvisiamo appena escono le date.</p></div>
 <section class="section"><h2 data-eventi-titolo style="margin-bottom:6px">Gli ultimi eventi</h2><div data-eventi>%s</div></section>
</div>''' % rows
    write('eventi/index.html', page('../', 'Eventi – Le Fornaci Beinasco', 'Eventi, animazione per bambini, corse e iniziative al centro commerciale Le Fornaci di Beinasco.', body, 'eventi', canonical='eventi/'))

# ---------- APRI UN NEGOZIO ----------
def apri():
    opts = ''.join('<option value="%s">Locale %s%s</option>' % (e(l['locale']), e(l['locale']), ' · su due piani' if l['locale'] == '7' else '') for l in LIBERI)
    cards = ''.join('<a class="card" href="../negozi/?locale=%s" style="padding:12px;text-decoration:none;display:grid;gap:10px">%s<b>Locale %s</b><span class="muted" style="font-size:14px">%s · %s</span></a>' % (
        e(l['locale']), minimap(l['piano'], l['locale']), e(l['locale']), e(PIANO[l['piano']]), 'Su due piani' if l['locale'] == '7' else 'Disponibile') for l in LIBERI)
    body = '''<div class="wrap" style="padding-top:24px">
 <h1>Apri il tuo negozio alle Fornaci</h1>
 <p class="muted" style="max-width:640px;font-size:17px;margin:12px 0 0">Oltre 4.000 posti auto, Ipercoop, The Space Cinema e %(n)d negozi già aperti. Scegli un locale libero o uno spazio temporary in galleria: ti ricontattiamo entro un giorno lavorativo.</p>
 <section class="section"><div class="section-head"><h2>Locali disponibili</h2><span class="muted">%(nl)d spazi</span></div><div class="grid grid-4">%(cards)s</div></section>
 <section class="section" id="temporary"><h2>Spazi temporary</h2><p class="muted" style="max-width:640px">Postazioni in galleria per periodi brevi: lanci di prodotto, stagionalità, eventi. Indica il periodo che ti interessa.</p></section>
 <section class="section"><h2 style="margin-bottom:14px">Richiedi informazioni</h2>
  <form class="card form" action="mailto:%(mail)s?subject=Richiesta%%20locale%%20Le%%20Fornaci" method="post" enctype="text/plain" style="max-width:640px">
   <label>Nome e cognome<input name="nome" required autocomplete="name"></label>
   <label>Azienda / insegna<input name="insegna"></label>
   <label>Telefono<input name="telefono" type="tel" required autocomplete="tel"></label>
   <label>Email<input name="email" type="email" required autocomplete="email"></label>
   <label>Cosa ti interessa<select name="spazio" data-locale-select><option value="">Scegli…</option>%(opts)s<option value="temporary">Spazio temporary</option></select></label>
   <label>Messaggio<textarea name="messaggio" rows="4" placeholder="Settore, metri quadri desiderati, periodo…"></textarea></label>
   <button class="btn btn-primary" type="submit">Invia la richiesta</button>
   <p class="muted" style="font-size:13px;margin:0">Nell’anteprima il modulo apre la tua app di posta. Sul sito ufficiale invierà direttamente alla direzione.</p>
  </form>
 </section>
</div>
<script>(function(){var l=new URLSearchParams(location.search).get('locale'),s=document.querySelector('[data-locale-select]');if(l&&s)s.value=l;})();</script>''' % dict(n=len(SHOPS), nl=len(LIBERI), cards=cards, mail=e(C['email']), opts=opts)
    write('apri-un-negozio/index.html', page('../', 'Apri un negozio – Le Fornaci Beinasco', 'Locali liberi e spazi temporary al centro commerciale Le Fornaci di Beinasco: richiedi informazioni.', body, 'apri', canonical='apri-un-negozio/'))

# ---------- ACCESSO OPERATORI (anteprima) ----------
def operatori():
    body = '''<div class="wrap" style="padding-top:24px;max-width:640px">
 <h1>Accesso operatori</h1>
 <p class="muted" style="font-size:17px">Ogni negozio riceve un codice alla firma del contratto. Con il codice aggiorni da solo orari, contatti, descrizione e fino a 10 contenuti (promo, novità, eventi).</p>
 <div class="note" style="margin:18px 0">Anteprima: l’area operatori si attiva con la versione sul sito ufficiale del centro. Qui il modulo non salva nulla.</div>
 <form class="card form" onsubmit="event.preventDefault();this.querySelector('[data-msg]').hidden=false">
  <label>Codice negozio<input name="codice" inputmode="numeric" autocomplete="one-time-code" placeholder="Es. 40-XXXX" required></label>
  <button class="btn btn-dark" type="submit">Entra</button>
  <p data-msg hidden class="muted" style="margin:0">Nell’anteprima l’accesso non è attivo.</p>
 </form>
 <h2 style="font-size:22px;margin-top:32px">Cosa può fare ogni negozio</h2>
 <ul style="line-height:1.8;color:var(--ink-2)"><li>Mettere la scheda in pausa mentre aggiorna i dati, e riattivarla con un tocco</li><li>Aggiornare telefono, WhatsApp, email, sito, social e orari</li><li>Pubblicare fino a 10 contenuti con data di scadenza</li><li>Le 3 foto del negozio e la copertina le carica il centro, per avere tutte le pagine uniformi</li></ul>
</div>'''
    write('accesso-operatori/index.html', page('../', 'Accesso operatori – Le Fornaci', 'Area riservata ai negozi del centro commerciale Le Fornaci.', body, '', canonical='accesso-operatori/'))

def extra():
    write('404.html', page('/lefornaci/' if ANTEPRIMA else '/', 'Pagina non trovata – Le Fornaci', 'Pagina non trovata.', '<div class="wrap" style="padding:48px 16px"><h1>Pagina non trovata</h1><p class="muted">Forse il negozio ha cambiato indirizzo.</p><a class="btn btn-primary" href="negozi/">Vai a negozi e mappa</a></div>', canonical=None))
    urls = [''] + ['negozi/', 'eventi/', 'apri-un-negozio/'] + ['negozi/%s/' % s['slug'] for s in SHOPS]
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % ''.join('<url><loc>%s/%s</loc></url>\n' % (SITO, u) for u in urls))
    write('robots.txt', ('User-agent: *\nDisallow: /\n' if ANTEPRIMA else 'User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % SITO))
    write('.nojekyll', '')
    redir = ['| Vecchio indirizzo | Nuovo indirizzo |', '|---|---|'] + ['| %s | /negozi/%s/ |' % (s['vecchio_indirizzo'], s['slug']) for s in SHOPS if s.get('vecchio_indirizzo') and s['vecchio_indirizzo'] != '/negozi/%s/' % s['slug']]
    write('docs/REINDIRIZZAMENTI.md', '# Reindirizzamenti 301 da impostare sul sito ufficiale\n\nQuando il nuovo sito va online, questi vecchi indirizzi vanno reindirizzati (301) ai nuovi, per non perdere le visite che arrivano da Google.\n\n' + '\n'.join(redir) + '\n')

if __name__ == '__main__':
    dati_js(); home(); negozi_index()
    for s in SHOPS: shop_page(s)
    eventi(); apri(); operatori(); extra()
    print('Fatto: %d negozi, %d locali liberi.' % (len(SHOPS), len(LIBERI)))
