"""에디토리얼 톤 단일 실행기. LLM 판단 없이 동작(프로그램·Buddy·저가 모델 공용).
  apply <필터명> <입력폴더|파일> <출력폴더> [--sheet]   확정 필터 적용(원본 해상도) + 비교본
  gate  <레퍼런스폴더> [--against <필터명>]              레퍼런스 충분조건 심사 + 기존 톤과 차이
  list                                                    확정 필터 목록
출력 마지막 줄 = JSON 상태(STATUS: READY/NOT_READY/DONE/NEEDS_USER)."""
import sys, os, glob, json, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
from PIL import Image
import film2
FD = os.path.join(H, '..', 'filters')
EXT = ('.jpg', '.jpeg', '.png', '.heic', '.avif', '.tif', '.tiff', '.dng', '.raf', '.cr2', '.cr3', '.nef', '.arw')

def filters():
    return {json.load(open(f))['name'].split(' ', 2)[-1].lower(): json.load(open(f)) for f in glob.glob(FD + '/*.json')}

def files_of(p):
    if os.path.isfile(p): return [p]
    return sorted(f for f in glob.glob(p + '/*') if f.lower().endswith(EXT))

def apply(name, src, out, sheet):
    F = filters(); f = F.get(name.lower())
    if not f: return dict(STATUS='NEEDS_USER', 이유=f'확정 필터 없음: {name}', 목록=list(F))
    os.makedirs(out, exist_ok=True); done, thumbs = [], []
    for p in files_of(src):
        rgb, exif = film2.load_any(p); x = film2.normalize(rgb); y = film2.film_arr(x, f['params'])
        o = os.path.join(out, os.path.splitext(os.path.basename(p))[0] + f'_{name}.jpg')
        Image.fromarray((y*255+.5).astype(np.uint8)).save(o, quality=95, subsampling=0, icc_profile=film2.SRGB_BYTES, **({'exif': exif} if exif else {}))
        # 화질 검수: 디테일(고주파) 일치도
        a = np.asarray(Image.fromarray((x*255).astype(np.uint8)).convert('L').reduce(4), np.float32); b = np.asarray(Image.open(o).convert('L').reduce(4), np.float32)
        hp = lambda m: m - (np.roll(m,1,0)+np.roll(m,-1,0)+np.roll(m,1,1)+np.roll(m,-1,1))/4
        det = float(np.corrcoef(hp(a).ravel(), hp(b).ravel())[0,1]); done.append(dict(파일=os.path.basename(o), 디테일=round(det,3), 통과=det>=0.95))
        if sheet:
            t = [Image.fromarray((z*255+.5).astype(np.uint8)) for z in (x, y)]
            for i in t: i.thumbnail((1200, 1200))
            s = Image.new('RGB', (t[0].width*2, t[0].height), 'white'); s.paste(t[0], (0,0)); s.paste(t[1], (t[0].width,0))
            s.save(os.path.join(out, '비교_' + os.path.basename(o)), quality=88)
    bad = [d for d in done if not d['통과']]
    return dict(STATUS='DONE' if not bad else 'NEEDS_USER', 처리=len(done), 화질실패=bad, 출력=out)

def gate(ref, against):
    import refgate
    g = refgate.judge(files_of(ref)); r = dict(STATUS=g['판정'], 사용가능=g['사용가능'], 전체=g['전체'], 부족=g['부족'],
        제외=[(x['file'], x['제외이유']) for x in g['장별'] if not x['사용']])
    if against:
        ad = os.path.join(H, '..', 'refsets', against.lower())
        if os.path.isdir(ad):
            c = refgate.compare(refgate.judge(files_of(ad)), g); r['기존톤비교'] = c
            if c['판정'] != '같은 톤': r['STATUS'] = 'NEEDS_USER'; r['질문'] = f'기존 {against} 톤과 다릅니다(차이 {c["톤차이"]}). 기존 유지 / 새 필터로 분리 / 교체 중 선택 필요'
        else: r['기존톤비교'] = f'{against} 기준 레퍼런스 폴더 없음(refsets/{against.lower()})'
    return r

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == 'list': res = dict(STATUS='DONE', 필터={k: v['status'] for k, v in filters().items()})
    elif a[0] == 'apply': res = apply(a[1], a[2], a[3], '--sheet' in a)
    elif a[0] == 'gate': res = gate(a[1], a[a.index('--against')+1] if '--against' in a else None)
    print(json.dumps(res, ensure_ascii=False))
