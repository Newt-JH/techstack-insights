// Reveal-on-scroll intersection observer (progressive enhancement)
function setupReveal() {
  const els = Array.from(document.querySelectorAll(".reveal"));
  els.forEach((el, i) => {
    if (el.classList.contains("in")) return;
    el.classList.add("armed");
    // small per-card stagger so adjacent cards pop in sequence
    el._revealIdx = i;
  });

  // Try IntersectionObserver — when it fires, add .in with a brief stagger
  // so multiple cards entering at once still cascade.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      // entries that are visible right now
      const visible = entries.filter(e => e.isIntersecting);
      visible.forEach((e, k) => {
        const el = e.target;
        const delay = Math.min(k, 8) * 70;
        setTimeout(() => el.classList.add("in"), delay);
        io.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => { if (!el.classList.contains("in")) io.observe(el); });
  }

  // Hard fallback: if IO never fires (some iframe contexts), force-reveal after 600ms.
  // Cards that already got `.in` from the observer are skipped.
  setTimeout(() => {
    els.forEach((el, i) => {
      if (el.classList.contains("in")) return;
      const delay = Math.min(i, 8) * 70;
      setTimeout(() => el.classList.add("in"), delay);
    });
  }, 600);
}

// Cursor glow + floating particles wrapper
function FXLayer() {
  const ref = useRef(null);
  useEffect(() => {
    const onMove = (e) => {
      if (!ref.current) return;
      ref.current.style.left = e.clientX + "px";
      ref.current.style.top = e.clientY + "px";
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  // small set of drifting particles
  const particles = useMemo(() => Array.from({ length: 14 }).map((_, i) => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 4 + Math.random() * 10,
    color: i % 3 === 0 ? "var(--brand-2)" : i % 3 === 1 ? "var(--brand)" : "var(--brand-3)",
    dx: (Math.random() - 0.5) * 60 + "px",
    dy: (Math.random() - 0.5) * 60 + "px",
    delay: Math.random() * -18,
    dur: 14 + Math.random() * 12,
  })), []);
  return (
    <>
      <div ref={ref} className="cursor-glow" />
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {particles.map((p, i) => (
          <span key={i} className="bg-particle" style={{
            left: p.left + "%", top: p.top + "%",
            width: p.size, height: p.size,
            background: p.color,
            opacity: 0.18,
            "--dx": p.dx, "--dy": p.dy,
            animationDelay: p.delay + "s",
            animationDuration: p.dur + "s",
          }} />
        ))}
      </div>
    </>
  );
}

// Header
function Header({ tab, setTab, theme, setTheme }) {
  const tabs = [
    { id: "dashboard", label: "Market Trends", kr: "시장 동향" },
    { id: "match",     label: "Stack Match",   kr: "스택 매칭" },
    { id: "ai",        label: "AI Trends",     kr: "AI 트렌드" },
  ];
  const [open, setOpen] = useState(false);
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "color-mix(in srgb, var(--bg-0) 78%, transparent)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "12px 22px",
        display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between",
      }}>
        <Logo />
        <nav className="tabs-desktop" style={{
          display: "flex", gap: 4, padding: 4,
          background: "var(--bg-2)", border: "1px solid var(--border)",
          borderRadius: 12, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={(e) => { setTab(t.id); addRipple(e); }}
              style={{
                position: "relative",
                padding: "8px 16px", fontSize: 13, fontWeight: 600,
                background: tab === t.id ? "var(--bg-3)" : "transparent",
                color: tab === t.id ? "var(--text-1)" : "var(--text-3)",
                border: "none", borderRadius: 8,
                cursor: "pointer", transition: "all .3s cubic-bezier(.34,1.56,.64,1)",
                fontFamily: "inherit", whiteSpace: "nowrap",
                overflow: "hidden",
                transform: tab === t.id ? "scale(1.05)" : "scale(1)",
              }}
              onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.transform = "scale(1)"; }}>
              {tab === t.id && (
                <span style={{
                  position: "absolute", left: 12, right: 12, bottom: 4, height: 2,
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  borderRadius: 2, boxShadow: "0 0 12px var(--brand)",
                  animation: "squish 1.6s ease-in-out infinite",
                }} />
              )}
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="live-pill" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 99,
            background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.25)",
            fontSize: 11, fontWeight: 600, color: "var(--brand-2)",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99, background: "var(--brand-2)",
              animation: "pulseDot 2s infinite",
            }} />
            LIVE · {window.TSI_DATA.UPDATED}
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme" className="theme-btn"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--bg-2)", border: "1px solid var(--border)",
              color: "var(--text-2)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .25s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}>
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            )}
          </button>
          <button onClick={() => setOpen(!open)} className="mobile-menu" aria-label="Menu" style={{
            display: "none", width: 36, height: 36, borderRadius: 10,
            background: "var(--bg-2)", border: "1px solid var(--border)",
            color: "var(--text-2)", cursor: "pointer",
            alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-nav" style={{
          padding: "0 22px 14px",
          display: "none", flexDirection: "column", gap: 6,
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setOpen(false); }}
              style={{
                padding: "10px 12px", textAlign: "left",
                background: tab === t.id ? "var(--bg-3)" : "transparent",
                color: tab === t.id ? "var(--text-1)" : "var(--text-2)",
                border: "1px solid var(--border)",
                borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}>{t.label} <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 6 }}>{t.kr}</span></button>
          ))}
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 18px rgba(124,92,255,.5)",
      }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
          <path d="M3 14L8 9L12 13L16 8L21 13" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8" cy="9" r="1.6" fill="white"/>
          <circle cx="12" cy="13" r="1.6" fill="white"/>
          <circle cx="16" cy="8" r="1.6" fill="white"/>
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          TechStack <span style={{
            background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Insights</span>
        </div>
        <div className="logo-sub" style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: 0.4, marginTop: 1, whiteSpace: "nowrap" }}>
          채용공고 기반 기술 트렌드
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix, accent, delta }) {
  const ref = useMagnetic(6);
  return (
    <div ref={ref} className="reveal" style={{
      padding: "14px 18px", borderRadius: 14,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      backdropFilter: "blur(12px)",
      position: "relative", overflow: "hidden",
      cursor: "default",
      transition: "transform .35s cubic-bezier(.34,1.56,.64,1), border-color .25s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hi)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 70, height: 70,
        borderRadius: 99,
        background: accent || "var(--brand)",
        opacity: .14, filter: "blur(20px)",
        animation: "bobble 4s ease-in-out infinite",
      }} />
      <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
          <AnimatedNumber value={value} />
        </div>
        {suffix && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{suffix}</span>}
        {delta != null && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--brand-3)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }} className="tnum">
            <svg width="9" height="9" viewBox="0 0 12 12"><path d="M6 2 L10 8 L2 8 Z" fill="currentColor" /></svg>
            {delta}%
          </span>
        )}
      </div>
    </div>
  );
}

