"""구조 모델: 검정 고정 톤곡선 + 색상대별 채도/색상각 + 명도대별 색 캐스트."""
import numpy as np
from tone import rgb2lab, lab2rgb
P0 = dict(g=0.8, kS=0.2, b0=0.0, W=0.92, sat=0.8, s_red=1.0, s_skin=1.0, s_yel=1.0, s_grn=1.0, s_blu=1.0,
          dh_skin=0.0, dh_yel=0.0, dh_grn=-15.0, sh_a=0.0, sh_b=0.0, md_a=0.0, md_b=0.0, hi_a=0.0, hi_b=0.0)
RANGE = dict(g=(0.5,1.2), kS=(-0.1,0.6), b0=(0,6), W=(0.86,0.98), sat=(0.4,1.2), s_red=(0.5,1.5), s_skin=(0.6,1.5), s_yel=(0.5,1.6),
             s_grn=(0.4,1.6), s_blu=(0.3,1.3), dh_skin=(-15,15), dh_yel=(-25,15), dh_grn=(-40,10),
             sh_a=(-5,5), sh_b=(-6,8), md_a=(-4,4), md_b=(-5,8), hi_a=(-4,4), hi_b=(-5,6))
def bump(hd, c, w): 
    d = np.abs((hd - c + 180) % 360 - 180); return np.clip(1 - d / w, 0, 1)
def apply(rgb, p):
    lab = rgb2lab(rgb); L, a, b = lab[...,0], lab[...,1], lab[...,2]
    x = np.clip(L, 0, 100) / 100; y = x ** p['g']
    y = y + p['kS'] * (y - .5) * (1 - np.abs(2*y - 1)) * 2
    y = np.clip(y, 0, 1); L2 = 100 * (p['b0']/100 + (p['W'] - p['b0']/100) * y)
    C = np.hypot(a, b); h = np.arctan2(b, a); hd = np.degrees(h) % 360
    wr = bump(hd, 20, 30); ws = bump(hd, 55, 28); wy = bump(hd, 92, 26); wg = bump(hd, 135, 45); wb = bump(hd, 260, 60)
    sc = p['sat'] * (1 + wr*(p['s_red']-1) + ws*(p['s_skin']-1) + wy*(p['s_yel']-1) + wg*(p['s_grn']-1) + wb*(p['s_blu']-1))
    h = h + np.radians(p['dh_skin']*ws + p['dh_yel']*wy + p['dh_grn']*wg)
    C = C * np.clip(sc, 0.05, None)
    a, b = C*np.cos(h), C*np.sin(h)
    sh = np.clip(1 - L2/35, 0, 1); hi = np.clip((L2 - 60)/30, 0, 1); md = np.clip(1 - sh - hi, 0, 1)
    a = a + p['sh_a']*sh + p['md_a']*md + p['hi_a']*hi; b = b + p['sh_b']*sh + p['md_b']*md + p['hi_b']*hi
    return lab2rgb(np.stack([L2, a, b], -1))
