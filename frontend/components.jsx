// Shared chart primitives & UI atoms

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ────────── In-view hook ────────── */
function useInView(opts = { threshold: 0.15, once: true }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    // Animate after a small delay so transitions are visible.
    // We don't gate on actual viewport intersection — IntersectionObserver
    // is unreliable inside this iframe context.
    const t = setTimeout(() => setSeen(true), 80);
    return () => clearTimeout(t);
  }, []);
  return [ref, seen];
}

/* ────────── Magnetic card hover (spotlight + tilt) ────────── */
function useMagnetic(maxTilt = 4) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const onMove = (e) => {
      // Skip while reveal animation hasn't yet committed `in`
      if (el.classList.contains("armed") && !el.classList.contains("in")) return;
      // Skip if reveal transition is mid-flight (very recent .in)
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const px = x / r.width;
      const py = y / r.height;
      el.style.setProperty("--mx", x + "px");
      el.style.setProperty("--my", y + "px");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const tx = (px - 0.5) * maxTilt * 2;
        const ty = (0.5 - py) * maxTilt * 2;
        el.style.transform = `translateY(-4px) perspective(900px) rotateX(${ty}deg) rotateY(${tx}deg)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [maxTilt]);
  return ref;
}

/* ────────── Ripple click ────────── */
function addRipple(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(r.width, r.height);
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = (e.clientX - r.left - size / 2) + "px";
  ripple.style.top = (e.clientY - r.top - size / 2) + "px";
  el.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

/* ────────── Animated number with wobble ────────── */
function AnimatedNumber({ value, duration = 1100, format = (n) => n.toLocaleString() }) {
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let start;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setN(Math.round(value * ease(p)));
      if (p < 1) requestAnimationFrame(step);
      else setDone(true);
    };
    const t = setTimeout(() => requestAnimationFrame(step), 200);
    return () => clearTimeout(t);
  }, [value]);
  return <span className="tnum" style={{
    display: "inline-block",
    animation: done ? "wobble .6s cubic-bezier(.34,1.56,.64,1)" : "none",
    transformOrigin: "center",
  }}>{format(n)}</span>;
}

/* ────────── Tag pill ────────── */
const TAG_KIND = {
  "도구": "tool", "기법": "method", "프레임워크": "framework", "API/플랫폼": "api",
  "언어": "language", "클라우드/인프라": "cloud", "트렌드/MLOps": "method",
  "AI/데이터": "ai", "기타": "other",
};

function Tag({ kind, children }) {
  const map = {
    language:  { fg: "var(--cat-language)",  bgVar: "124,92,255"  },
    cloud:     { fg: "var(--cat-cloud)",     bgVar: "34,211,238"  },
    tool:      { fg: "var(--cat-tool)",      bgVar: "163,230,53"  },
    framework: { fg: "var(--cat-framework)", bgVar: "244,114,182" },
    method:    { fg: "var(--cat-method)",    bgVar: "251,191,36"  },
    api:       { fg: "var(--cat-api)",       bgVar: "251,113,133" },
    other:     { fg: "var(--text-2)",        bgVar: "108,114,135" },
    ai:        { fg: "var(--cat-ai)",        bgVar: "192,132,252" },
  };
  const s = map[kind] || map.other;
  return (
    <span className="pill" style={{
      background: `rgba(${s.bgVar}, .14)`,
      color: s.fg,
      border: `1px solid rgba(${s.bgVar}, .3)`,
    }}>{children}</span>
  );
}

/* ────────── Trend chip ────────── */
function TrendChip({ value }) {
  const up = value >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 10, fontWeight: 700,
      color: up ? "var(--brand-3)" : "var(--cat-api)",
    }} className="tnum">
      <svg width="9" height="9" viewBox="0 0 12 12" style={{ transform: up ? "none" : "rotate(180deg)" }}>
        <path d="M6 2 L10 8 L2 8 Z" fill="currentColor" />
      </svg>
      {up ? "+" : ""}{value}%
    </span>
  );
}

/* ────────── Card ────────── */
function Card({ title, sub, action, children, padding = 22, style = {}, accent = false, magnetic = true }) {
  const ref = useMagnetic(magnetic ? 3 : 0);
  return (
    <section ref={magnetic ? ref : null} className="tsi-card reveal" style={{ padding, ...style }}>
      {accent && <span className="corner-mark" />}
      {(title || action) && (
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 18, gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{title}</div>}
            {sub && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ────────── HBar (animated rank list row) ────────── */
function HBar({ label, value, max, count, color = "var(--brand)", rank, sub, trend }) {
  const [ref, seen] = useInView();
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div ref={ref} style={{
      display: "grid",
      gridTemplateColumns: rank ? "22px 1fr auto" : "1fr auto",
      alignItems: "center", gap: 12, padding: "9px 0",
    }}>
      {rank && <div className="tnum mono" style={{ color: "var(--text-3)", fontSize: 11, fontWeight: 600 }}>
        {String(rank).padStart(2, "0")}
      </div>}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap",
          fontSize: 13, fontWeight: 600, color: "var(--text-1)",
        }}>
          {label}
          {sub}
          {trend != null && <TrendChip value={trend} />}
        </div>
        <div style={{
          height: 6, background: "var(--bg-3)", borderRadius: 99, overflow: "hidden", position: "relative",
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
            borderRadius: 99,
            transform: seen ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 1.1s cubic-bezier(.22,1,.36,1)",
            boxShadow: `0 0 12px ${color}55`,
          }} />
          {/* Shimmer overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.18) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: seen ? "shimmer 2.4s ease-in-out infinite" : "none",
            opacity: 0.4,
            width: `${pct}%`,
            borderRadius: 99,
          }} />
        </div>
      </div>
      <div className="tnum" style={{
        textAlign: "right", color: "var(--text-2)",
        fontSize: 12, fontWeight: 600, minWidth: 56,
      }}>
        {count != null ? count.toLocaleString() : Math.round(pct) + "%"}
      </div>
    </div>
  );
}

/* ────────── Required vs Preferred bar ────────── */
function ReqPrefBar({ name, count, required, preferred, tag, max }) {
  const [ref, seen] = useInView();
  const totalPct = max ? (count / max) * 100 : 100;
  return (
    <div ref={ref} style={{ padding: "10px 0" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6, fontSize: 13, gap: 8, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{name}</span>
          {tag && <Tag kind={TAG_KIND[tag]}>{tag}</Tag>}
        </div>
        <span className="tnum" style={{ color: "var(--text-2)", fontSize: 12, fontWeight: 600 }}>
          {count.toLocaleString()}건
        </span>
      </div>
      <div style={{
        display: "flex", height: 8, borderRadius: 99, overflow: "hidden",
        background: "var(--bg-3)", width: `${totalPct}%`,
        transform: seen ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
        transition: "transform 1.0s cubic-bezier(.22,1,.36,1)",
      }}>
        <div style={{ width: `${required}%`, background: "var(--req)" }} />
        <div style={{ width: `${preferred}%`, background: "var(--pref)" }} />
      </div>
      <div className="tnum" style={{
        display: "flex", gap: 12, marginTop: 4,
        fontSize: 11, color: "var(--text-3)",
      }}>
        <span>필수 {required}%</span>
        <span>우대 {preferred}%</span>
      </div>
    </div>
  );
}

/* ────────── Donut ────────── */
function Donut({ data, size = 200, thickness = 26, label, sublabel }) {
  const [ref, seen] = useInView();
  const [hover, setHover] = useState(null);
  const r = size / 2 - thickness / 2 - 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const stroke = `var(--cat-${d.color})`;
            const seg = (
              <circle
                key={i} cx={size/2} cy={size/2} r={r}
                fill="none" stroke={stroke} strokeWidth={hover === i ? thickness + 6 : thickness}
                strokeDasharray={`${seen ? len : 0} ${c}`}
                strokeDashoffset={-off}
                style={{
                  transition: `stroke-dasharray 1.0s cubic-bezier(.22,1,.36,1) ${i * 0.08}s, opacity .2s, filter .2s, stroke-width .25s cubic-bezier(.34,1.56,.64,1)`,
                  opacity: hover == null || hover === i ? 1 : 0.3,
                  filter: hover === i ? `drop-shadow(0 0 14px ${stroke})` : "none",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
            off += len;
            return seg;
          })}
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          transition: "transform .3s cubic-bezier(.34,1.56,.64,1)",
          transform: hover != null ? "scale(1.08)" : "scale(1)",
        }}>
          <div className="tnum" style={{ fontSize: 26, fontWeight: 700 }}>
            {hover != null ? data[hover].value.toFixed(1) + "%" : label}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, textAlign: "center" }}>
            {hover != null ? data[hover].name : sublabel}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 130 }}>
        {data.map((d, i) => (
          <div key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, cursor: "pointer",
              opacity: hover == null || hover === i ? 1 : 0.5,
              transition: "opacity .15s, transform .25s cubic-bezier(.34,1.56,.64,1)",
              transform: hover === i ? "translateX(4px)" : "translateX(0)",
            }}>
            <span style={{
              width: 10, height: 10, borderRadius: 3,
              background: `var(--cat-${d.color})`,
              boxShadow: `0 0 8px var(--cat-${d.color})`,
              transition: "transform .25s cubic-bezier(.34,1.56,.64,1)",
              transform: hover === i ? "scale(1.5) rotate(45deg)" : "scale(1)",
            }} />
            <span style={{ flex: 1, color: "var(--text-2)" }}>{d.name}</span>
            <span className="tnum" style={{ color: "var(--text-1)", fontWeight: 600 }}>
              {d.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────── Vertical bars (with hover tooltip) ────────── */
function VBars({ data, height = 220, colorFn, labelKey = "label" }) {
  const [ref, seen] = useInView();
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map(d => d.value));
  return (
    <div ref={ref} style={{
      display: "flex", alignItems: "flex-end", gap: 6,
      height, padding: "8px 0", position: "relative",
    }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 50);
        const color = colorFn ? colorFn(i, d) : "var(--brand)";
        const isHover = hover === i;
        return (
          <div key={i} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, minWidth: 0, position: "relative",
          }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={addRipple}>
            {isHover && (
              <div className="chart-tip show" style={{ left: "50%", top: 0 }}>
                <strong className="tnum">{d.value.toLocaleString()}</strong>
                <span style={{ color: "var(--text-3)", marginLeft: 4 }}>건</span>
              </div>
            )}
            <div className="tnum" style={{
              fontSize: 10, color: "var(--text-3)", fontWeight: 600,
              opacity: seen && !isHover ? 1 : isHover ? 0 : 0,
              transition: `opacity .4s ${0.3 + i * 0.05}s`,
            }}>
              {d.value.toLocaleString()}
            </div>
            <div style={{
              width: "100%", maxWidth: 36,
              height: seen ? h : 0,
              background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
              borderRadius: "6px 6px 2px 2px",
              boxShadow: isHover ? `0 0 22px ${color}, 0 0 8px ${color}` : `0 0 8px ${color}55`,
              transition: `height 0.9s cubic-bezier(.34,1.56,.64,1) ${i * 0.05}s, box-shadow .25s, transform .3s cubic-bezier(.34,1.56,.64,1)`,
              transform: isHover ? "scaleY(1.08) scaleX(1.1) translateY(-3px)" : "scaleY(1)",
              transformOrigin: "bottom",
              cursor: "pointer",
              position: "relative", overflow: "hidden",
            }} />
            <div style={{
              fontSize: 10, color: isHover ? "var(--text-1)" : "var(--text-3)",
              textAlign: "center", maxWidth: 60,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              transition: "color .15s, transform .25s cubic-bezier(.34,1.56,.64,1)",
              transform: data.length > 6
                ? `rotate(-22deg) translate(-2px, 4px)${isHover ? " scale(1.1)" : ""}`
                : isHover ? "scale(1.1)" : "scale(1)",
              transformOrigin: "center",
              width: data.length > 6 ? 50 : "auto",
              fontWeight: isHover ? 700 : 500,
            }}>{d[labelKey] || d.role}</div>
          </div>
        );
      })}
    </div>
  );
}

/* Expose to global */
Object.assign(window, {
  useInView, useMagnetic, addRipple,
  AnimatedNumber, Tag, TAG_KIND, TrendChip,
  HBar, ReqPrefBar, Donut, VBars, Card,
});
