"""레퍼런스 톤 → 원본 사진 톤 이식 (픽셀 생성 없음, 색·밝기 곡선만 변경)."""
import sys, glob, json, numpy as np
from PIL import Image

def srgb2lin(c): return np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
def lin2srgb(c): return np.where(c <= 0.0031308, c*12.92, 1.055*np.clip(c,0,None)**(1/2.4)-0.055)
M = np.array([[0.4124,0.3576,0.1805],[0.2126,0.7152,0.0722],[0.0193,0.1192,0.9505]],np.float32)
Mi = np.linalg.inv(M).astype(np.float32); WP = np.array([0.95047,1.0,1.08883],np.float32)
def f(t): return np.where(t>0.008856, np.cbrt(t), 7.787*t+16/116)
def fi(t): return np.where(t>0.2069, t**3, (t-16/116)/7.787)
def rgb2lab(rgb):
    xyz = srgb2lin(rgb) @ M.T / WP; fx,fy,fz = f(xyz[...,0]),f(xyz[...,1]),f(xyz[...,2])
    return np.stack([116*fy-16, 500*(fx-fy), 200*(fy-fz)],-1).astype(np.float32)
def lab2rgb(lab):
    fy=(lab[...,0]+16)/116; fx=fy+lab[...,1]/500; fz=fy-lab[...,2]/200
    xyz=np.stack([fi(fx),fi(fy),fi(fz)],-1)*WP
    return np.clip(lin2srgb(xyz @ Mi.T),0,1).astype(np.float32)

def load(p, size=None):
    im = Image.open(p);
    if size: im.draft('RGB',(size,size))
    im = im.convert('RGB')
    if size: im.thumbnail((size,size))
    return np.asarray(im, np.float32)/255

ZONES = [(0,35),(35,70),(70,101)]
def zone_w(L):
    # 부드러운 그림자/중간/밝은 영역 가중치
    s = np.clip(1-(L-15)/30,0,1)**1; h = np.clip((L-55)/30,0,1)**1; m = np.clip(1-s-h,0,1)
    return [s,m,h]

def stats(labs):
    L = np.concatenate([l[...,0].ravel() for l in labs])
    A = np.concatenate([l[...,1].ravel() for l in labs]); B = np.concatenate([l[...,2].ravel() for l in labs])
    W = zone_w(L); C = np.hypot(A,B)
    z = [dict(a=float((w*A).sum()/w.sum()), b=float((w*B).sum()/w.sum())) for w in W]
    return dict(Lq=np.percentile(L, np.linspace(0,100,101)).tolist(), zones=z, chroma=float(np.mean(C)))

def build_curve(src_q, ref_q, strength):
    xs = np.linspace(0,100,1001)
    mapped = np.interp(np.interp(xs, src_q, np.linspace(0,100,101)), np.linspace(0,100,101), ref_q)
    # 곡선 매끄럽게 + 강도 혼합
    k = np.ones(41)/41; mp = np.convolve(np.pad(mapped,20,mode='edge'),k,'valid')
    return xs, xs + strength*(mp-xs)

def grade(src_path, ref, out_path, strength=0.8, grain=0.012):
    small = rgb2lab(load(src_path, 800)); s = stats([small])
    xs, curve = build_curve(np.array(s['Lq']), np.array(ref['Lq']), strength)
    rgb = load(src_path); lab = rgb2lab(rgb)
    L0 = lab[...,0]
    # 곡선 모양만 가져오고 전체 밝기(중앙값)는 원본 유지 → 과다 노출 방지
    curve = curve - (np.interp(s['Lq'][50], xs, curve) - s['Lq'][50])
    # 그림자 보호: 어두운 영역은 원본 밝기의 92% 아래로 내려가지 않게 (제품 디테일 유지)
    sh = np.clip(1-(xs-10)/35, 0, 1)
    curve = np.maximum(curve, xs*(1-0.08*sh) * sh + curve*(1-sh))
    L1 = np.clip(np.interp(L0, xs, curve), 0, 100).astype(np.float32)
    W = zone_w(L1)
    a, b = lab[...,1], lab[...,2]
    C = np.hypot(a, b)
    cs = np.clip(ref['chroma']/max(s['chroma'],1e-3), 0.8, 1.1); cs = 1+strength*(cs-1)
    # 초록 계열만 살짝 눌러 필름 느낌 (제품 색 계열은 그대로)
    hue = np.degrees(np.arctan2(b, a)) % 360
    green = np.clip(1-np.abs(hue-135)/45, 0, 1)
    k = cs*(1-0.25*strength*green)
    a = a*k; b = b*k
    # 채도 높은 픽셀(제품 색)은 색 틀기에서 보호, 무채색(벽·피부 밝은 부분)에만 톤을 입힘
    protect = np.clip(1-C/25, 0, 1)
    for w, zs, zr in zip(W, s['zones'], ref['zones']):
        a = a + 0.6*strength*w*protect*(zr['a']-zs['a']); b = b + 0.6*strength*w*protect*(zr['b']-zs['b'])
    out = lab2rgb(np.stack([L1,a,b],-1))
    if grain:
        rng = np.random.default_rng(7); g = rng.normal(0,grain,out.shape[:2]).astype(np.float32)
        out = np.clip(out + g[...,None]*(0.6+0.4*(1-np.abs(out*2-1))),0,1)
    exif = Image.open(src_path).info.get('exif')
    Image.fromarray((out*255+0.5).astype(np.uint8)).save(out_path, quality=95, subsampling=0, **({'exif':exif} if exif else {}))

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'analyze':
        refs = sorted(glob.glob(sys.argv[2]+'/*.jpg')); labs=[rgb2lab(load(p,600)) for p in refs]
        json.dump(stats(labs), open(sys.argv[3],'w'))
    elif cmd == 'apply':
        ref = json.load(open(sys.argv[2])); grade(sys.argv[3], ref, sys.argv[4], float(sys.argv[5]) if len(sys.argv)>5 else 0.8)
