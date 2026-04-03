# Claude Code 커스텀 스킬 모음

마지코리아 팀 공용 Claude 스킬 파일입니다.
Claude에게 특정 업무를 시킬 때, 매번 길게 설명하지 않아도 **일관된 품질**로 결과물을 받을 수 있게 해주는 "업무 매뉴얼"입니다.

---

## 스킬이란?

스킬 = Claude에게 미리 넣어두는 **업무별 지침서**

예를 들어 "맛집 추천해줘"라고 하면, 스킬 없이는 Claude가 기억에 의존해서 부정확한 정보를 줄 수 있음.
스킬이 있으면 → 웹 검색 필수, 영업시간 확인 필수, 비교표 필수, 최종 1곳 추천 필수 등 **정해진 프로세스**를 따름.

---

## 스킬 목록 (11개)

### 1. 사업 타당성 검증 (`business-analysis.md`)
- **언제 쓰나**: "이거 해볼만할까?", "사업성 있을까?", "ROI 나올까?", 외부 제안서 검토
- **뭘 해주나**: 5단계 검증 (전략적합성 → 시장성 → 실행가능성 → 수익모델 → 리스크) → Go/No-Go 판정
- **활용 예시**:
  - "틱톡 콘텐츠 자동화 사업 해볼까?"
  - "이 협업 제안서 검토해줘, 할만한지 판단해줘"
  - "3천만원 광고 투자 ROI 나올까?"

### 2. 경쟁사 벤치마크 (`competitor-benchmark.md`)
- **언제 쓰나**: 경쟁 브랜드 분석, 비교 분석, 레퍼런스 리서치
- **뭘 해주나**: 재무/상세페이지/마케팅/UX 4가지 유형별 비교표 + 인사이트 + 액션 도출
- **활용 예시**:
  - "Stand Oil이랑 우리 가방 비교 분석해줘"
  - "파사드패턴 재무구조 분석해줘"
  - "무신사에서 경쟁 브랜드들 어떻게 운영하는지 조사해줘"

### 3. CRM 전략 (`crm-strategy.md`)
- **언제 쓰나**: 고객 세그먼트, 쿠폰 전략, 리텐션/윈백, 캠페인 설계
- **뭘 해주나**: 4퍼널 체계(신규→활성→이탈→휴면) 기반 캠페인 설계 + 쿠폰 정책 체크
- **활용 예시**:
  - "이탈 고객 윈백 캠페인 설계해줘"
  - "첫구매 전환 쿠폰 전략 짜줘"
  - "이 데이터 보고 어떤 캠페인 돌려야 해?"

### 4. 매출 리포트 서식 (`sales-report-format.md`)
- **언제 쓰나**: 매출 리포트 작성, 실적 보고서, 슬랙 리포트 양식
- **뭘 해주나**: 슬랙/엑셀 리포트 통일 서식 적용 (요약 3줄 + 채널별/라인별/에이징별 실적)
- **활용 예시**:
  - "이번 주 매출 데이터 리포트로 정리해줘"
  - "슬랙용 일일 리포트 양식 만들어줘"

### 5. GAS 자동화 (`gas-automation.md`)
- **언제 쓰나**: Google Apps Script 코드 작성, 슬랙 봇 개발, 스프레드시트 자동화
- **뭘 해주나**: CONFIG 분리, 단일 책임 함수, 테스트 함수, 에러 핸들링 등 코드 품질 기준 적용
- **활용 예시**:
  - "스프레드시트 데이터 읽어서 슬랙으로 보내는 봇 만들어줘"
  - "이 GAS 코드 버그 수정해줘"

### 6. 검색 가시성 최적화 (`search-visibility.md`)
- **언제 쓰나**: SEO, GEO(AI 검색 최적화), 네이버/구글/무신사 검색 노출
- **뭘 해주나**: 9개 항목 10점 만점 채점 (기술기반, 스키마, 카테고리KW, E-E-A-T, PR, 내부링크, 네이버, 플랫폼, UGC)
- **활용 예시**:
  - "마지언타이틀 검색 가시성 점검해줘"
  - "구글에서 '미니멀 가방 브랜드'로 검색되게 하려면?"
  - "스키마 마크업 코드 만들어줘"

### 7. GEO 최적화 (`geo-optimization.md`)
- **언제 쓰나**: search-visibility와 유사 (AI 검색 최적화 특화 버전)
- **참고**: search-visibility.md가 최신 통합 버전. 이 파일은 이전 버전으로 참고용

