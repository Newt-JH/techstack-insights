// Main App
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark"
}/*EDITMODE-END*/;

function App() {
  const [tab, setTab] = useState("dashboard");
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const theme = tweaks.theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const map = { "dashboard-section": "dashboard", "recommend-section": "match", "ai-section": "ai" };
    const apply = () => {
      const h = location.hash.replace("#", "");
      if (map[h]) setTab(map[h]);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // Re-run reveal observer on tab change
  useEffect(() => {
    setTimeout(() => setupReveal(), 50);
  }, [tab]);

  const setTheme = (t) => setTweak("theme", t);

  return (
    <>
      <div aria-hidden style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "var(--bg-aurora)",
        animation: "meshShift 24s ease-in-out infinite",
      }} />
      <FXLayer />

      <div style={{ position: "relative", zIndex: 3, minHeight: "100vh" }}>
        <Header tab={tab} setTab={setTab} theme={theme} setTheme={setTheme} />
        <HeroBanner tab={tab} />
        <main data-screen-label={
          tab === "dashboard" ? "01 Market Trends" :
          tab === "match" ? "02 Stack Match" : "03 AI Trends"
        } style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 22px" }}>
          {tab === "dashboard" && <DashboardSection />}
          {tab === "match" && <MatchSection />}
          {tab === "ai" && <AISection />}
        </main>
        <Footer />
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            value={theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "dark",  label: "🌙 Dark" },
              { value: "light", label: "☀️ Light" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Tip">
          <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
            우측 상단의 테마 버튼으로도 토글할 수 있어요.
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}
