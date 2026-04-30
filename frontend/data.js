// TSI_DATA — TechStack Insights mock dataset
// Shape consumed by section-dashboard / section-match / section-ai.
// Real data wiring (Supabase, etc.) can replace these arrays without
// changing the UI as long as the field names stay the same.

window.TSI_DATA = {
  UPDATED: "2026-04-30",
  TOTAL_JOBS: 8421,
  TOTAL_SKILLS: 142,
  TOTAL_AI_TOOLS: 38,

  // Top 10 skills (rank list + req/pref split)
  // cat: language | cloud | tool | framework | method | api | ai | other
  SKILLS_TOP10: [
    { name: "Python",     count: 4120, cat: "language",  trend:  8, required: 62, preferred: 38 },
    { name: "Java",       count: 3580, cat: "language",  trend:  2, required: 70, preferred: 30 },
    { name: "AWS",        count: 3210, cat: "cloud",     trend: 12, required: 55, preferred: 45 },
    { name: "Docker",     count: 2840, cat: "tool",      trend:  9, required: 48, preferred: 52 },
    { name: "Kubernetes", count: 2210, cat: "tool",      trend: 18, required: 35, preferred: 65 },
    { name: "Spring",     count: 2080, cat: "framework", trend:  1, required: 72, preferred: 28 },
    { name: "React",      count: 1960, cat: "framework", trend:  6, required: 60, preferred: 40 },
    { name: "TypeScript", count: 1740, cat: "language",  trend: 15, required: 52, preferred: 48 },
    { name: "SQL",        count: 1610, cat: "language",  trend:  3, required: 68, preferred: 32 },
    { name: "Go",         count:  980, cat: "language",  trend: 22, required: 30, preferred: 70 },
  ],

  // Donut: category share — value is % (0-100)
  // color matches CSS var --cat-{key}
  CATEGORY_DIST: [
    { name: "언어",         value: 28.4, color: "language"  },
    { name: "클라우드/인프라", value: 22.1, color: "cloud"     },
    { name: "프레임워크",     value: 18.6, color: "framework" },
    { name: "도구",         value: 14.2, color: "tool"      },
    { name: "AI/데이터",     value:  9.3, color: "ai"        },
    { name: "기법",         value:  4.8, color: "method"    },
    { name: "API/플랫폼",   value:  2.6, color: "api"       },
  ],

  // Vertical bars
  EXP_DIST: [
    { label: "신입",     value:  920 },
    { label: "1–3년",   value: 2480 },
    { label: "3–5년",   value: 2860 },
    { label: "5–10년",  value: 1640 },
    { label: "10년+",   value:  521 },
  ],

  RECENT_TRENDS: [
    { label: "Kubernetes", change: 18 },
    { label: "TypeScript", change: 15 },
    { label: "Go",         change: 22 },
    { label: "Rust",       change: 31 },
  ],

  // ─── AI section ──────────────────────────────────────────────────
  AI_TOOLS: [
    { rank:  1, name: "GitHub Copilot",   count: 412, cat: "tool",      tag: "도구",      trend: 24 },
    { rank:  2, name: "ChatGPT",          count: 388, cat: "ai",        tag: "도구",      trend: 18 },
    { rank:  3, name: "Claude",           count: 246, cat: "ai",        tag: "도구",      trend: 42 },
    { rank:  4, name: "OpenAI",           count: 218, cat: "api",       tag: "API/플랫폼", trend: 16 },
    { rank:  5, name: "LangChain",        count: 196, cat: "framework", tag: "프레임워크",  trend: 28 },
    { rank:  6, name: "RAG",              count: 174, cat: "method",    tag: "기법",      trend: 35 },
    { rank:  7, name: "Cursor",           count: 142, cat: "tool",      tag: "도구",      trend: 58 },
    { rank:  8, name: "Anthropic",        count: 128, cat: "api",       tag: "API/플랫폼", trend: 45 },
    { rank:  9, name: "벡터DB",            count: 116, cat: "method",    tag: "기법",      trend: 22 },
    { rank: 10, name: "LlamaIndex",       count:  94, cat: "framework", tag: "프레임워크",  trend: 19 },
  ],

  AI_CATEGORY: [
    { name: "도구",        value: 38.2, color: "tool"      },
    { name: "프레임워크",   value: 23.8, color: "framework" },
    { name: "API/플랫폼",  value: 18.4, color: "api"       },
    { name: "기법",        value: 14.6, color: "method"    },
    { name: "AI/데이터",   value:  5.0, color: "ai"        },
  ],

  AI_BY_ROLE: [
    { role: "Data/AI",   value: 412 },
    { role: "Backend",   value: 286 },
    { role: "Frontend",  value: 184 },
    { role: "DevOps",    value: 142 },
    { role: "Mobile",    value:  62 },
    { role: "QA",        value:  38 },
    { role: "기획/PM",    value:  46 },
    { role: "기타",       value:  24 },
  ],

  AI_REQ_PREF: [
    { name: "GitHub Copilot", count: 412, required: 28, preferred: 72, tag: "도구" },
    { name: "ChatGPT",        count: 388, required: 22, preferred: 78, tag: "도구" },
    { name: "LangChain",      count: 196, required: 45, preferred: 55, tag: "프레임워크" },
    { name: "RAG",            count: 174, required: 52, preferred: 48, tag: "기법" },
    { name: "OpenAI",         count: 218, required: 38, preferred: 62, tag: "API/플랫폼" },
    { name: "Cursor",         count: 142, required: 14, preferred: 86, tag: "도구" },
  ],

  // ─── Stack Match section ─────────────────────────────────────────
  RECOMMEND_ROLES: [
    { role: "Backend Engineer",  match: 92, count: 124 },
    { role: "DevOps Engineer",   match: 86, count:  78 },
    { role: "Data Engineer",     match: 78, count:  62 },
    { role: "Cloud Architect",   match: 71, count:  34 },
    { role: "ML Engineer",       match: 64, count:  41 },
  ],

  RECOMMEND_JOBS: [
    {
      title: "백엔드 개발자 (Python/AWS)",
      role: "Backend",
      company: "토스",
      location: "서울 강남",
      exp: "3–5년",
      match: 94,
      skills: ["Python", "AWS", "Docker", "PostgreSQL", "Kubernetes"],
      bullets: [
        "대규모 트래픽 환경에서의 백엔드 시스템 설계 및 개발",
        "AWS 기반 마이크로서비스 아키텍처 구축",
        "결제/송금 도메인 비즈니스 로직 구현",
      ],
    },
    {
      title: "Cloud Platform Engineer",
      role: "DevOps",
      company: "쿠팡",
      location: "서울 송파",
      exp: "3–5년",
      match: 88,
      skills: ["AWS", "Kubernetes", "Terraform", "Python", "Go"],
      bullets: [
        "EKS 기반 멀티 클러스터 운영 및 자동화",
        "IaC(Terraform) 기반 인프라 표준화",
        "옵저버빌리티 스택 운영 (Prometheus/Grafana)",
      ],
    },
    {
      title: "Data Engineer (LLM 파이프라인)",
      role: "Data/AI",
      company: "네이버",
      location: "경기 성남",
      exp: "1–3년",
      match: 81,
      skills: ["Python", "Airflow", "Spark", "AWS", "LangChain"],
      bullets: [
        "RAG 파이프라인 구축 및 운영",
        "벡터DB(Pinecone/Weaviate) 인덱싱 자동화",
        "데이터 품질 모니터링 시스템 개발",
      ],
    },
    {
      title: "Senior Backend Engineer",
      role: "Backend",
      company: "당근",
      location: "서울 서초",
      exp: "5–10년",
      match: 76,
      skills: ["Go", "AWS", "Kafka", "PostgreSQL", "gRPC"],
      bullets: [
        "지역 기반 매칭 시스템 백엔드 개발",
        "이벤트 기반 아키텍처 설계 및 운영",
        "주니어 엔지니어 멘토링",
      ],
    },
    {
      title: "MLOps Engineer",
      role: "Data/AI",
      company: "카카오",
      location: "경기 판교",
      exp: "3–5년",
      match: 72,
      skills: ["Python", "Kubernetes", "MLflow", "AWS", "Docker"],
      bullets: [
        "모델 서빙 파이프라인 구축",
        "Feature Store 운영",
        "실험 관리/추적 시스템 개발",
      ],
    },
  ],
};
