// data.js — Supabase fetch + TSI_DATA aggregation
// ─────────────────────────────────────────────────────────────────────
// Public flow:
//   1. window.TSI_LOAD() — fetches raw rows once, stores on window.TSI_RAW,
//      and returns an unfiltered TSI_DATA snapshot. index.html awaits this
//      before mounting React.
//   2. window.TSI_AGGREGATE({ role, exp }) — re-aggregates window.TSI_RAW
//      against the given filters. Sections call this from useMemo when
//      a filter changes so charts re-render against the filtered subset.
//
// If the Supabase fetch fails we still resolve with a minimal empty stub
// so the UI renders an empty state instead of a blank screen.
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://zrxcoutfpslkuvaepkwh.supabase.co";
const SUPABASE_KEY = "sb_publishable_0_jNsRRO6h89bHfv4ErItA_Lvp1H1FI";

// ─── Skill category map (mirrors analyzer's keyword groups) ──────────
const SKILL_CATEGORIES = {
  language:  ["JavaScript","TypeScript","Python","Java","Go","Kotlin","Swift","Ruby","Rust","C++","C#","PHP","Scala","R","SQL","HTML","CSS","HTML/CSS"],
  framework: ["React","Vue","Angular","Next.js","Nuxt.js","Spring","Django","Flask","FastAPI","Express","NestJS","Rails","Laravel","Svelte","JPA","Hibernate","Spring Boot","Node.js","React Native","Flutter"],
  cloud:     ["AWS","GCP","Azure","Docker","Kubernetes","Terraform","Jenkins","CI/CD","Linux","Ansible","Nginx","ArgoCD","Helm","Prometheus","Grafana","Datadog","ELK","GitHub Actions","GitLab CI"],
  tool:      ["Git","GitHub","GitLab","Figma","Jira","Slack","Notion","Storybook","Webpack","Vite","Jest","Cypress","Selenium","Pytest","Sass/SCSS","Tailwind","Redux","MobX","Zustand","Recoil"],
  ai:        ["TensorFlow","PyTorch","Pandas","NumPy","Spark","Hadoop","Tableau","Keras","Scikit-learn","Airflow","Kafka","MLflow","BigQuery","dbt","Looker","XGBoost","LightGBM"],
  api:       ["REST API","GraphQL","gRPC","WebSocket"],
};
const CATEGORY_LABEL = {
  language:  "언어",
  framework: "프레임워크",
  cloud:     "클라우드/인프라",
  tool:      "도구",
  ai:        "AI/데이터",
  api:       "API/플랫폼",
  method:    "기법",
  other:     "기타",
};

function getSkillCategory(keyword) {
  if (!keyword) return "other";
  const k = keyword.toLowerCase();
  for (const [cat, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some(s => k.includes(s.toLowerCase()))) return cat;
  }
  return "other";
}

// ─── AI tool catalog ────────────────────────────────────────────────
const AI_TOOLS = {
  "도구":      ["Copilot","GitHub Copilot","Claude Code","클로드코드","Claude","Cursor","Cody","Tabnine","CodeWhisperer","Windsurf","Devin","ChatGPT","GPT-4","Gemini","Perplexity","Midjourney","DALL-E","Stable Diffusion","Runway","Sora","Figma AI","Adobe Firefly","Notion AI","Gamma","Jasper","Grammarly AI"],
  "API/플랫폼": ["OpenAI","Anthropic"],
  "프레임워크": ["LangChain","LlamaIndex"],
  "기법":      ["RAG","벡터DB"],
};
const AI_SYNONYMS = {
  "Claude":          ["클로드코드","Claude Code","Claude"],
  "GitHub Copilot":  ["GitHub Copilot","Copilot"],
  "GPT-4":           ["GPT-4","GPT4"],
};
const AI_TAG_TO_CAT = {
  "도구":      "tool",
  "API/플랫폼": "api",
  "프레임워크": "framework",
  "기법":      "method",
};

