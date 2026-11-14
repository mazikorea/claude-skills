"""구조 모델: 검정 고정 톤곡선 + 색상대별 채도/색상각 + 명도대별 색 캐스트."""
import numpy as np
from tone import rgb2lab, lab2rgb
P0 = dict(kn=0.6, ks=1.0, tk=55.0, g=0.8, kS=0.2, b0=0.0, W=0.92, sat=0.8, s_red=1.0, s_skin=1.0, s_yel=1.0, s_grn=1.0, s_blu=1.0,
          dh_skin=0.0, dh_yel=0.0, dh_grn=-15.0, sh_a=0.0, sh_b=0.0, md_a=0.0, md_b=0.0, hi_a=0.0, hi_b=0.0)
RANGE = dict(kn=(0.35,0.8), ks=(0.3,1.0), tk=(38,75), g=(0.6,1.2), kS=(-0.1,0.6), b0=(0,6), W=(0.86,0.98), sat=(0.4,1.2), s_red=(0.5,1.5), s_skin=(0.6,1.5), s_yel=(0.5,1.6),
             s_grn=(0.4,1.6), s_blu=(0.3,1.3), dh_skin=(-15,15), dh_yel=(-25,15), dh_grn=(-40,10),
             sh_a=(-5,5), sh_b=(-6,8), md_a=(-4,4), md_b=(-5,8), hi_a=(-4,4), hi_b=(-5,6))
def bump(hd, c, w): 
    d = np.abs((hd - c + 180) % 360 - 180); return np.clip(1 - d / w, 0, 1)
def skin_L(rgb, mask):
    lab = rgb2lab(rgb); L, a, b = lab[...,0], lab[...,1], lab[...,2]; C = np.hypot(a, b); h = np.degrees(np.arctan2(b, a)) % 360
    sk = mask & (C > 6) & (C < 45) & (h > 25) & (h < 80) & (L > 25) & (L < 92)
    return float(np.median(L[sk])) if sk.sum() > 150 else None
def apply(rgb, p, sL=None):
    lab = rgb2lab(rgb); L, a, b = lab[...,0], lab[...,1], lab[...,2]
    x = np.clip(L, 0, 100) / 100
    if sL: x = x ** (np.log(p['tk']/100) / np.log(sL/100))   # 사진별 노출 정규화: 피부 밝기를 tk로
    y = x ** p['g']
    y = y + p['kS'] * (y - .5) * (1 - np.abs(2*y - 1)) * 2
    y = np.clip(y, 0, 1); y = np.where(y > p['kn'], p['kn'] + (y - p['kn']) * p['ks'], y)
    L2 = 100 * (p['b0']/100 + (p['W'] - p['b0']/100) * y)
    C = np.hypot(a, b); h = np.arctan2(b, a); hd = np.degrees(h) % 360
    wr = bump(hd, 20, 30); ws = bump(hd, 55, 28); wy = bump(hd, 92, 26); wg = bump(hd, 135, 45); wb = bump(hd, 260, 60)
    sc = p['sat'] * (1 + wr*(p['s_red']-1) + ws*(p['s_skin']-1) + wy*(p['s_yel']-1) + wg*(p['s_grn']-1) + wb*(p['s_blu']-1))
    h = h + np.radians(p['dh_skin']*ws + p['dh_yel']*wy + p['dh_grn']*wg)
    C = C * np.clip(sc, 0.05, None)
    a, b = C*np.cos(h), C*np.sin(h)
    sh = np.clip(1 - L2/35, 0, 1); hi = np.clip((L2 - 60)/30, 0, 1); md = np.clip(1 - sh - hi, 0, 1)
    a = a + p['sh_a']*sh + p['md_a']*md + p['hi_a']*hi; b = b + p['sh_b']*sh + p['md_b']*md + p['hi_b']*hi
    out = np.clip(lab2rgb(np.stack([L2, a, b], -1)), 0, 1)
    return finish(out, p)

def finish(out, p):
    """필름 질감: 중간 스케일 대비 완화(lc) + 입자(gr). 파라미터 없으면 무동작."""
    lc = p.get('lc', 0.0); gr = p.get('gr', 0.0)
    if not lc and not gr: return out
    h, w = out.shape[:2]
    if lc:
        sg = max(w, h) / 120.0
        low = np.stack([gaussian_filter(out[..., i], sg) for i in range(3)], -1)
        out = low + (out - low) * (1 - lc)
    if gr:
        r = np.random.RandomState(7)
        sg = max(max(w, h) / 2600.0, 0.5)
        n = gaussian_filter(r.randn(h, w).astype('f4'), sg); n = n / (n.std() + 1e-6)
        lum = out.mean(2, keepdims=True)
        amp = gr * (0.35 + 0.65 * 4 * lum * (1 - lum))
        out = out + n[..., None] * amp
    return np.clip(out, 0, 1)

def _g1(a, sg, ax):
    r = max(1, int(3 * sg + .5)); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sg) ** 2); k /= k.sum()
    pad = [(0, 0)] * a.ndim; pad[ax] = (r, r); ap = np.pad(a, pad, mode='reflect'); n = a.shape[ax]; out = 0
    for i, w in enumerate(k):
        sl = [slice(None)] * a.ndim; sl[ax] = slice(i, i + n); out = out + w * ap[tuple(sl)]
    return out
def gaussian_filter(a, sg):
    from PIL import Image
    a = a.astype('f4'); h, w = a.shape
    if sg > 4:
        f = int(sg / 2); sm = np.asarray(Image.fromarray(a, 'F').resize((max(1, w // f), max(1, h // f)), Image.BILINEAR))
        sm = _g1(_g1(sm, sg / f, 0), sg / f, 1)
        return np.asarray(Image.fromarray(sm.astype('f4'), 'F').resize((w, h), Image.BICUBIC))
    return _g1(_g1(a, sg, 0), sg, 1)
