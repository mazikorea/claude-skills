"""레퍼런스 사진 묶음 → 필터 레시피(파라미터) 자동 추출.
방식: 사진별 자동 맞춤을 거친 '평범한 원본' 묶음에 레시피를 적용했을 때의 통계가
레퍼런스 통계와 같아지도록 파라미터를 탐색(무작위 + 좌표 탐색, numpy만 사용).
"""
import sys, glob, json, numpy as np
from PIL import Image
from tone import rgb2lab
import film2

KEYS = ['black', 'white', 'gamma', 'contrast', 'sat', 'green_sat', 'green_shift', 'skin_warm',
        'sh_a', 'sh_b', 'mid_a', 'mid_b', 'hi_a', 'hi_b']
BOUNDS = dict(black=(0, 12), white=(80, 100), gamma=(0.8, 1.25), contrast=(0.7, 1.25), sat=(0.65, 1.2),
              green_sat=(0.35, 1.3), green_shift=(-28, 8), skin_warm=(0.9, 1.25),
              sh_a=(-8, 8), sh_b=(-10, 10), mid_a=(-6, 6), mid_b=(-8, 10), hi_a=(-6, 6), hi_b=(-6, 9))
QS = [2, 10, 25, 50, 75, 90, 98]


def trim_border(im):
    """필름 스캔 흰/검 테두리 자르기."""
    a = np.asarray(im.convert('L'), np.float32)
    def edge(v):  # v: 행/열 평균·표준편차
        return (v[1] < 6) & ((v[0] > 225) | (v[0] < 25))
    rows = np.stack([a.mean(1), a.std(1)]); cols = np.stack([a.mean(0), a.std(0)])
    r = np.where(~edge(rows))[0]; c = np.where(~edge(cols))[0]
    if len(r) < 10 or len(c) < 10: return im
    m = 4
    return im.crop((c[0] + m, r[0] + m, c[-1] - m, r[-1] - m))


def load_small(p, size=220, trim=True):
    rgb, _ = film2.load_any(p)
    im = Image.fromarray((rgb * 255 + .5).astype(np.uint8))
    if trim: im = trim_border(im)
    im.thumbnail((size, size), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255


def stats(rgbs):
    lab = np.concatenate([rgb2lab(r).reshape(-1, 3) for r in rgbs])
    L, a, b = lab.T; C = np.hypot(a, b); hd = np.degrees(np.arctan2(b, a)) % 360
    s = {'Lq': np.percentile(L, QS)}
    neu = C < 20
    for k, (lo, hi) in dict(sh=(0, 35), mid=(35, 65), hi=(65, 101)).items():
        m = neu & (L >= lo) & (L < hi)
        s[k] = np.array([a[m].mean(), b[m].mean()]) if m.sum() > 200 else np.array([0., 0.])
    col = C > 8
    for k, rng in dict(green=(95, 165), skin=(35, 80), blue=(215, 300), red=(0, 35)).items():
        m = col & (hd >= rng[0]) & (hd < rng[1])
        s['C_' + k] = C[m].mean() if m.sum() > 200 else np.nan
    mg = col & (hd >= 95) & (hd < 165)
    s['h_green'] = hd[mg].mean() if mg.sum() > 200 else np.nan
    s['C_all'] = C.mean()
    return s


def loss(s, r):
    e = np.sum(((s['Lq'] - r['Lq']) / 3.0) ** 2)
    for k in ('sh', 'mid', 'hi'):
        e += np.sum(((s[k] - r[k]) / 1.2) ** 2)
    for k in ('C_green', 'C_skin', 'C_blue', 'C_red'):
        if not (np.isnan(s[k]) or np.isnan(r[k])): e += ((s[k] - r[k]) / 3.0) ** 2 * 0.25
    if not (np.isnan(s['h_green']) or np.isnan(r['h_green'])): e += ((s['h_green'] - r['h_green']) / 6) ** 2 * 0.3
    e += ((s['C_all'] - r['C_all']) / 1.5) ** 2
    return e


PRIOR = dict(sat=0.12, green_sat=0.25, green_shift=10, skin_warm=0.12, gamma=0.12, contrast=0.12, hi_b=5, hi_a=4, mid_a=4, mid_b=5, sh_a=4, sh_b=5)


def prior(p, start):
    return sum(((p[k] - start[k]) / v) ** 2 for k, v in PRIOR.items())


def apply_all(srcs, p):
    return [film2.film_arr(x, p) for x in srcs]


def fit(srcs, ref, start, iters=900, seed=0):
    rng = np.random.default_rng(seed)
    best = dict(start); be = loss(stats(apply_all(srcs, best)), ref) + prior(best, start)
    step = {k: (BOUNDS[k][1] - BOUNDS[k][0]) * 0.25 for k in KEYS}
    for it in range(iters):
        cand = dict(best)
        ks = rng.choice(KEYS, size=rng.integers(1, 4), replace=False)
        for k in ks:
            cand[k] = float(np.clip(cand[k] + rng.normal(0, step[k]), *BOUNDS[k]))
        if cand['white'] - cand['black'] < 70: continue
        e = loss(stats(apply_all(srcs, cand)), ref) + prior(cand, start)
        if e < be:
            best, be = cand, e
        if it % 150 == 149:
            for k in KEYS: step[k] *= 0.6
    return best, be


if __name__ == '__main__':
    out = sys.argv[1]; refs = sys.argv[2:]
    src_files = sorted(glob.glob('/Users/junsuneom/Downloads/에디토리얼톤_테스트/새이미지/2차_원본/*')) + \
                sorted(glob.glob('/Users/junsuneom/Downloads/에디토리얼톤_테스트/새이미지/원본/*'))
    srcs = [film2.normalize(load_small(f, 160, trim=False)) for f in src_files]
    ref = stats([load_small(f) for f in refs])
    start = dict(black=2.0, white=95.0, gamma=1.0, contrast=1.0, sat=1.0, green_sat=1.0, green_shift=0,
                 skin_warm=1.0, sh_a=0, sh_b=0, mid_a=0, mid_b=0, hi_a=0, hi_b=0)
    p, e = fit(srcs, ref, start)
    s = stats(apply_all(srcs, p))
    json.dump({'params': p, 'loss': e, 'ref_Lq': ref['Lq'].round(1).tolist(), 'got_Lq': s['Lq'].round(1).tolist(),
               'ref_tint': {k: ref[k].round(1).tolist() for k in ('sh', 'mid', 'hi')},
               'got_tint': {k: s[k].round(1).tolist() for k in ('sh', 'mid', 'hi')},
               'ref_C': {k: round(float(ref[k]), 1) for k in ('C_all', 'C_green', 'C_skin', 'C_blue', 'h_green')},
               'got_C': {k: round(float(s[k]), 1) for k in ('C_all', 'C_green', 'C_skin', 'C_blue', 'h_green')}},
              open(out, 'w'), ensure_ascii=False, indent=1)
    print(out, round(e, 2), {k: round(v, 2) for k, v in p.items()})
