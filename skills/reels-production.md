---
name: 릴스 제작 (Reels Production)
description: |
  PRESSPRESS 릴스 제작 품질 체크리스트. 영상 다운로드부터 자막, 발행까지 빠짐없이 검수한다.
  ⚠️ 트리거: 사용자가 "릴스 만들어", "릴스 제작", "릴스 스킬" 이라고 하면 이 스킬을 읽고 절차를 따른다.
---

# 릴스 제작 스킬 — PRESSPRESS

## 레퍼런스
@lingrongdang 릴스 스타일 카피. 실제 영상 클립 + 좌하단 자막 + 원본 오디오.

## Phase 1 파이프라인 (반자동)

### Step 1: 소재 확인
- [ ] 유튜브 URL 확보
- [ ] 시작/끝 타임스탬프 확인
- [ ] 원본 영상 채널명 확인 (출처 표기용)

### Step 2: 영상 다운로드
- [ ] yt-dlp로 다운로드 (Python 3.12 사용)
- [ ] **해상도 1080p 이상 필수** (format: `137+140` 또는 `bestvideo[height>=1080]+bestaudio`)
- [ ] 480p 이하 다운로드 시 → 즉시 중단, 다른 소스 찾기
- [ ] 다운로드 후 해상도 확인 코드 실행

검증 코드:
```python
from moviepy import VideoFileClip
c = VideoFileClip("파일경로")
assert c.size[0] >= 1080 or c.size[1] >= 1080, f"해상도 부족: {c.size}"
print(f"✅ 해상도: {c.size}, 길이: {c.duration}초")
```

### Step 3: 구간 추출 + 크롭
- [ ] ffmpeg로 지정 구간 컷
- [ ] 9:16 세로 크롭 (중앙 기준)
- [ ] 최종 해상도: 1080×1920
- [ ] 크롭 후 인물 얼굴이 잘리지 않았는지 확인

### Step 4: 음성 전사 (대화 자막)
- [ ] Whisper로 음성 전사 (base 모델 이상)
- [ ] 세그먼트별 타임스탬프 확보
- [ ] 영어 → 한국어 번역 (Gemini 또는 수동)
- [ ] **대화 자막 없는 릴스 = 즉시 탈락**

### Step 5: 자막 오버레이
**대화 자막 (필수)**:
- [ ] 위치: 하단 중앙 고정 (center, y=1300). 골든샘플 정밀 측정 기준. Mac 미리보기에서는 하단 잘려 보이지만 인스타에서는 정상
- [ ] 폰트: bold 산세리프 (AppleSDGothicNeo), 62pt
- [ ] 색상: 흰색 + 그림자(검은색 opacity 0.5, +2px 아래). 외곽선 없음
- [ ] 정렬: 중앙 정렬
- [ ] 타이밍: Whisper 세그먼트와 동기화
- [ ] 최대 폭: 900px (줄바꿈 자동)
- [ ] **⚠️ moviepy TextClip 사용 금지 (한글 하단 잘림 버그). PIL로 자막 이미지 생성 → ImageClip으로 합성**

**타이틀/로고**: 없음 (골든샘플 기준 — 자막만 깔끔하게)

### Step 6: 최종 검증
- [ ] 해상도 1080×1920 (9:16)
- [ ] 대화 자막 존재 확인
- [ ] 자막 타이밍 동기화 확인
- [ ] 오디오: 원본 그대로 (무음 아님)
- [ ] 비트레이트 3000kbps 이상
- [ ] 영상 길이 최대 90초

### Step 7: 캡션 + 출처
- [ ] 캡션: 에디토리얼 코멘트 (준선의 시선 or 매거진 톤)
- [ ] 출처: "Video: [원본 영상이 게시된 채널명]" 필수
  - 예: "Video: Abundance360 YouTube"
  - 예: "Video: B tv 이동진의 파이아키아"
  - 예: "Video: Netflix Korea YouTube"
- [ ] 출처는 영상 속 인물이 아니라 **영상이 올라온 채널**

## 킬 조건 (하나라도 걸리면 발행 금지)
1. 해상도 1080p 미만
2. 대화 자막 없음
3. 오디오 없음 (무음)
4. 출처 미표기
5. 자막이 화면 밖으로 잘림
6. 자막 타이밍 3초 이상 어긋남

## 기술 참고
- Python: 3.12+ (맥북 `/opt/homebrew/opt/python@3.12/bin/python3.12`)
- yt-dlp: `python3.12 -m yt_dlp`
- Whisper: `import whisper; model = whisper.load_model("base")`
- moviepy: `from moviepy import VideoFileClip, TextClip, CompositeVideoClip`
- 1080p 포맷: `-f "137+140"` (mp4 video + m4a audio)
