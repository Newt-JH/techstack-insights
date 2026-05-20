// Dashboard section (Market Trends)

function DashboardSection() {
  const [filterRole, setFilterRole] = useState("전체 직무");
  const [filterExp, setFilterExp]   = useState("전체 경력");

  // Re-aggregate against TSI_RAW whenever a filter changes. Falls back to
  // the boot snapshot if TSI_RAW is missing (Supabase fetch failed at boot).
  const D = useMemo(() => {
    if (window.TSI_AGGREGATE && window.TSI_RAW) {
      return window.TSI_AGGREGATE({ role: filterRole, exp: filterExp });
    }
    return window.TSI_DATA;
  }, [filterRole, filterExp]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FilterBar role={filterRole} setRole={setFilterRole} exp={filterExp} setExp={setFilterExp}
        rightSlot={<TrendingMini items={D.RECENT_TRENDS.slice(0, 3)} />} />

      {/* TOP10 + Donut */}
      <div className="grid-2col">
        <Card title="필수 스킬 TOP 10" sub="언급 빈도 기준 상위 기술 스택"
          action={<Tag kind="language">필수 스킬</Tag>} accent>
          <div>
            {D.SKILLS_TOP10.length === 0 ? (
              <EmptyChart label="조건에 해당하는 스킬 데이터가 없습니다" />
            ) : (
              D.SKILLS_TOP10.map((s, i) => (
                <HBar key={s.name}
                  rank={i + 1} label={s.name}
                  value={s.count} max={D.SKILLS_TOP10[0].count} count={s.count}
                  color={`var(--cat-${s.cat})`} trend={s.trend} />
              ))
            )}
          </div>
        </Card>

        <Card title="스킬 카테고리 비중" sub="카테고리별 기술 요구 분포" accent>
          {D.CATEGORY_DIST.length === 0 ? (
            <EmptyChart label="데이터 없음" />
          ) : (
            <Donut data={D.CATEGORY_DIST} size={200} thickness={26}
              label={D.CATEGORY_DIST.length} sublabel="총 카테고리" />
          )}
        </Card>
      </div>

      {/* Required vs Preferred + Experience */}
      <div className="grid-2col">
        <Card title="필수 vs 우대 비교" sub="스킬 요구 유형별 비율"
          action={<Legend items={[
            { color: "var(--req)",  label: "필수" },
            { color: "var(--pref)", label: "우대" },
          ]}/>} accent>
          <div>
            {D.SKILLS_TOP10.length < 2 ? (
              <EmptyChart label="데이터 없음" />
            ) : (
              D.SKILLS_TOP10.slice(1, 7).map((s) => (
                <ReqPrefBar key={s.name}
                  name={s.name} count={s.count}
                  required={s.required} preferred={s.preferred}
                  tag={s.cat === "language" ? "언어" : s.cat === "cloud" ? "클라우드/인프라" : s.cat === "tool" ? "도구" : "프레임워크"}
                  max={D.SKILLS_TOP10[1].count}
                />
              ))
            )}
          </div>
        </Card>

        <Card title="경력별 분포" sub="신입 / 경력별 공고 비율" accent>
          <VBars data={D.EXP_DIST} height={240}
            colorFn={(i) => {
              const palette = ["#5b21b6", "#7c5cff", "#22d3ee", "#67e8f9", "#a3e635"];
              return palette[i] || "var(--brand)";
            }}
          />
        </Card>
      </div>
    </div>
  );
}

function FilterBar({ role, setRole, exp, setExp, rightSlot }) {
  return (
    <div className="reveal" style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "12px 16px", borderRadius: 14,
      background: "var(--surface)", border: "1px solid var(--border)",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-2)", fontSize: 12, fontWeight: 600 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        필터
      </div>
      <select className="tsi-select" value={role} onChange={(e) => setRole(e.target.value)}>
        {["전체 직무", "백엔드", "프론트엔드", "AI/데이터", "DevOps", "모바일"].map(o => <option key={o}>{o}</option>)}
      </select>
      <select className="tsi-select" value={exp} onChange={(e) => setExp(e.target.value)}>
        {["전체 경력", "신입", "1–3년", "3–5년", "5–10년", "10년+"].map(o => <option key={o}>{o}</option>)}
      </select>
      {rightSlot && <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>{rightSlot}</div>}
    </div>
  );
}

function TrendingMini({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--text-3)", flexWrap: "wrap" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{
          width: 5, height: 5, borderRadius: 99, background: "var(--brand-3)",
          boxShadow: "0 0 6px var(--brand-3)", animation: "pulseDot 2.5s infinite",
        }} />
        TRENDING NOW
      </span>
      {items.map(it => (
        <span key={it.label} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-2)", fontWeight: 600 }}>
          {it.label}
          <TrendChip value={it.change} />
        </span>
      ))}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {items.map(it => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-2)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: it.color, boxShadow: `0 0 6px ${it.color}` }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div style={{
      padding: "32px 0", textAlign: "center",
      fontSize: 12, color: "var(--text-3)",
    }}>{label}</div>
  );
}

Object.assign(window, { DashboardSection, FilterBar, TrendingMini, Legend, EmptyChart });
