// Stack Match section

function MatchSection() {
  const [exp, setExp] = useState("전체 경력");
  const [region, setRegion] = useState("전국");
  const [skills, setSkills] = useState(["AWS", "Python"]);
  const [skillInput, setSkillInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ ROLES: [], JOBS: [] });

  const SUGGESTIONS = ["Python", "Java", "AWS", "Docker", "Kubernetes", "Spring", "React", "Vue", "Go", "SQL", "GCP", "TypeScript"];

  const addSkill = (s) => {
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };
  const removeSkill = (s) => setSkills(skills.filter(x => x !== s));

  // Run an initial match against the default skills once data is ready,
  // so the section isn't empty on first visit.
  useEffect(() => {
    if (window.TSI_MATCH && window.TSI_RAW) {
      setResults(window.TSI_MATCH({ skills, exp, region }));
      setSubmitted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    setLoading(true);
    setSubmitted(false);
    setTimeout(() => {
      const next = window.TSI_MATCH
        ? window.TSI_MATCH({ skills, exp, region })
        : { ROLES: [], JOBS: [] };
      setResults(next);
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card title="Stack Match" sub="보유 스킬과 경력을 입력하면 적합한 직무와 회사를 추천해드립니다"
        action={<Tag kind="cloud">AI 매칭</Tag>} accent>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <Field label="경력">
            <select className="tsi-select" value={exp} onChange={(e) => setExp(e.target.value)}>
              {["전체 경력", "신입", "1–3년", "3–5년", "5–10년", "10년+"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="지역">
            <select className="tsi-select" value={region} onChange={(e) => setRegion(e.target.value)}>
              {["전국", "서울", "경기", "부산", "대전", "원격"].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="보유 스킬 추가">
            <input className="tsi-input"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput.trim())}
              placeholder="예: Python, AWS..." />
          </Field>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {skills.map(s => <SkillChip key={s} label={s} onRemove={() => removeSkill(s)} />)}
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", marginRight: 4 }}>추천:</span>
          {SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 8).map(s => (
            <button key={s} onClick={() => addSkill(s)}
              style={{
                padding: "4px 10px", borderRadius: 99, fontSize: 11,
                background: "transparent", border: "1px dashed var(--border-hi)",
                color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit",
                transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; e.currentTarget.style.borderStyle = "solid"; e.currentTarget.style.transform = "translateY(-2px) scale(1.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderStyle = "dashed"; e.currentTarget.style.transform = "scale(1)"; }}>
              + {s}
            </button>
          ))}
        </div>

        <button className="btn-primary" style={{ marginTop: 18 }} onClick={(e) => { addRipple(e); submit(); }}>
          공고 추천받기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </Card>

      {loading && <LoadingPanel />}

      {submitted && !loading && results.JOBS.length === 0 && (
        <Card accent>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "32px 0", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>조건에 맞는 공고가 없습니다</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
              보유 스킬을 더 추가하거나, 경력·지역 필터를 완화해 보세요.
            </div>
          </div>
        </Card>
      )}

      {submitted && !loading && results.JOBS.length > 0 && (
        <>
          <Card title="추천 직무" sub="입력한 스킬과의 매칭률 순"
            action={<Tag kind="tool">{results.JOBS.length}건</Tag>} accent>
            <div>
              {results.ROLES.map((r, i) => (
                <RoleMatchBar key={r.role} role={r.role} match={r.match} count={r.count} delay={i * 0.06} />
              ))}
            </div>
          </Card>

          <Card title="매칭 공고 목록" sub="보유 스킬이 가장 많이 일치한 공고" accent>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.JOBS.map((j, i) => (
                <JobCard key={`${j.title}-${i}`} job={j} delay={i * 0.04} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      {children}
    </div>
  );
}

function SkillChip({ label, onRemove }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 4px 4px 10px", borderRadius: 99,
      background: "rgba(124,92,255,.14)",
      border: "1px solid rgba(124,92,255,.3)",
      color: "var(--brand)",
      fontSize: 12, fontWeight: 600,
      animation: "fadeIn .25s",
    }}>
      {label}
      <button onClick={onRemove} aria-label="Remove" style={{
        width: 18, height: 18, borderRadius: 99, border: "none",
        background: "rgba(255,255,255,.08)", color: "var(--brand)",
        cursor: "pointer", fontSize: 11, lineHeight: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>×</button>
    </span>
  );
}

function LoadingPanel() {
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
        <div className="tsi-spinner" />
        <div style={{ fontSize: 14, fontWeight: 600 }}>공고를 분석하는 중…</div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>스킬 매칭 중…</div>
      </div>
    </Card>
  );
}

function RoleMatchBar({ role, match, count, delay }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} style={{
      display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14,
      alignItems: "center", padding: "10px 0",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{role}</div>
        <div style={{ height: 8, background: "var(--bg-3)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${match}%`,
            background: "linear-gradient(90deg, var(--brand) 0%, var(--brand-2) 100%)",
            borderRadius: 99,
            boxShadow: "0 0 14px rgba(124,92,255,.5)",
            transform: seen ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: `transform 1.0s cubic-bezier(.22,1,.36,1) ${delay}s`,
          }} />
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", minWidth: 44, textAlign: "right" }}>
        {match}%
      </div>
      <div className="tnum" style={{ fontSize: 12, color: "var(--text-3)", minWidth: 36, textAlign: "right" }}>
        {count}건
      </div>
    </div>
  );
}

function JobCard({ job, delay }) {
  const [ref, seen] = useInView();
  return (
    <div ref={ref} style={{
      padding: 16, borderRadius: 14,
      background: "var(--bg-2)", border: "1px solid var(--border)",
      opacity: seen ? 1 : 0,
      transform: seen ? "translateY(0)" : "translateY(8px)",
      transition: `all .6s cubic-bezier(.22,1,.36,1) ${delay}s, border-color .2s, background .2s`,
      cursor: "pointer",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--bg-3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-2)"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{job.title}</h3>
            <Tag kind="language">{job.role}</Tag>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
            {job.company} · {job.location} · {job.exp}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {job.skills.map(s => (
              <span key={s} style={{
                padding: "3px 9px", borderRadius: 6, fontSize: 11,
                background: "var(--bg-3)", color: "var(--text-2)",
                border: "1px solid var(--border)", fontWeight: 600,
              }} className="mono">{s}</span>
            ))}
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 16px", color: "var(--text-2)", fontSize: 12, lineHeight: 1.7 }}>
            {job.bullets.slice(0, 3).map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
        <div style={{ textAlign: "center", flex: "0 0 auto" }}>
          <MatchRing pct={job.match} />
          <button className="btn-ghost" style={{ marginTop: 12 }}>공고 보기 →</button>
        </div>
      </div>
    </div>
  );
}

function MatchRing({ pct }) {
  const [ref, seen] = useInView();
  const r = 24, c = 2 * Math.PI * r;
  return (
    <div ref={ref} style={{ position: "relative", width: 60, height: 60, margin: "0 auto" }}>
      <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="4" />
        <circle cx="30" cy="30" r={r} fill="none"
          stroke="url(#mr-grad)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${seen ? (c * pct) / 100 : 0} ${c}`}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.22,1,.36,1)", filter: "drop-shadow(0 0 4px rgba(124,92,255,.5))" }} />
        <defs>
          <linearGradient id="mr-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--brand)" />
            <stop offset="1" stopColor="var(--brand-2)" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div className="tnum" style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)" }}>{pct}%</div>
        <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: -2 }}>매칭</div>
      </div>
    </div>
  );
}

Object.assign(window, { MatchSection, Field, SkillChip, LoadingPanel, RoleMatchBar, JobCard, MatchRing });
