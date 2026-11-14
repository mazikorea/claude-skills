"""기준점 방식 필터 생성: 통과 레퍼런스의 피부(인물 마스크 안)·밝은 무채색·그림자 무채색 색 + 약한 밝기 분포만 맞춤."""
import json, glob, os, subprocess, tempfile, numpy as np
from PIL import Image
from tone import rgb2lab
import film2, fit, refgate, retune as R

def mask_for(path, size):
    t = tempfile.mktemp(suffix='.png'); subprocess.run([refgate.SEG, path, t], capture_output=True, timeout=60)
    m = Image.open(t).convert('L'); os.remove(t)
    m = m.resize(size, Image.BILINEAR); return np.asarray(m, np.float32) / 255 > .5

def anchor(rgbs, masks):
    out = {k: [] for k in ('skin', 'hi', 'sh', 'L')}
    for rgb, m in zip(rgbs, masks):
        lab = rgb2lab(rgb); L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]; C = np.hypot(a, b); h = np.degrees(np.arctan2(b, a)) % 360
        sk = m & (C > 6) & (C < 45) & (h > 25) & (h < 80) & (L > 30) & (L < 88)
        if sk.sum() > 150: out['skin'].append([a[sk].mean(), b[sk].mean(), C[sk].mean(), L[sk].mean()])
        hi = (~m) & (C < 15) & (L > 65); sh = (C < 15) & (L < 30)
        if hi.sum() > 150: out['hi'].append([a[hi].mean(), b[hi].mean()])
        if sh.sum() > 150: out['sh'].append([a[sh].mean(), b[sh].mean()])
        out['L'].append(np.percentile(L, [5, 50, 95]))
    return {k: np.median(np.array(v), 0) if v else None for k, v in out.items()}

def loss(s, r):
    e = 0
    if s['skin'] is not None and r['skin'] is not None:
        d = s['skin'] - r['skin']; e += (d[0]/1.5)**2 + (d[1]/1.5)**2 + (d[2]/2)**2 + (d[3]/6)**2
    for k, sc in (('hi', 1.2), ('sh', 1.5)):
        if s[k] is not None and r[k] is not None: e += np.sum(((s[k]-r[k])/sc)**2)
    e += np.sum(((s['L']-r['L'])/10)**2)   # 밝기는 약하게(장면 차이 큼)
    return float(e)

def build(ref_files, srcs, src_masks, start, iters=800, seed=2):
    refs, rm = [], []
    for f in ref_files:
        x = fit.load_small(f, 300, trim=True); refs.append(x); rm.append(mask_for(f, (x.shape[1], x.shape[0])))
    r = anchor(refs, rm)
    rng = np.random.default_rng(seed); S = R.SAFE
    pri = lambda p: sum(((p[k]-start[k])/((S[k][1]-S[k][0])*.5))**2 for k in S)
    f = lambda p: loss(anchor([film2.film_arr(x, p) for x in srcs], src_masks), r) + pri(p)
    best = dict(start); be = f(best); step = {k: (v[1]-v[0])*.2 for k, v in S.items()}
    for it in range(iters):
        c = dict(best)
        for k in rng.choice(list(S), rng.integers(1, 4), replace=False): c[k] = float(np.clip(c[k]+rng.normal(0, step[k]), *S[k]))
        if c['white']-c['black'] < 82: continue
        e = f(c)
        if e < be: best, be = c, e
        if it % 160 == 159: step = {k: v*.6 for k, v in step.items()}
    got = anchor([film2.film_arr(x, best) for x in srcs], src_masks); org = anchor(srcs, src_masks)
    rep = {k: dict(레퍼런스=np.round(r[k],1).tolist() if r[k] is not None else None,
                   원본=np.round(org[k],1).tolist() if org[k] is not None else None,
                   결과=np.round(got[k],1).tolist() if got[k] is not None else None) for k in r}
    rep['오차_원본'] = round(loss(org, r), 1); rep['오차_결과'] = round(loss(got, r), 1)
    return best, rep

if __name__ == '__main__':
    srcs = [film2.normalize(fit.load_small(R.LD+n+'.jpg', 300, trim=False)) for n in R.LON]
    sm = [mask_for(R.LD+n+'.jpg', (x.shape[1], x.shape[0])) for n, x in zip(R.LON, srcs)]
    base = dict(json.load(open('filters_v4.json'))['MAZI 01 Brick']); base['gamma'] = 1.0
    out, reps = {}, {}
    for name, d in [('MAZI 01 Brick', 'ref'), ('MAZI 02 Pampa', 'ref2/apc')]:
        g = refgate.judge(sorted(glob.glob(d + '/*')))
        files = [os.path.join(d, r['file']) for r in g['장별'] if r['사용']]
        out[name], reps[name] = build(files, srcs, sm, base)
        print(name, len(files), json.dumps(reps[name], ensure_ascii=False), flush=True)
    json.dump(out, open('filters_v7.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(reps, open('anchor_v7.json', 'w'), ensure_ascii=False, indent=1)
    for k, v in out.items(): print(k, {a: round(b, 2) for a, b in v.items()})
