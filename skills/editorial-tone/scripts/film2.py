"""film v2: 입력 통일(JPEG/PNG/HEIC/RAW) → 사진별 흰색 기준·밝기 자동 맞춤 → 필름 톤(film.py 레시피).
픽셀 생성 없음. 색·밝기 곡선만 변경.
사용: python3 -W ignore film2.py <src> <dst> [preview_size]
"""
import sys, io, os, numpy as np
from PIL import Image, ImageOps, ImageCms
from tone import rgb2lab, lab2rgb, srgb2lin, lin2srgb
import film as F

SRGB = F.SRGB; SRGB_BYTES = F.SRGB_BYTES
RAW_EXT = {'.dng', '.raf', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.pef', '.srw'}

N = dict(wb_strength=0.75, wb_gain_lim=(0.85, 1.18),   # 흰색 기준: 최대 75%만 보정, 채널 배율 제한
         ev_target=50.0, ev_strength=0.6)               # 밝기: 중앙 밝기 L50 쪽으로 60% (밝게 최대 +0.6, 어둡게 최대 -0.4스톱)


def load_any(src):
    """어떤 파일이든 → (sRGB float 0~1 배열, exif bytes|None)."""
    ext = os.path.splitext(src)[1].lower()
    if ext in RAW_EXT:
        import rawpy
        with rawpy.imread(src) as r:
            # 카메라 기록 흰색 기준으로 현상, 밝기 자동 끔(뒤에서 직접 맞춤), 16비트 sRGB
            a = r.postprocess(use_camera_wb=True, no_auto_bright=True, output_bps=16,
                              output_color=rawpy.ColorSpace.sRGB, gamma=(2.4, 12.92))
        return a.astype(np.float32) / 65535, None
    im = Image.open(src)
    ex = im.getexif(); icc = im.info.get('icc_profile')
    im = ImageOps.exif_transpose(im)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    im = im.convert('RGB')
    if 274 in ex: ex[274] = 1
    exif = ex.tobytes() if len(ex) else None
    if icc:
        p = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        if 'sRGB' not in (ImageCms.getProfileDescription(p) or ''):
            im = ImageCms.profileToProfile(im, p, SRGB, renderingIntent=1, outputMode='RGB')
    return np.asarray(im, np.float32) / 255, exif


def normalize(rgb, n=N, info=None):
    """사진별 흰색 기준·밝기 자동 맞춤 (선형광 공간에서 채널 배율만 곱함 → 디테일 손실 없음)."""
    small = rgb[::max(1, rgb.shape[0] // 500), ::max(1, rgb.shape[1] // 500)]
    lin_s = srgb2lin(small); lab = rgb2lab(small)
    L, C = lab[..., 0], np.hypot(lab[..., 1], lab[..., 2])
    # 1) 흰색 기준: 거의 무채색(C<18) + 중간~밝은(L 35~92) 픽셀 = 벽·흰 옷·회색 바닥 후보
    m = (C < 18) & (L > 35) & (L < 92)
    if m.mean() < 0.02:                       # 후보가 너무 적으면 밝은 영역 상위 5%로 대체
        m = L > np.percentile(L, 95)
    mean = lin_s[m].mean(0)
    gains = mean.mean() / np.maximum(mean, 1e-4)
    s = n['wb_strength'] * min(1.0, m.mean() / 0.25)   # 무채색 근거가 적으면 약하게
    if gains[2] > gains[0]: s *= 0.6                    # 차갑게 만드는 보정은 더 약하게(따뜻한 빛은 필름 톤에 유리)
    gains = 1 + s * (gains - 1)
    gains = np.clip(gains, *n['wb_gain_lim'])
    gains = gains / (gains @ np.array([0.2126, 0.7152, 0.0722]))   # 밝기는 유지
    # 2) 밝기: 중앙 밝기를 목표 쪽으로. 단 밝힐 때는 이미 밝은 곳(상위 2%)이 L92를 넘지 않는 선까지만
    lin_wb = lin_s * gains
    Lw = rgb2lab(np.clip(lin2srgb(lin_wb), 0, 1))[..., 0]
    Lmed = np.median(Lw); Lhi = np.percentile(Lw, 98)
    Yf = lambda L: ((L + 16) / 116) ** 3
    ev = np.log2(Yf(n['ev_target']) / Yf(Lmed)) * n['ev_strength']
    if ev > 0:
        ev = min(ev, 0.6, max(0.0, np.log2(Yf(92) / Yf(Lhi))))   # 어두운 무드 사진 보호
    else:
        ev = max(ev, -0.4)          # 밝은 실내 사진의 얼굴 탁해짐 방지
    if info is not None:
        info.update(gains=gains.round(3).tolist(), ev=round(float(ev), 2), Lmed=round(float(Lmed), 1),
                    neutral_frac=round(float(m.mean()), 2))
    lin = srgb2lin(rgb) * gains * (2 ** ev)
    # 밝기 올릴 때 하이라이트가 잘리지 않게 부드럽게 눌러줌(1.0 근처 롤오프)
    k = 0.85; over = np.clip(lin - k, 0, None)
    lin = np.where(lin > k, k + (1 - k) * (1 - np.exp(-over / (1 - k))), lin)
    return np.clip(lin2srgb(lin), 0, 1).astype(np.float32)


def film_arr(rgb, p=F.P):
    """film.py 레시피를 배열에 그대로 적용."""
    lab = rgb2lab(rgb); L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    g = p.get('gamma', 1.0)                      # 중간 밝기 조절(1=그대로)
    L2 = F.tone_curve(100 * (np.clip(L, 0, 100) / 100) ** g, p) if g != 1.0 else F.tone_curve(L, p)
    C = np.hypot(a, b); h = np.arctan2(b, a); hd = np.degrees(h) % 360
    g = np.clip(1 - np.abs(hd - 130) / 50, 0, 1)
    skin = np.clip(1 - np.abs(hd - 60) / 25, 0, 1)
    blue = np.clip(1 - np.abs(hd - 260) / 50, 0, 1)
    h = h + np.radians(p['green_shift']) * g
    C = C * p['sat'] * (1 - (1 - p['green_sat'] / p['sat']) * g) * (1 + (p['skin_warm'] - 1) * skin) * (1 + 0.05 * blue)
    a, b = C * np.cos(h), C * np.sin(h)
    sh = np.clip(1 - (L2 - 10) / 40, 0, 1); hi = np.clip((L2 - 55) / 35, 0, 1); md = np.clip(1 - sh - hi, 0, 1)
    a = a + p['sh_a'] * sh + p['hi_a'] * hi + p['mid_a'] * md
    b = b + p['sh_b'] * sh + p['hi_b'] * hi + p['mid_b'] * md
    return lab2rgb(np.stack([L2, a, b], -1))


def process(src, dst, size=None, auto=True, info=None):
    rgb, exif = load_any(src)
    if size:
        im = Image.fromarray((rgb * 255 + .5).astype(np.uint8)); im.thumbnail((size, size))
        rgb = np.asarray(im, np.float32) / 255
    if auto: rgb = normalize(rgb, info=info)
    out = film_arr(rgb)
    kw = {'icc_profile': SRGB_BYTES}
    if exif and not size: kw['exif'] = exif
    Image.fromarray((out * 255 + .5).astype(np.uint8)).save(dst, quality=95, subsampling=0, **kw)


if __name__ == '__main__':
    info = {}
    process(sys.argv[1], sys.argv[2], size=int(sys.argv[3]) if len(sys.argv) > 3 else None, info=info)
    print(info)