function classifyPos(p) {
  if (!p) return "기타";
  const l = p.toLowerCase();
  if (["프론트","frontend","front-end","react","vue","퍼블리셔"].some(k => l.includes(k))) return "Frontend";
  if (["백엔드","backend","back-end","서버","server","풀스택","fullstack","웹 개발","웹개발"].some(k => l.includes(k))) return "Backend";
  if (["devops","sre","infra","인프라","데브옵스","cloud","클라우드","kubernetes","쿠버네티스"].some(k => l.includes(k))) return "DevOps";
  if (["data","데이터","ml","machine","ai","머신러닝","딥러닝","nlp","llm"].some(k => l.includes(k))) return "Data/AI";
  if (["android","ios","모바일","mobile","flutter","react native"].some(k => l.includes(k))) return "Mobile";
  if (["java","spring","python","django","node","golang","php"].some(k => l.includes(k))) return "Backend";
  if (["기획","pm","product manager","po"].some(k => l.includes(k))) return "기획/PM";
  if (["qa","test","품질","테스트"].some(k => l.includes(k))) return "QA";
  return "기타";
}

function classifyExp(level) {
  if (!level) return null;
  const s = String(level);
  if (/신입|0\s*[~-]\s*1|0\s*[~-]\s*2|0\s*[~-]\s*3/.test(s)) return "신입";
  const m = s.match(/(\d+)\s*[~-]\s*(\d+)/);
  if (m) {
    const hi = +m[2];
    if (hi <= 3)  return "1–3년";
    if (hi <= 5)  return "3–5년";
    if (hi <= 10) return "5–10년";
    return "10년+";
  }
  if (/10년 이상|10\+/.test(s)) return "10년+";
  if (/5년 이상|5\+/.test(s))   return "5–10년";
  if (/3년 이상|3\+/.test(s))   return "3–5년";
  if (/1년 이상|1\+/.test(s))   return "1–3년";
  return null;
}

// ─── Filter → DB value mappings ──────────────────────────────────────
// UI label → canonical role token used by classifyPos and skill_analysis.
const ROLE_FILTER_MAP = {
  "전체 직무": null,
  "백엔드":    "Backend",
  "프론트엔드": "Frontend",
  "AI/데이터": "Data/AI",
  "DevOps":   "DevOps",
  "모바일":    "Mobile",
};
// skill_analysis.position_type uses Korean labels in some seeds.
const ROLE_DB_ALIASES = {
  "Backend":  ["Backend",  "백엔드",  "Backend Engineer"],
  "Frontend": ["Frontend", "프론트엔드"],
  "Data/AI":  ["Data Science", "Data/AI", "데이터", "AI/데이터"],
  "DevOps":   ["DevOps", "데브옵스"],
  "Mobile":   ["Mobile", "모바일"],
};

// UI exp label → skill_analysis.target bucket (junior/senior).
function expToTarget(label) {
  if (!label || label === "전체 경력") return null;
  if (label === "신입" || label === "1–3년") return "junior";
  return "senior";
}

// ─── Aggregations (always take a pre-filtered subset) ────────────────
function buildSkillsTop10(skillRows) {
  const acc = {};
  for (const r of skillRows) {
    const name = r.keyword;
    if (!name) continue;
    if (!acc[name]) acc[name] = { name, count: 0, required: 0, preferred: 0 };
    acc[name].count     += r.total_count     || 0;
    acc[name].required  += r.required_count  || 0;
    acc[name].preferred += r.preferred_count || 0;
  }
  const sorted = Object.values(acc).sort((a, b) => b.count - a.count).slice(0, 10);
  return sorted.map(s => {
    const total = s.required + s.preferred;
    const reqPct  = total ? Math.round((s.required / total) * 100) : 0;
    const prefPct = total ? 100 - reqPct : 0;
    return {
      name:      s.name,
      count:     s.count,
      cat:       getSkillCategory(s.name),
      trend:     0,
      required:  reqPct,
      preferred: prefPct,
    };
  });
}

