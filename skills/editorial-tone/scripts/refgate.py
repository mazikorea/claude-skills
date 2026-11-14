"""레퍼런스 묶음 자격 심사: 장별 판정(컬러/인물/피부·중성 근거) + 묶음 일관성(이상치) + 충분 조건 판정."""
import sys, glob, os, json, subprocess, tempfile, numpy as np
from PIL import Image
from tone import rgb2lab
import fit
SEG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seg')

def person_mask(path, size):
    t = tempfile.mktemp(suffix='.png')
    try:
        subprocess.run([SEG, path, t], check=True, capture_output=True, timeout=60)
        return np.asarray(Image.open(t).convert('L').resize(size), np.float32) / 255 > .5
    except Exception: return None
    finally:
        if os.path.exists(t): os.remove(t)

def person_frac(path):
    t = tempfile.mktemp(suffix='.png')
    try:
        subprocess.run([SEG, path, t], check=True, capture_output=True, timeout=60)
        m = np.asarray(Image.open(t).convert('L'), np.float32) / 255; return float((m > .5).mean())
    except Exception: return -1.0
    finally:
        if os.path.exists(t): os.remove(t)

def anchors(rgb, pm=None):
    lab = rgb2lab(rgb).reshape(-1, 3); L, a, b = lab.T; C = np.hypot(a, b); h = np.degrees(np.arctan2(b, a)) % 360
    inp = pm.reshape(-1) if pm is not None else np.zeros_like(L, bool)
    skin = inp & (C > 6) & (C < 50) & ((h > 10) & (h < 85)) & (L > 30) & (L < 88)   # 인물 마스크 안만, 붉어진 피부도 포함
    neu_hi = (~inp) & (C < 12) & (L > 65); neu_sh = (C < 12) & (L < 30)
    f = lambda m: [round(float(a[m].mean()),1), round(float(b[m].mean()),1)] if m.sum() > 300 else None
    return dict(bw=bool(C.mean() < 4), C=round(float(C.mean()),1), skin_frac=round(float(skin.mean()),3),
                skin_ab=f(skin), skin_C=round(float(C[skin].mean()),1) if skin.sum()>300 else None,
                hi_ab=f(neu_hi), sh_ab=f(neu_sh), L50=round(float(np.percentile(L,50)),1))

def judge(files):
    import hashlib
    rows, seen = [], set()
    for p in files:
        hs = hashlib.md5(open(p,'rb').read()).hexdigest()
        x = fit.load_small(p, 400); pm = person_mask(p, (x.shape[1], x.shape[0]))
        r = dict(file=os.path.basename(p), **anchors(x, pm), person=round(float(pm.mean()),3) if pm is not None else -1.0)
        why = []
        if hs in seen: why.append('중복 파일')
        seen.add(hs)
        if r['person'] < 0: why.append('인물 분할 실패')
        if 'contact' in r['file'].lower(): why.append('밀착 인화본')
        if r['bw']: why.append('흑백')
        if 0 <= r['person'] < .03: why.append('인물 없음')
        if r['skin_ab'] is None: why.append('피부 근거 없음')
        if r['hi_ab'] is None and r['sh_ab'] is None: why.append('흰색·그림자 근거 없음')
        r['사용'] = not why; r['제외이유'] = why; rows.append(r)
    ok = [r for r in rows if r['사용']]
    # 일관성: 피부 a/b·채도, 밝은곳 a/b 기준 중앙값에서 먼 장 = 다른 톤
    if len(ok) >= 3:
        V = lambda r: np.array(r['skin_ab'] + [r['skin_C']] + (r['hi_ab'] or [np.nan, np.nan]), float)
        M = np.nanmedian(np.stack([V(r) for r in ok]), 0)
        for r in ok:
            d = float(np.nanmean(np.abs(V(r) - M))); r['톤거리'] = round(d, 1)
            if d > 6: r['사용'] = False; r['제외이유'].append(f'다른 톤(거리 {d:.1f}>6)')
    ok = [r for r in rows if r['사용']]
    spread = round(float(np.median([r.get('톤거리', 0) for r in ok])), 1) if ok else None
    need = []
    if len(ok) < 8: need.append(f'인물 컬러 레퍼런스 {8-len(ok)}장 더 필요(최소 8장)')
    if ok and sum(r['hi_ab'] is not None for r in ok) < 5: need.append('흰 옷·벽 등 밝은 무채색이 보이는 장 5장 이상 필요')
    if spread is not None and spread > 4: need.append(f'남은 장끼리 톤 편차 큼({spread}>4): 한 톤으로 묶이지 않음')
    verdict = 'READY' if not need else 'NOT_READY'
    return dict(판정=verdict, 사용가능=len(ok), 전체=len(rows), 톤편차=spread, 부족=need, 장별=rows)

def compare(a, b):
    """기존 확정 톤(a)과 새 레퍼런스(b): 피부·밝은곳·그림자 색 각각의 ΔE(a,b) 중 최대값으로 판정(평균 희석 방지)."""
    def med(res, k): v = [r[k] for r in res['장별'] if r['사용'] and r[k]]; return np.median(np.array(v), 0) if v else None
    d = {}
    for k in ('skin_ab', 'hi_ab', 'sh_ab'):
        x, y = med(a, k), med(b, k)
        if x is not None and y is not None: d[k] = round(float(np.hypot(*(x - y))), 1)
    m = max(d.values()) if d else None
    return dict(항목별=d, 톤차이=m, 판정='같은 톤' if m is not None and m <= 4 else '다른 톤 — 사용자 확인 필요')

if __name__ == '__main__':
    res = judge(sorted(glob.glob(sys.argv[1] + '/*'))); print(json.dumps({k: v for k, v in res.items() if k != '장별'}, ensure_ascii=False))
    for r in res['장별']: print(r['file'][:30], '사용' if r['사용'] else '제외', ','.join(r['제외이유']), r.get('톤거리',''))