function Footer() {
  const D = window.TSI_DATA;
  return (
    <footer style={{
      maxWidth: 1400, margin: "32px auto 0",
      padding: "20px 22px",
      borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      flexWrap: "wrap", gap: 8,
      fontSize: 12, color: "var(--text-3)",
    }}>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <span>총 분석 공고 <span className="tnum" style={{ color: "var(--text-2)", fontWeight: 600 }}>{D.TOTAL_JOBS.toLocaleString()}건</span></span>
        <span>수집일 <span className="tnum" style={{ color: "var(--text-2)", fontWeight: 600 }}>{D.UPDATED}</span></span>
      </div>
      <div>TechStack Insights · 채용공고 기반 기술 트렌드 분석</div>
    </footer>
  );
}

function HeroBanner({ tab }) {
  const D = window.TSI_DATA;
  const labels = {
    dashboard: { kr: "채용 시장 기술 트렌드", en: "Market Trends", desc: "실시간 채용공고에서 추출한 기술 스택 인사이트" },
    match:     { kr: "Stack Match",       en: "맞춤 직무 추천", desc: "보유 스킬과 경력을 기반으로 적합한 공고를 매칭합니다" },
    ai:        { kr: "AI Tools & Trends", en: "AI 도구 트렌드", desc: "채용공고에서 언급된 AI 도구와 카테고리 분석" },
  };
  const l = labels[tab];
  return (
    <div style={{
      maxWidth: 1400, margin: "0 auto", padding: "28px 22px 0",
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      flexWrap: "wrap", gap: 18,
    }}>
      <div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 99, marginBottom: 10,
          background: "rgba(124,92,255,.1)", border: "1px solid rgba(124,92,255,.25)",
          fontSize: 11, fontWeight: 700, color: "var(--brand)",
          letterSpacing: 0.4, textTransform: "uppercase",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--brand)", boxShadow: "0 0 6px var(--brand)" }} />
          {l.en}
        </div>
        <h1 style={{
          margin: 0, fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800,
          letterSpacing: -1, lineHeight: 1.15,
          display: "inline-block",
          animation: "bounceIn .9s cubic-bezier(.34,1.56,.64,1) both",
        }} key={tab}>{l.kr}</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-3)", fontSize: 14, maxWidth: 560 }}>
          {l.desc}
        </p>
      </div>
      <div className="grid-3col" style={{
        gap: 10, minWidth: 0, flex: "1 1 320px", maxWidth: 480,
      }}>
        <StatCard label="총 공고" value={D.TOTAL_JOBS} suffix="건" accent="var(--brand)" delta={12} />
        <StatCard label="기술 스택" value={D.TOTAL_SKILLS} suffix="개" accent="var(--brand-2)" />
        <StatCard label="AI 도구" value={D.TOTAL_AI_TOOLS} suffix="개" accent="var(--brand-3)" delta={28} />
      </div>
    </div>
  );
}

Object.assign(window, { Header, Logo, StatCard, Footer, HeroBanner, FXLayer, setupReveal });