function buildCategoryDist(skillRows) {
  const totals = {};
  for (const r of skillRows) {
    const cat = getSkillCategory(r.keyword || "");
    totals[cat] = (totals[cat] || 0) + (r.total_count || 0);
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, v]) => ({
      name:  CATEGORY_LABEL[cat] || cat,
      value: +((v / sum) * 100).toFixed(1),
      color: cat,
    }));
}

function buildExpDist(jobRows) {
  const buckets = { "신입": 0, "1–3년": 0, "3–5년": 0, "5–10년": 0, "10년+": 0 };
  for (const j of jobRows) {
    const g = classifyExp(j.experience_level);
    if (g && buckets[g] != null) buckets[g] += 1;
  }
  return Object.entries(buckets).map(([label, value]) => ({ label, value }));
}

function buildAITrends(jobRows) {
  const synonymToCanonical = {};
  for (const [canonical, vlist] of Object.entries(AI_SYNONYMS)) {
    for (const v of vlist) synonymToCanonical[v.toLowerCase()] = canonical;
  }
  const variants = [];
  for (const [tag, list] of Object.entries(AI_TOOLS)) {
    for (const tool of list) {
      const canonical = synonymToCanonical[tool.toLowerCase()] || tool;
      variants.push({ pattern: tool.toLowerCase(), canonical, tag });
    }
  }

  const counts = {};
  const byRole = {};

  for (const j of jobRows) {
    const req  = (j.requirements || "").toLowerCase();
    const pref = (j.preferred    || "").toLowerCase();
    const tech = (j.tech_stack   || "").toString().toLowerCase();
    const all  = `${req} ${pref} ${tech}`;
    const role = classifyPos(j.position);

    const seen = new Set();
    for (const v of variants) {
      if (!all.includes(v.pattern)) continue;
      if (seen.has(v.canonical)) continue;
      seen.add(v.canonical);

      if (!counts[v.canonical]) counts[v.canonical] = { total: 0, req: 0, pref: 0, tag: v.tag };
      counts[v.canonical].total += 1;
      if (req.includes(v.pattern))  counts[v.canonical].req  += 1;
      if (pref.includes(v.pattern)) counts[v.canonical].pref += 1;
    }
    if (seen.size > 0) {
      byRole[role] = (byRole[role] || 0) + seen.size;
    }
  }

  const aiTools = Object.entries(counts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, info], i) => ({
      rank:  i + 1,
      name,
      count: info.total,
      cat:   AI_TAG_TO_CAT[info.tag] || "tool",
      tag:   info.tag,
      trend: 0,
    }));

  const tagTotals = {};
  for (const info of Object.values(counts)) {
    tagTotals[info.tag] = (tagTotals[info.tag] || 0) + info.total;
  }
  const tagSum = Object.values(tagTotals).reduce((a, b) => a + b, 0) || 1;
  const aiCategory = Object.entries(tagTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, v]) => ({
      name:  tag,
      value: +((v / tagSum) * 100).toFixed(1),
      color: AI_TAG_TO_CAT[tag] || "tool",
    }));

  const aiByRole = Object.entries(byRole)
    .sort((a, b) => b[1] - a[1])
    .map(([role, value]) => ({ role, value }));

  const aiReqPref = aiTools.slice(0, 6).map(t => {
    const c = counts[t.name];
    const tot = (c.req + c.pref) || c.total || 1;
    const reqPct  = Math.round((c.req / tot) * 100);
    const prefPct = 100 - reqPct;
    return {
      name:      t.name,
      count:     c.total,
      required:  reqPct,
      preferred: prefPct,
      tag:       c.tag,
    };
  });

  return { aiTools, aiCategory, aiByRole, aiReqPref };
}

