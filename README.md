<div align="center">

# 📊 TechStack Insights

**채용공고 기반 실시간 기술 트렌드 분석 대시보드**

<p>
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" />
</p>

<p>
  국내 채용공고를 크롤링·분석해서 <b>실시간 기술 트렌드</b>,<br/>
  <b>본인 스택 매칭</b>, <b>AI 도구 침투율</b>까지 한눈에 보여주는 빅데이터 프로젝트.
</p>

</div>

---

## ✨ 주요 기능

| 섹션 | 내용 |
|---|---|
| 📈 **Market Trends** | 필수 스킬 TOP 10 · 카테고리 비중 도넛 · 필수/우대 비율 · 경력별 분포 |
| 🎯 **Stack Match** | 보유 스킬·경력 입력 → 직무 매칭률 + 추천 공고 리스트 |
| 🤖 **AI Trends** | AI 도구 TOP 10 · 카테고리 분포 · 직무별 AI 요구 현황 · 필수/우대 비율 |

직무·경력 필터를 바꾸면 **페이지 새로고침 없이** 모든 차트가 즉시 재집계됩니다.

---

## 🌐 데이터 소스

| 출처 | 방식 | 비고 |
|---|---|---|
| 🟢 **원티드** ([wanted.co.kr](https://www.wanted.co.kr)) | 공개 JSON API | 개발 8개 직군 그룹 (백엔드/프론트/iOS/Android/데이터/ML 등) |
| 🟢 **점핏** ([jumpit.saramin.co.kr](https://jumpit.saramin.co.kr)) | 공개 JSON API | 개발자 전용 플랫폼, 9개 카테고리 |

> 모든 크롤러는 **robots.txt 자동 검증** + **랜덤 슬립** + **정직한 User-Agent** + **개인정보 비수집** 정책을 코드 단에서 강제합니다.

---

## 🏗 아키텍처

```
[ Crawler ]              [ Analyzer ]              [ Frontend ]
원티드 + 점핏     →     raw_job_postings    →    skill_analysis    →   React 대시보드
 (Python)              (Supabase / PostgreSQL)      (Python)            (Babel inline)
```

| 레이어 | 핵심 기술 | 역할 |
|---|---|---|
| **수집** | `requests`, `tqdm` | robots.txt 검사 후 공개 API 호출, 매너 딜레이 |
| **저장** | Supabase (PostgreSQL) | `(source, source_id)` 유일성으로 출처 추상화 |
| **분석** | `re` (정규식), 동의어 사전 | 70+ 기술 스택 정규화, 직군·경력별 집계 |
| **시각화** | React 18 + Babel/standalone | 빌드 없이 인라인 JSX, 다크 글래스모피즘 UI |

---

## 📁 프로젝트 구조

```
school/
├─ crawler/               # 수집기 (Python)
│   ├─ wanted_crawler.py  # 원티드 — robots.txt 자동 검사 포함
│   ├─ jumpit_crawler.py  # 점핏 — 공개 API 직접 호출
│   └─ seed_data.py       # 개발용 시드 데이터
├─ analyzer/              # 분석기 (Python)
│   ├─ keyword_extractor.py  # 70+ 정규식 패턴 + 동의어 매핑
│   ├─ analyze.py            # 직군·경력별 집계 → skill_analysis 적재
│   └─ seed_analysis.py      # 분석 결과 시드
├─ frontend/              # React 대시보드
│   ├─ index.html         # 부팅 + Supabase SDK 로드
│   ├─ data.js            # 데이터 페치 + 클라이언트 측 재집계
│   ├─ app.jsx            # 라우팅 + 테마
│   ├─ layout.jsx         # Header / HeroBanner / Footer
│   ├─ components.jsx     # 차트 프리미티브 (HBar / Donut / VBars …)
│   ├─ section-*.jsx      # 3개 섹션 (dashboard / match / ai)
│   └─ styles.css         # 디자인 시스템 + 애니메이션
└─ setup.sql              # Supabase 스키마 정의
```

---

## 🚀 사용 방법

### 1. 사전 준비

- Python 3.9+
- [Supabase](https://supabase.com) 프로젝트 (무료 플랜 OK)
- 모던 브라우저 (Chrome / Safari / Edge)

### 2. DB 초기화

Supabase SQL Editor에서 [`setup.sql`](./setup.sql) 전체 실행.

세 개의 테이블이 생성됩니다.
- `raw_job_postings` — 원본 공고
- `keyword_mappings` — 동의어 사전
- `skill_analysis` — 직군·경력별 집계 결과

### 3. 크롤러 실행 (데이터 수집)

```bash
cd crawler
pip install -r requirements.txt

# 환경변수 설정 (한 번만)
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_role_key"

# 원티드 크롤러 — robots.txt 자동 검사 후 시작
python wanted_crawler.py

# 점핏 크롤러
python jumpit_crawler.py
```

### 4. 분석기 실행 (키워드 추출 + 집계)

```bash
cd analyzer
pip install -r requirements.txt
python analyze.py
```

### 5. 프론트엔드 띄우기

빌드가 **필요 없습니다** (Babel/standalone이 브라우저에서 직접 트랜스파일).

```bash
cd frontend
python -m http.server 8080
# → 브라우저에서 http://localhost:8080 접속
```

또는 GitHub Pages / Vercel / Netlify에 그대로 정적 호스팅.

---

## 🛡 윤리적 크롤링

`crawler/wanted_crawler.py` 의 `check_robots_txt()` 가 매 실행마다 호출되어 사이트 정책을 검증합니다.

| 항목 | 구현 |
|---|---|
| **robots.txt 자동 검사** | 차단 규칙 감지 시 즉시 종료 |
| **랜덤 요청 슬립** | 0.3~0.6초 사이 무작위 (burst 트래픽 방지) |
| **정직한 User-Agent** | 실제 Chrome UA 사용, 봇 위장 안 함 |
| **중복 요청 방지** | DB UNIQUE 제약으로 동일 공고는 갱신만(upsert) |
| **개인정보 비수집** | DB 스키마에 담당자 연락처 컬럼 자체가 없음 |

---

## 🔠 텍스트 정규화

채용공고는 "쿠버네티스 / k8s / Kubernetes"처럼 같은 기술도 표기가 제각각입니다.

- **70+ 정규식 패턴 사전** — 영문 정식명 + 약어 + 한글 표기를 한 묶음으로 등록
- **오탐 방지** — `Java`가 `JavaScript`로 잘못 잡히지 않도록 단어 경계 조건 명시
- **DB 동의어 사전** — `keyword_mappings` 테이블에서 운영 중 동적 추가 가능
- **3개 컬럼 분리** — 자격요건/우대사항/기술스택을 따로 추출 → "필수 vs 우대" 비율 데이터 단 계산

---

## 🎨 디자인 시스템

- 🌑 **다크 글래스모피즘** — `backdrop-filter: blur()` + 반투명 surface
- 🌈 **6색 카테고리 팔레트** — `--cat-language` / `--cat-cloud` / `--cat-tool` …
- ✨ **부드러운 마이크로 인터랙션** — 카드 호버 스포트라이트, 차트 reveal-on-scroll
- ☀️ **라이트 모드 지원** — `data-theme` 어트리뷰트 토글

---

## 📜 라이선스

MIT License — 자유롭게 fork·수정·재배포하세요.

---

<div align="center">

**Built with ☕ and curiosity by Newt-JH**

</div>
