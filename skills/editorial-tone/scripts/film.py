"""레퍼런스 3장(중형 필름 룩) 특징을 직접 재현하는 보정. 픽셀 생성 없음."""
import sys, numpy as np
import io
from PIL import Image, ImageFilter, ImageOps, ImageCms
from tone import rgb2lab, lab2rgb
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
SRGB_BYTES = SRGB.tobytes()

P = dict(  # 강도 조절용 기본값
    black=2.0,       # 검정 바닥 살짝 띄우기 (필름 매트감)
    white=93.0,      # 가장 밝은 곳 상한 (하이라이트 눌림)
    contrast=0.88,   # 중간톤 대비 (1=원본)
    sat=0.86,        # 전체 채도
    green_sat=0.55,  # 초록 채도
    green_shift=-18, # 초록 색상 → 올리브/노랑 쪽으로 회전(도)
    skin_warm=1.18,  # 피부(주황) 채도
    sh_a=-1.5, sh_b=-1.0,  # 그림자: 청록 회색
    hi_a=1.5, hi_b=6.0,
    mid_a=0.8, mid_b=4.5,  # 중간톤: 필름 특유의 노란·따뜻한 기운    # 밝은 영역: 따뜻한 크림
    grain=0.0,
)

def tone_curve(L, p):
    x = L/100
    # 중간톤 대비 줄이기 (0.5 중심 S커브 반대)
    x = 0.5 + (x-0.5)*p['contrast'] + 0.04*np.sin(np.pi*(x-0.5))*(1-p['contrast'])
    x = np.clip(x, 0, 1)
    # 하이라이트 롤오프
    k = 0.72; over = np.clip(x-k, 0, None)
    x = np.where(x > k, k + (1-k)*(1-np.exp(-over/(1-k)*1.4))/(1-np.exp(-1.4)), x)
    return p['black'] + x*(p['white']-p['black'])

def film(src, dst, p=P, size=None):
    im = Image.open(src)
    ex = im.getexif(); icc = im.info.get('icc_profile')
    im = ImageOps.exif_transpose(im).convert('RGB')      # 아이폰 회전 정보 반영
    if 274 in ex: ex[274] = 1                             # 회전은 이미 적용 → 표시값 초기화
    exif = ex.tobytes() if len(ex) else None
    if icc:                                               # P3 등 → sRGB로 정확히 변환
        src_p = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        if 'sRGB' not in (ImageCms.getProfileDescription(src_p) or ''):
            im = ImageCms.profileToProfile(im, src_p, SRGB, renderingIntent=1, outputMode='RGB')
    if size: im.thumbnail((size, size))
    rgb = np.asarray(im, np.float32)/255
    lab = rgb2lab(rgb); L, a, b = lab[...,0], lab[...,1], lab[...,2]
    L2 = tone_curve(L, p)
    C = np.hypot(a, b); h = np.arctan2(b, a)
    hd = np.degrees(h) % 360
    g = np.clip(1-np.abs(hd-130)/50, 0, 1)            # 초록
    skin = np.clip(1-np.abs(hd-60)/25, 0, 1)          # 피부·주황
    blue = np.clip(1-np.abs(hd-260)/50, 0, 1)         # 파랑(데님·네이비)
    h = h + np.radians(p['green_shift'])*g
    C = C*p['sat']*(1-(1-p['green_sat']/p['sat'])*g)*(1+(p['skin_warm']-1)*skin)*(1+0.05*blue)
    a, b = C*np.cos(h), C*np.sin(h)
    sh = np.clip(1-(L2-10)/40, 0, 1); hi = np.clip((L2-55)/35, 0, 1)
    md = np.clip(1-sh-hi, 0, 1)
    a = a + p['sh_a']*sh + p['hi_a']*hi + p['mid_a']*md; b = b + p['sh_b']*sh + p['hi_b']*hi + p['mid_b']*md
    out = lab2rgb(np.stack([L2, a, b], -1))
    if p['grain']:
        rng = np.random.default_rng(11)
        n = rng.normal(0, 1, out.shape[:2]).astype(np.float32)
        # 필름 입자: 살짝 뭉친 입자 + 중간톤에 강하게
        n_img = Image.fromarray(((n*40)+128).clip(0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8 * max(out.shape[:2])/3000))
        n = (np.asarray(n_img, np.float32)-128)/40
        n = n/ (n.std()+1e-6)
        mid = 0.5+0.5*(1-np.abs(out.mean(-1)*2-1))
        out = np.clip(out + (n*p['grain']*mid)[...,None], 0, 1)
    kw = {'exif': exif} if exif and not size else {}
    kw['icc_profile'] = SRGB_BYTES
    Image.fromarray((out*255+0.5).astype(np.uint8)).save(dst, quality=95, subsampling=0, **kw)

if __name__ == '__main__':
    film(sys.argv[1], sys.argv[2], size=int(sys.argv[3]) if len(sys.argv) > 3 else None)