// ─── Filter applied to TSI_RAW ──────────────────────────────────────
function filterRaw(raw, { role, exp } = {}) {
  const canonicalRole = ROLE_FILTER_MAP[role];
  const aliases = canonicalRole ? new Set(ROLE_DB_ALIASES[canonicalRole].map(s => s.toLowerCase())) : null;
  const target  = expToTarget(exp);
  const expLabel = exp && exp !== "전체 경력" ? exp : null;

  const skillRows = raw.skillRows.filter(r => {
    if (aliases) {
      const pt = (r.position_type || "").toLowerCase();
      // 'all' means cross-position aggregate; keep it for any role view too.
      if (pt && pt !== "all" && !aliases.has(pt)) return false;
    }
    if (target) {
      const t = (r.target || "").toLowerCase();
      if (t && t !== "all" && t !== target) return false;
    }
    return true;
  });

  const jobRows = raw.jobRows.filter(j => {
    if (canonicalRole && classifyPos(j.position) !== canonicalRole) return false;
    if (expLabel && classifyExp(j.experience_level) !== expLabel)   return false;
    return true;
  });

  return { skillRows, jobRows };
}

// ─── Mock fallback ───────────────────────────────────────────────────
const MOCK_TSI_DATA = {
  UPDATED: "—",
  TOTAL_JOBS: 0, TOTAL_SKILLS: 0, TOTAL_AI_TOOLS: 0,
  SKILLS_TOP10: [], CATEGORY_DIST: [], EXP_DIST: [
    { label: "신입", value: 0 }, { label: "1–3년", value: 0 },
    { label: "3–5년", value: 0 }, { label: "5–10년", value: 0 }, { label: "10년+", value: 0 },
  ],
  RECENT_TRENDS: [],
  AI_TOOLS: [], AI_CATEGORY: [], AI_BY_ROLE: [], AI_REQ_PREF: [],
  RECOMMEND_ROLES: [], RECOMMEND_JOBS: [],
};

// ─── Aggregator (filters → full TSI_DATA shape) ──────────────────────
window.TSI_AGGREGATE = function (opts = {}) {
  const raw = window.TSI_RAW;
  if (!raw) return { ...MOCK_TSI_DATA };

  const { skillRows, jobRows } = filterRaw(raw, opts);

  const SKILLS_TOP10  = buildSkillsTop10(skillRows);
  const CATEGORY_DIST = buildCategoryDist(skillRows);
  const EXP_DIST      = buildExpDist(jobRows);
  const ai            = buildAITrends(jobRows);

  const TOTAL_SKILLS = new Set(skillRows.map(r => r.keyword).filter(Boolean)).size;
  const updatedDates = raw.jobRows.map(j => j.crawled_at).filter(Boolean).sort().reverse();
  const UPDATED = updatedDates[0] ? updatedDates[0].slice(0, 10) : "—";

  const RECENT_TRENDS = SKILLS_TOP10.slice(0, 4).map(s => ({ label: s.name, change: 0 }));

  const recommendRoles = {};
  for (const j of jobRows) {
    const role = classifyPos(j.position);
    recommendRoles[role] = (recommendRoles[role] || 0) + 1;
  }
  const RECOMMEND_ROLES = Object.entries(recommendRoles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([role, count], i) => ({ role, match: 95 - i * 7, count }));

  const RECOMMEND_JOBS = jobRows.slice(0, 5).map((j, i) => ({
    title:    j.position || "(제목 없음)",
    role:     classifyPos(j.position),
    company:  "—",
    location: j.location || "—",
    exp:      j.experience_level || "경력 무관",
    match:    95 - i * 5,
    skills:   (j.tech_stack || "").toString().split(/[,\s]+/).filter(Boolean).slice(0, 5),
    bullets: [
      (j.requirements || "").slice(0, 80) || "자격요건 미공개",
      (j.preferred    || "").slice(0, 80) || "우대사항 미공개",
    ],
  }));

  return {
    UPDATED,
    TOTAL_JOBS:     jobRows.length,
    TOTAL_SKILLS,
    TOTAL_AI_TOOLS: ai.aiTools.length,
    SKILLS_TOP10, CATEGORY_DIST, EXP_DIST, RECENT_TRENDS,
    AI_TOOLS:    ai.aiTools,
    AI_CATEGORY: ai.aiCategory,
    AI_BY_ROLE:  ai.aiByRole,
    AI_REQ_PREF: ai.aiReqPref,
    RECOMMEND_ROLES, RECOMMEND_JOBS,
  };
};

