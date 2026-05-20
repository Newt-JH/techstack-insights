// AI Trends section

function AISection() {
  const [filterRole, setFilterRole] = useState("전체 직무");
  const [filterExp, setFilterExp]   = useState("전체 경력");

  const D = useMemo(() => {
    if (window.TSI_AGGREGATE && window.TSI_RAW) {
      return window.TSI_AGGREGATE({ role: filterRole, exp: filterExp });
    }
    return window.TSI_DATA;
  }, [filterRole, filterExp]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <FilterBar role={filterRole} setRole={setFilterRole} exp={filterExp} setExp={setFilterExp}
        rightSlot={
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
            <span style={{
              width: 5, height: 5, borderRadius: 99, background: "var(--cat-ai)",
              boxShadow: "0 0 6px var(--cat-ai)", animation: "pulseDot 2.5s infinite",
            }} />
            <span className="tnum" style={{ color: "var(--text-2)", fontWeight: 600 }}>{D.TOTAL_AI_TOOLS}</span>개 AI 도구 분석
          </div>
        } />

      <div className="grid-2col">
        <Card title="AI 도구 언급 빈도" sub="채용공고에서 언급된 AI 관련 기술 TOP 10"
          action={<Tag kind="ai">AI/ML</Tag>} accent>
          <div>
            {D.AI_TOOLS.length === 0 ? (
              <EmptyChart label="조건에 해당하는 AI 도구 언급이 없습니다" />
            ) : (
              D.AI_TOOLS.map((t) => (
                <HBar key={t.name}
                  rank={t.rank} label={t.name}
                  sub={<Tag kind={TAG_KIND[t.tag]}>{t.tag}</Tag>}
                  value={t.count} max={D.AI_TOOLS[0].count} count={t.count}
                  color={`var(--cat-${t.cat})`} trend={t.trend} />
              ))
            )}
          </div>
        </Card>

        <Card title="AI 카테고리 분포" sub="AI 도구 유형별 비중" accent>
          {D.AI_CATEGORY.length === 0 ? (
            <EmptyChart label="데이터 없음" />
          ) : (
            <Donut data={D.AI_CATEGORY} size={200} thickness={26}
              label={D.AI_CATEGORY.length} sublabel="AI 도구 유형" />
          )}
        </Card>
      </div>

      <div className="grid-2col-equal">
        <Card title="직무별 AI 요구 현황" sub="어떤 직무에서 AI를 많이 요구하는가" accent>
          {D.AI_BY_ROLE.length === 0 ? (
            <EmptyChart label="데이터 없음" />
          ) : (
            <VBars data={D.AI_BY_ROLE} height={240} labelKey="role"
              colorFn={(i) => {
                if (i === 0) return "#c084fc";
                if (i < 3) return "#a78bfa";
                if (i < 6) return "#7c5cff";
                return "#5b21b6";
              }} />
          )}
        </Card>

        <Card title="필수 vs 우대 비율" sub="AI 도구가 필수인지 우대인지"
          action={<Legend items={[
            { color: "var(--req)",  label: "필수" },
            { color: "var(--pref)", label: "우대" },
          ]}/>} accent>
          <div>
            {D.AI_REQ_PREF.length === 0 ? (
              <EmptyChart label="데이터 없음" />
            ) : (
              D.AI_REQ_PREF.map(t => (
                <ReqPrefBar key={t.name}
                  name={t.name} count={t.count}
                  required={t.required} preferred={t.preferred}
                  tag={t.tag} max={D.AI_REQ_PREF[0].count} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

window.AISection = AISection;
