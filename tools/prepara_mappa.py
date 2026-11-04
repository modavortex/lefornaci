"""Ricava i contorni dei locali dalla planimetria illustrata (tools/planimetria.png).
Uso interno: genera data/locali.json. Dopo una revisione con lo strumento di tracciamento
(strumenti/traccia) non serve più rilanciarlo."""
import cv2, numpy as np, json, csv, re, unicodedata, sys
SP = sys.argv[1]  # cartella con comp.npy / res.json / scraped.tsv / build_unita2.py
comp = np.load(SP + '/comp.npy'); res = json.load(open(SP + '/res.json'))
src = open(SP + '/build_unita2.py', encoding='utf-8').read(); ns = {}
exec(src[src.index('CAT = {'):src.index("sc = {}")], ns)
T, P, alias = ns['T'], ns['P'], ns['alias']
FIRST = {r[0] for r in P}
units = {}
for num, name, cat, st, c, x, y, w, h in res:
    units.setdefault(num, set()).add(c)
def fit(mask, ratio):
    """Rettangolo più grande con proporzione ratio (larghezza/altezza) interamente dentro mask."""
    m = cv2.erode(mask, np.ones((5, 5), np.uint8)) > 0
    ii = np.pad(m.astype(np.int32).cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    ys, xs = np.nonzero(m)
    if len(xs) == 0: return None
    lo, hi, best = 4, max(xs.max() - xs.min(), ys.max() - ys.min()) + 2, None
    while lo <= hi:
        w = (lo + hi) // 2; h = max(2, int(round(w / ratio)))
        H, W = m.shape
        if h >= H or w >= W: hi = w - 1; continue
        s = ii[h:, w:] - ii[:-h, w:] - ii[h:, :-w] + ii[:-h, :-w]
        ok = np.argwhere(s == w * h)
        if len(ok):
            cy, cx = ys.mean(), xs.mean()
            d = (ok[:, 0] + h / 2 - cy) ** 2 + (ok[:, 1] + w / 2 - cx) ** 2
            y0, x0 = ok[np.argmin(d)]
            best = [round(float(x0 + w / 2), 1), round(float(y0 + h / 2), 1), int(w), int(h)]; lo = w + 1
        else: hi = w - 1
    return best
out = []
for num, comps in units.items():
    m = np.isin(comp, list(comps)).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=1)
    if num == '74': m[:] = 0; m[840:898, 323:405] = 255
    if num == '75': m[:] = 0; m[840:898, 430:510] = 255
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polys, best_area, main = [], 0, None
    for c in cs:
        a = cv2.contourArea(c)
        if a < 60: continue
        p = cv2.approxPolyDP(c, 1.1, True).reshape(-1, 2).tolist()
        polys.append(p)
        if a > best_area: best_area, main = a, len(polys) - 1
    mm = np.zeros_like(m); cv2.fillPoly(mm, [np.array(polys[main], np.int32)], 255)
    out.append({'n': num, 'piano': 'P' if num in FIRST else 'T', 'contorni': polys,
                'logo_o': fit(mm, 2.0), 'logo_v': fit(mm, 0.5)})
# sagoma del piano terra
um = np.zeros(comp.shape, np.uint8)
for u in out:
    if u['piano'] == 'T' and u['n'] not in ('74', '75'):
        for p in u['contorni']: cv2.fillPoly(um, [np.array(p, np.int32)], 255)
um = cv2.morphologyEx(um, cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
cs, _ = cv2.findContours(um, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
slabT = cv2.approxPolyDP(max(cs, key=cv2.contourArea), 3, True).reshape(-1, 2).tolist()
slabP = [[827, 755], [990, 755], [990, 852], [982, 852], [982, 983], [930, 1030], [905, 1030], [905, 1018], [828, 1018], [828, 925], [835, 910], [835, 873], [868, 873], [868, 853], [827, 853]]
mappa = {
  'nota': 'Coordinate in pixel della planimetria tools/planimetria.png. Modificabili con /strumenti/traccia/.',
  'piani': {'T': {'nome': 'Piano terra', 'sagoma': slabT}, 'P': {'nome': 'Piano primo', 'sagoma': slabP}},
  'aree': {'P': [{'nome': 'Terrazzo', 'contorno': [[827, 755], [905, 755], [905, 853], [827, 853]]}, {'nome': 'Uffici', 'contorno': [[942, 755], [990, 755], [990, 852], [942, 852]]}, {'nome': 'WC', 'contorno': [[905, 852], [982, 852], [982, 983], [905, 983]]}]},
  'servizi': {'T': [['wc', 93, 645], ['disabili', 112, 645], ['wc', 612, 340], ['disabili', 637, 340], ['fasciatoio', 663, 340], ['wc', 842, 512], ['disabili', 867, 512], ['fasciatoio', 890, 512], ['bancomat', 765, 313], ['ascensore', 850, 430], ['scale', 790, 448], ['telefono', 360, 467]],
              'P': [['wc', 933, 935], ['disabili', 958, 935], ['ascensore', 938, 1010], ['amazon', 895, 847]]},
  'ingressi': {'T': [[233, 205], [522, 235], [818, 235], [268, 826]], 'P': []},
  'locali': out}
json.dump(mappa, open('data/mappa.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'locali')