// ─── Stack Match (skill-based job scoring) ──────────────────────────
// Given the user's skills/exp/region, scan TSI_RAW.jobRows and score each job
// by how many of the user's skills appear in (requirements + preferred +
// tech_stack). Returns top jobs sorted by hits and aggregated role buckets.
window.TSI_MATCH = function ({ skills = [], exp = null, region = null } = {}) {
  const raw = window.TSI_RAW;
  if (!raw || !raw.jobRows) return { ROLES: [], JOBS: [] };

  const userSkills = skills.filter(Boolean);
  if (userSkills.length === 0) return { ROLES: [], JOBS: [] };

  const userSkillsLower = userSkills.map(s => s.toLowerCase());
  const expBucket = exp && exp !== "전체 경력" ? exp : null;
  // 지역 필터: "전국"이나 "원격"은 위치 무시
  const regionLower = region && region !== "전국" && region !== "원격"
    ? region.toLowerCase()
    : null;

  const scored = [];
  for (const j of raw.jobRows) {
    if (expBucket && classifyExp(j.experience_level) !== expBucket) continue;
    if (regionLower && !(j.location || "").toLowerCase().includes(regionLower)) continue;

    const text = `${j.requirements || ""} ${j.preferred || ""} ${j.tech_stack || ""} ${j.title || ""} ${j.position || ""}`.toLowerCase();
    let hits = 0;
    for (const s of userSkillsLower) {
      if (s && text.includes(s)) hits += 1;
    }
    if (hits === 0) continue;

    // 매칭률 = 사용자 스킬 중 몇 %가 공고에 나오는가 (최대 99%로 캡)
    const matchPct = Math.min(99, Math.round((hits / userSkillsLower.length) * 100));
    scored.push({ job: j, hits, matchPct });
  }

  scored.sort((a, b) => b.hits - a.hits || b.matchPct - a.matchPct);

  const JOBS = scored.slice(0, 5).map(s => {
    const techList = (s.job.tech_stack || "").toString()
      .split(/[,\s]+/).filter(Boolean).slice(0, 6);
    return {
      title:    s.job.title || s.job.position || "(제목 없음)",
      role:     classifyPos(s.job.position),
      company:  s.job.company || "—",
      location: s.job.location || "—",
      exp:      s.job.experience_level || "경력 무관",
      match:    s.matchPct,
      skills:   techList,
      bullets: [
        (s.job.requirements || "").replace(/\s+/g, " ").slice(0, 80) || "자격요건 미공개",
        (s.job.preferred    || "").replace(/\s+/g, " ").slice(0, 80) || "우대사항 미공개",
      ],
    };
  });

  // 직무별 평균 매칭률 + 공고 수
  const roleMap = {};
  for (const s of scored) {
    const role = classifyPos(s.job.position);
    if (!roleMap[role]) roleMap[role] = { sum: 0, count: 0 };
    roleMap[role].sum   += s.matchPct;
    roleMap[role].count += 1;
  }
  const ROLES = Object.entries(roleMap)
    .map(([role, { sum, count }]) => ({
      role,
      match: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.match - a.match || b.count - a.count)
    .slice(0, 5);

  return { ROLES, JOBS };
};

// ─── Loader (called once at boot) ────────────────────────────────────
async function fetchAllPaged(sb, table, columns, pageSize = 1000) {
  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(columns).range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

window.TSI_LOAD = async function () {
  if (!window.supabase) {
    console.warn("[data.js] Supabase SDK not loaded — using mock fallback");
    return { ...MOCK_TSI_DATA };
  }
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const [skillRows, jobRows] = await Promise.all([
      sb.from("skill_analysis").select("*").then(r => {
        if (r.error) throw r.error;
        return r.data || [];
      }),
      fetchAllPaged(sb, "raw_job_postings",
        "id, title, company, position, experience_level, requirements, preferred, tech_stack, location, source, crawled_at"),
    ]);

    window.TSI_RAW = { skillRows, jobRows };
    return window.TSI_AGGREGATE();
  } catch (err) {
    console.error("[data.js] fetch failed:", err);
    return { ...MOCK_TSI_DATA };
  }
};