### 8. 제품/서비스 추천 (`product-recommendation.md`)
- **언제 쓰나**: 뭔가를 사거나 고를 때 (노트북, AI 도구, 구독 서비스, 장비 등)
- **뭘 해주나**: 웹 검색으로 현재가 확인 → 비교표 → 최종 1개 추천
- **활용 예시**:
  - "월 10만원으로 AI 도구 조합 추천해줘"
  - "노트북 뭐가 좋을까? 예산 200만원"
  - "Make vs Zapier 비교해줘"

### 9. 여행/맛집 리서치 (`travel-food-research.md`)
- **언제 쓰나**: 맛집, 카페, 여행지, 숙소 추천
- **뭘 해주나**: 웹 검색 필수 → 영업시간/가격/평점/주차 확인 → 스코어링 비교표 → 미슐랭/블루리본 표기
- **활용 예시**:
  - "성수동 점심 맛집 추천해줘"
  - "부모님이랑 속초 여행 코스 짜줘"
  - "강남역 근처 이탈리안 맛집"

### 10. 종합 검토/팩트체크 (`fact-check-quality.md`)
- **언제 쓰나**: Claude 답변의 정확성 검증, 보고서 제출 전 품질 체크
- **뭘 해주나**: 8개 영역 체크 (사실정확성, 숫자일관성, 논리구조, 편향, 실행가능성, 최신성, 코드검증, 추천검증)
- **활용 예시**:
  - "이거 팩트체크해줘"
  - "이 분석 맞는지 검증해줘"
  - "출처 확인해줘"

### 11. 문서 서식 (`document-formatting.md`)
- **언제 쓰나**: 엑셀, 워드, PPT, PDF 등 문서 파일 생성 시
- **뭘 해주나**: 회색 계열 컬러, 맑은 고딕/Arial, 왼쪽 정렬, 눈금선 숨김 등 서식 통일
- **활용 예시**:
  - "이 데이터 엑셀로 정리해줘"
  - "보고서 PPT로 만들어줘"

---

## 설치 방법

### 1단계: 저장소 클론
```bash
# Mac
cd ~ && git clone https://github.com/junsun611/claude-skills.git

# Windows
cd %USERPROFILE% && git clone https://github.com/junsun611/claude-skills.git
```

### 2단계: 스킬 폴더에 복사 (또는 심볼릭 링크)

**방법 A: 복사 (간단)**
```bash
# Mac
cp ~/claude-skills/skills/*.md ~/.claude/skills/

# Windows (Git Bash)
cp ~/claude-skills/skills/*.md ~/.claude/skills/
```

**방법 B: 심볼릭 링크 (자동 동기화, 권장)**
```bash
# Mac
rm -rf ~/.claude/skills
ln -s ~/claude-skills/skills ~/.claude/skills

# Windows (관리자 권한 PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\skills"
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\skills" -Target "$env:USERPROFILE\claude-skills\skills"
```

### 3단계: 업데이트 받기
```bash
cd ~/claude-skills && git pull
```
심볼릭 링크 방식이면 pull만 하면 자동 반영.
복사 방식이면 pull 후 다시 cp 필요.

---

## 스킬 수정/추가 시

1. 스킬 파일 수정
2. `git add . && git commit -m "update: 스킬명" && git push`
3. 다른 기기에서 `git pull`

---

## Claude.ai 웹에서 쓰는 방법 (Claude Code 없이)

Claude Code가 아닌 **claude.ai 웹**에서도 스킬을 활용할 수 있음:

1. claude.ai → Projects → 새 프로젝트 생성
2. Project Instructions에 원하는 스킬 파일 내용을 붙여넣기
3. 해당 프로젝트에서 대화하면 스킬이 적용됨

---

## FAQ

**Q: 스킬 파일을 직접 수정해도 되나요?**
A: 네. 본인 업무에 맞게 수정 가능. 수정 후 커밋+푸시하면 팀 전체에 반영됨.

**Q: 새 스킬을 추가하고 싶어요**
A: `skills/` 폴더에 `.md` 파일 추가. 상단에 name, description, type을 frontmatter로 작성.

**Q: 맥이랑 윈도우에서 스킬이 달라질 수 있나요?**
A: 이 GitHub 저장소를 양쪽에서 pull하면 항상 동일하게 유지됨. 심볼릭 링크 방식 권장.
