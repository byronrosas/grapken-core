import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Github } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
   SVG Icons — unchanged from original data
   ══════════════════════════════════════════════════════════════════════════ */

const IconBlueprint = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4" opacity="0.5" />
  </svg>
);

const IconLink = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H7A5 5 0 017 7h2" />
    <path d="M15 7h2a5 5 0 010 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const IconTask = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 12l2.5 2.5L16 9" />
  </svg>
);

const IconChart = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20h18" />
    <path d="M6 16V10" />
    <path d="M10 16V6" />
    <path d="M14 16V12" />
    <path d="M18 16V8" />
  </svg>
);

const IconTemplate = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v6" />
    <path d="M12 8l-5 4" />
    <path d="M12 8l5 4" />
    <path d="M7 12v4" />
    <path d="M17 12v4" />
    <circle cx="12" cy="2" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="7" cy="16" r="2" />
    <circle cx="17" cy="16" r="2" />
    <path d="M7 18v2M17 18v2" opacity="0.4" />
    <circle cx="7" cy="21" r="1" fill="currentColor" opacity="0.3" />
    <circle cx="17" cy="21" r="1" fill="currentColor" opacity="0.3" />
  </svg>
);

const IconExport = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconCharacter = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" />
    <path d="M5 21v-2a7 7 0 0114 0v2" />
  </svg>
);

const IconMechanic = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const IconLevel = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20" />
    <path d="M2 20l4-8h4l2 4h4l2-8h4" />
  </svg>
);

const IconStory = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    <line x1="9" y1="7" x2="17" y2="7" />
    <line x1="9" y1="11" x2="14" y2="11" />
  </svg>
);

const IconUI = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

const IconEconomy = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9a2.5 2.5 0 00-2.5-2h-1a2.5 2.5 0 000 5h2a2.5 2.5 0 010 5h-1a2.5 2.5 0 01-2.5-2" />
    <line x1="12" y1="5" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="19" />
  </svg>
);

const IconAudio = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const IconScene = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 8h20" />
    <circle cx="6" cy="6" r="0.5" fill="currentColor" />
    <circle cx="9" cy="6" r="0.5" fill="currentColor" />
    <polygon points="10,11 10,18 17,14.5" fill="currentColor" opacity="0.4" />
  </svg>
);

const IconBrain = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 015 5c0 .8-.2 1.5-.5 2.2A4.5 4.5 0 0120 13.5 4.5 4.5 0 0116.8 18c-.5.6-1.3 1-2.1 1.2" />
    <path d="M12 2a5 5 0 00-5 5c0 .8.2 1.5.5 2.2A4.5 4.5 0 004 13.5 4.5 4.5 0 007.2 18c.5.6 1.3 1 2.1 1.2" />
    <path d="M12 2v20" />
    <path d="M8 8.5h3" opacity="0.5" />
    <path d="M13 12h3" opacity="0.5" />
    <path d="M8 15.5h3" opacity="0.5" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Data — all text preserved exactly as original
   ══════════════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: IconBlueprint,
    title: "See the whole battlefield",
    desc: "Every system, character, and mechanic connected on one infinite board.",
    chapter: "I",
  },
  {
    icon: IconLink,
    title: "Connected hierarchy",
    desc: "Link a character to their mechanic. That mechanic to the level that uses it. Connections are first-class, not an afterthought.",
    chapter: "II",
  },
  {
    icon: IconTask,
    title: "Design and track in the same breath",
    desc: "Every node has its own task list. Estimates, priorities, Kanban view — all in one place. No more switching between tools.",
    chapter: "III",
  },
  {
    icon: IconChart,
    title: "Know when you'll ship",
    desc: "Velocity tracking and scope-creep detection built-in. Your doc tells you the truth.",
    chapter: "IV",
  },
  {
    icon: IconTemplate,
    title: "Templates & inheritance",
    desc: "Define once. Reuse everywhere. Change the template — every instance updates instantly.",
    chapter: "V",
  },
  {
    icon: IconExport,
    title: "Own your data",
    desc: "Markdown, PDF, or .grapken files. You build it, you own it.",
    chapter: "VI",
  },
];

const CONTEXTS = [
  { icon: IconCharacter, label: "Character" },
  { icon: IconMechanic, label: "Mechanic" },
  { icon: IconLevel, label: "Level" },
  { icon: IconStory, label: "Story" },
  { icon: IconUI, label: "UI" },
  { icon: IconEconomy, label: "Economy" },
  { icon: IconAudio, label: "Audio" },
  { icon: IconScene, label: "Scene" },
];

const FOR_WHO = [
  { role: "For the Overwhelmed Jammer", desc: "You have 48 hours and a brain full of mechanics. Dump it on the blueprint. Connect what matters. Forget the rest." },
  { role: 'For the "Lazy" Genius', desc: "You hate formatting docs. But you love designing. Grapken handles the structure so you can handle the art." },
  { role: "For the Aspiring Pro", desc: "Look like a lead designer from day one. Connected systems, living GDDs, and clear forecasts—without the paperwork." },
  { role: "For the Narrative Designer", desc: "Characters, arcs, scenes. All mapped. All connected. Always in sync." },
];

const GITHUB_URL = "https://github.com/byronrosas/grapken-core";

const FREE_FEATURES = [
  "Unlimited projects",
  "Full blueprint & widget system",
  "Tasks, estimates & forecasting",
  "Export to Markdown, PDF & image",
  ".grapken project files",
  "Runs 100% in your browser",
  "Open source (AGPL-3.0)",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Cloud sync & backup",
  "Team collaboration",
  "Version history",
  "Custom contexts & themes",
  "AI assistant with full blueprint context",
  "Priority support",
];

/* ══════════════════════════════════════════════════════════════════════════
   Hooks & utilities
   ══════════════════════════════════════════════════════════════════════════ */

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function useCountUp(target: number, duration = 2000, active = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration, active]);
  return value;
}

/* ── IntersectionObserver reveal ── */
function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVis(true), delay);
          obs.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  const dir = {
    up: vis ? "translate-y-0" : "translate-y-8",
    left: vis ? "translate-x-0" : "-translate-x-8",
    right: vis ? "translate-x-0" : "translate-x-8",
    none: "",
  }[direction];

  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${vis ? "opacity-100" : "opacity-0"} ${dir} ${className}`}>
      {children}
    </div>
  );
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.unobserve(el); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ══════════════════════════════════════════════════════════════════════════
   Atmospheric layers
   ══════════════════════════════════════════════════════════════════════════ */

function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf: number;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 pointer-events-none z-[2] hidden lg:block"
      style={{
        width: 600,
        height: 600,
        background: "radial-gradient(circle, rgba(124, 58, 237, 0.07) 0%, rgba(139, 92, 246, 0.03) 40%, transparent 70%)",
        willChange: "transform",
        transition: "opacity 0.3s",
      }}
    />
  );
}

function GrainOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[70]"
      style={{
        opacity: 0.018,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
        animation: "landing-grain 8s steps(10) infinite",
      }}
    />
  );
}

/* ── Scroll progress bar at top of page ── */
function ScrollProgressBar() {
  const progress = useScrollProgress();
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[100]">
      <div
        className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400 landing-scroll-progress"
        style={{ transform: `scaleX(${progress})`, transformOrigin: "left" }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Interactive Book spine — the vertical "book spine" that connects chapters
   ══════════════════════════════════════════════════════════════════════════ */

function BookSpine() {
  const progress = useScrollProgress();
  return (
    <div className="fixed left-0 top-0 bottom-0 w-[60px] hidden lg:flex flex-col items-center z-40 pointer-events-none">
      {/* Spine line */}
      <div className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-violet-800/20 to-transparent" style={{ left: "50%" }} />

      {/* Progress fill */}
      <div
        className="absolute top-0 w-[3px] rounded-full"
        style={{
          left: "calc(50% - 1px)",
          height: `${progress * 100}%`,
          background: "linear-gradient(to bottom, rgba(124, 58, 237, 0.8), rgba(139, 92, 246, 0.4))",
          boxShadow: "0 0 20px 2px rgba(124, 58, 237, 0.3)",
          transition: "height 0.15s ease-out",
        }}
      />

      {/* Glowing dot at current position */}
      <div
        className="absolute w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_16px_4px_rgba(124,58,237,0.4)]"
        style={{
          left: "calc(50% - 6px)",
          top: `${progress * 100}%`,
          transition: "top 0.15s ease-out",
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Chapter divider — replaces gradient separators with a "book chapter" feel
   ══════════════════════════════════════════════════════════════════════════ */

function ChapterDivider({ chapter, title }: { chapter: string; title: string }) {
  const { ref, inView } = useInView(0.5);
  return (
    <div ref={ref} className="relative py-12 flex items-center justify-center overflow-hidden">
      {/* Ornamental line left */}
      <div
        className="h-px flex-1 max-w-[200px] origin-right"
        style={{
          background: "linear-gradient(to left, rgba(124, 58, 237, 0.4), transparent)",
          transform: inView ? "scaleX(1)" : "scaleX(0)",
          transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />

      {/* Chapter badge */}
      <div
        className="mx-6 flex items-center gap-3 select-none"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "scale(1)" : "scale(0.8)",
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s",
        }}
      >
        <span className="text-sm font-semibold font-mono text-violet-500 tracking-[0.28em] uppercase">{chapter}</span>
        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_2px_rgba(124,58,237,0.4)]" />
        <span className="text-xs font-mono text-violet-700 tracking-[0.15em] uppercase">{title}</span>
      </div>

      {/* Ornamental line right */}
      <div
        className="h-px flex-1 max-w-[200px] origin-left"
        style={{
          background: "linear-gradient(to right, rgba(124, 58, 237, 0.4), transparent)",
          transform: inView ? "scaleX(1)" : "scaleX(0)",
          transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Live GDD Typewriter — simulates real-time writing in a GDD page
   ══════════════════════════════════════════════════════════════════════════ */

const GDD_LINES = [
  { type: "heading", text: "# Stellar Game" },
  { type: "body", text: "> DEEP SPACE, exploration and survival." },
  { type: "body", text: "> Discover new worlds and civilizations." },
  { type: "divider", text: "---" },
  { type: "heading", text: "## 🎭 Pilot Kael" },
  { type: "field", label: "Context", text: "Character" },
  { type: "body", text: "Veteran fleet explorer. Specialist in interstellar navigation." },
  { type: "connection", text: "→ Warp dive · Image Asset" },
  { type: "task", text: "◔ Create move systems  🔴 High" },
  { type: "task", text: "○ Write story  🟡 Medium" },
  { type: "divider", text: "---" },
  { type: "heading", text: "### Warp dive" },
  { type: "body", text: "FLT jump consumes fuel. Cooldown 30s." },
  { type: "field", label: "Hull", text: "500" },
  { type: "field", label: "Fuel", text: "85" },
  { type: "field", label: "Oxygen", text: "100" },
  { type: "divider", text: "---" },
  { type: "heading", text: "## 📖 Sector 7-Anomaly" },
  { type: "body", text: "Unknown signal detected. Derelict ship adrift." },
  { type: "body", text: "Something is watching them..." },
];

function LiveGDDTypewriter() {
  const { ref, inView } = useInView(0.3);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [lines, setLines] = useState<{ type: string; label?: string; text: string; displayed: string }[]>([]);

  // Auto-scroll to bottom as content grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (!inView) return;
    if (lineIndex >= GDD_LINES.length) return;

    const currentLine = GDD_LINES[lineIndex];
    const fullText = currentLine.text;

    if (charIndex === 0) {
      setLines((prev) => [...prev, { ...currentLine, displayed: "" }]);
    }

    if (charIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setLines((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], displayed: fullText.slice(0, charIndex + 1) };
          return copy;
        });
        setCharIndex((c) => c + 1);
      }, currentLine.type === "heading" ? 35 : 22);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [inView, lineIndex, charIndex]);

  const isTyping = lineIndex < GDD_LINES.length;

  return (
    <div ref={ref} className="relative">
      {/* Book page container */}
      <div className="relative rounded-2xl border border-white/[0.06] bg-[#080814]/90 backdrop-blur-sm overflow-hidden"
        style={{ boxShadow: "0 0 80px -20px rgba(124, 58, 237, 0.1), 0 30px 60px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.03)" }}>

        {/* Paper texture header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] bg-[#07070f]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500/50" />
            <span className="text-[10px] font-mono text-neutral-600">Stellar Game · GDD</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isTyping && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-violet-500">
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                writing...
              </span>
            )}
            {!isTyping && inView && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-600">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                synced
              </span>
            )}
          </div>
        </div>

        {/* Content area */}
        <div ref={scrollRef} className="px-6 py-5 h-[300px] overflow-y-auto font-mono text-sm space-y-2 scrollbar-thin scrollbar-thumb-violet-900/40 scrollbar-track-transparent">
          {lines.map((line, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                animation: "landing-ink-spread 0.3s ease-out forwards",
              }}
            >
              {line.type === "heading" && (
                <h3 className={`font-bold text-violet-300 mb-0.5 ${
                  line.text.startsWith("# ") && !line.text.startsWith("## ") && !line.text.startsWith("### ")
                    ? "text-base"
                    : line.text.startsWith("### ")
                    ? "text-xs"
                    : "text-sm"
                }`}>{line.displayed}</h3>
              )}
              {line.type === "divider" && (
                <div className="h-px bg-white/[0.05] my-1" />
              )}
              {line.type === "field" && (
                <div className="flex gap-2 text-xs">
                  <span className="text-violet-600 shrink-0">{line.label}:</span>
                  <span className="text-neutral-400">{line.displayed}</span>
                </div>
              )}
              {line.type === "body" && (
                <p className="text-xs text-neutral-500 leading-relaxed">{line.displayed}</p>
              )}
              {line.type === "connection" && (
                <p className="text-xs text-violet-400/70 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  {line.displayed}
                </p>
              )}
              {line.type === "task" && (
                <p className="text-xs text-neutral-600 ml-2">{line.displayed}</p>
              )}
              {/* Show cursor on last line if still typing */}
              {i === lines.length - 1 && isTyping && (
                <span className="landing-cursor" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="px-5 py-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-neutral-700 font-mono">
          <span>{lines.length} / {GDD_LINES.length} lines</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600/40" />
            7 widgets · 2 tasks
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Gamified stat counter
   ══════════════════════════════════════════════════════════════════════════ */

function StatCounter({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const { ref, inView } = useInView(0.3);
  const count = useCountUp(value, 2000, inView);
  return (
    <div ref={ref} className="text-center group cursor-default">
      <div className="relative inline-block">
        <span
          className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-violet-300 to-violet-600 tabular-nums"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
        >
          {count}{suffix}
        </span>
        {/* Glow behind number on hover */}
        <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/10 rounded-lg blur-xl transition-all duration-500" />
      </div>
      <p className="text-[10px] text-neutral-600 font-mono tracking-wider uppercase mt-2">{label}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Node connection visualizer — animated SVG connections between nodes
   ══════════════════════════════════════════════════════════════════════════ */

function NodeConnectionViz() {
  const { ref, inView } = useInView(0.2);

  const nodes = [
    { id: "char", x: 60, y: 40, label: "Character", color: "#8b5cf6" },
    { id: "mech", x: 240, y: 30, label: "Mechanic", color: "#a78bfa" },
    { id: "level", x: 160, y: 120, label: "Level", color: "#7c3aed" },
    { id: "story", x: 340, y: 90, label: "Story", color: "#6d28d9" },
    { id: "econ", x: 80, y: 170, label: "Economy", color: "#c4b5fd" },
  ];

  const connections = [
    { from: "char", to: "mech" },
    { from: "mech", to: "level" },
    { from: "char", to: "story" },
    { from: "level", to: "econ" },
    { from: "story", to: "level" },
  ];

  return (
    <div ref={ref} className="relative w-full max-w-[420px] h-[220px] mx-auto">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 220" fill="none">
        {inView && connections.map((c, i) => {
          const from = nodes.find((n) => n.id === c.from)!;
          const to = nodes.find((n) => n.id === c.to)!;
          return (
            <line
              key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="rgba(124, 58, 237, 0.25)"
              strokeWidth="1"
              strokeDasharray="6 4"
              className="landing-connection-line"
              style={{
                opacity: inView ? 1 : 0,
                transition: `opacity 0.5s ease ${i * 0.15}s`,
              }}
            />
          );
        })}
      </svg>

      {nodes.map((node, i) => (
        <div
          key={node.id}
          className="absolute group cursor-default"
          style={{
            left: node.x - 32,
            top: node.y - 14,
            opacity: inView ? 1 : 0,
            transform: inView ? "scale(1)" : "scale(0.5)",
            transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1 + 0.2}s`,
          }}
        >
          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: node.color,
              opacity: 0.15,
              animation: inView ? `landing-pulse-ring 3s ease-out ${i * 0.5}s infinite` : "none",
            }}
          />
          <div
            className="relative px-3 py-1.5 rounded-lg border text-[10px] font-mono font-semibold transition-all duration-300 group-hover:scale-110"
            style={{
              borderColor: `${node.color}40`,
              background: `${node.color}10`,
              color: node.color,
              boxShadow: `0 0 12px -3px ${node.color}30`,
            }}
          >
            {node.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Feature card with page-turn animation
   ══════════════════════════════════════════════════════════════════════════ */

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const { ref, inView } = useInView(0.15);
  const [hovered, setHovered] = useState(false);
  const rippleRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setHovered(true);
    if (rippleRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      rippleRef.current.style.left = `${e.clientX - rect.left}px`;
      rippleRef.current.style.top = `${e.clientY - rect.top}px`;
    }
  }, []);

  return (
    <div ref={ref}>
      <div
        className="landing-tilt-card group relative rounded-2xl border border-white/[0.04] bg-white/[0.01] overflow-hidden cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "perspective(1200px) rotateY(0deg)" : "perspective(1200px) rotateY(-40deg)",
          transition: `all 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.1}s`,
          transformOrigin: "left center",
        }}
      >
        {/* Ripple on hover */}
        <div ref={rippleRef} className="absolute pointer-events-none" style={{
          width: 10, height: 10, borderRadius: "50%",
          background: "rgba(124, 58, 237, 0.15)",
          animation: hovered ? "landing-ripple 0.6s ease-out forwards" : "none",
          opacity: hovered ? 1 : 0,
        }} />

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-purple-600/0 group-hover:from-violet-500/[0.06] group-hover:to-purple-600/[0.03] transition-all duration-500" />

        <div className="relative p-6">
          {/* Chapter number */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[9px] font-mono text-violet-700 tracking-[0.3em]">CHAPTER {feature.chapter}</span>
            <span className="text-lg text-violet-400/60 group-hover:text-violet-400 transition-colors duration-300">
              <feature.icon className="w-5 h-5" />
            </span>
          </div>

          {/* Title with ink line */}
          <h3
            className="text-base font-bold text-neutral-200 group-hover:text-white transition-colors duration-300 mb-3"
            style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
          >
            {feature.title}
          </h3>

          {/* Decorative line */}
          <div
            className="h-px w-8 mb-4 origin-left"
            style={{
              background: "linear-gradient(to right, rgba(124, 58, 237, 0.5), transparent)",
              transform: inView ? "scaleX(1)" : "scaleX(0)",
              transition: `transform 0.6s ease ${index * 0.1 + 0.4}s`,
            }}
          />

          {/* Description */}
          <p className="text-xs text-neutral-600 leading-relaxed group-hover:text-neutral-500 transition-colors duration-300">
            {feature.desc}
          </p>

          {/* Bottom ornament */}
          <div className="flex items-center gap-2 mt-5">
            <div className="w-1 h-1 rounded-full bg-violet-700 group-hover:bg-violet-500 transition-colors" />
            <div className="h-px flex-1 bg-gradient-to-r from-violet-700/20 to-transparent group-hover:from-violet-500/40 transition-all duration-700" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Audience card with interactive hover
   ══════════════════════════════════════════════════════════════════════════ */

function AudienceCard({ who, index }: { who: typeof FOR_WHO[0]; index: number }) {
  const { ref, inView } = useInView(0.15);
  return (
    <div ref={ref}>
      <div
        className="relative pl-6 group cursor-default"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateX(0)" : "translateX(-20px)",
          transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.12}s`,
        }}
      >
        {/* Animated left border */}
        <div className="absolute left-0 top-0 bottom-0 w-px overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-700/40 to-transparent group-hover:via-violet-400/80 transition-all duration-500"
          />
          {/* Flowing dot */}
          <div
            className="absolute w-1 h-6 rounded-full left-0"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(124, 58, 237, 0.8), transparent)",
              animation: "landing-spine-flow 3s ease-in-out infinite",
            }}
          />
        </div>

        <p
          className="text-sm font-bold text-neutral-300 mb-2 group-hover:text-violet-400 transition-colors duration-300"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
        >
          {who.role}
        </p>
        <p className="text-xs text-neutral-600 leading-relaxed group-hover:text-neutral-500 transition-colors duration-300">
          {who.desc}
        </p>

        {/* Gamified: "unlocked" stamp on hover */}
        <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-1 group-hover:translate-y-0">
          <div className="w-4 h-4 rounded-full border border-violet-500/50 flex items-center justify-center bg-violet-500/10">
            <Check size={8} className="text-violet-400" />
          </div>
          <span className="text-[9px] font-mono text-violet-600 tracking-wider">UNLOCKED</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   "Obsolescence clock" — gamified visual showing how docs decay
   ══════════════════════════════════════════════════════════════════════════ */

function ObsolescenceClock() {
  const { ref, inView } = useInView(0.3);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const steps = [
      { delay: 500, phase: 1 },
      { delay: 1500, phase: 2 },
      { delay: 2800, phase: 3 },
    ];
    const timeouts = steps.map((s) =>
      setTimeout(() => setPhase(s.phase), s.delay)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [inView]);

  const stages = [
    { label: "Day 1", status: "Fresh", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { label: "Week 2", status: "Drifting", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { label: "Month 1", status: "Obsolete", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
    { label: "Grapken", status: "Always synced", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  ];

  return (
    <div ref={ref} className="flex flex-col sm:flex-row items-stretch gap-3">
      {stages.map((s, i) => {
        const isActive = i <= phase;
        const isGrapken = i === 3;
        return (
          <div
            key={s.label}
            className={`flex-1 rounded-xl border p-4 transition-all duration-500 ${isActive ? `${s.bg} ${s.border}` : "bg-white/[0.01] border-white/[0.04]"} ${isGrapken && phase >= 3 ? "ring-1 ring-violet-500/40 shadow-[0_0_20px_-5px_rgba(124,58,237,0.3)]" : ""}`}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(12px)",
              transition: `all 0.5s ease ${i * 0.15}s`,
            }}
          >
            <p className={`text-[10px] font-mono tracking-wider ${isActive ? s.color : "text-neutral-700"} mb-1 transition-colors duration-500`}>{s.label}</p>
            <p className={`text-xs font-semibold ${isActive ? s.color : "text-neutral-700"} transition-colors duration-500`}>{s.status}</p>
            {isGrapken && phase >= 3 && (
              <div className="mt-2 text-[9px] font-mono text-violet-500 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
                real-time
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Interstellar-style spine watermark — SVG stacked letters with
   astronomical/blueprint ornaments between each glyph
   ══════════════════════════════════════════════════════════════════════════ */

function GrapkenSpineWatermark() {
  const strokeColor = "rgba(124, 58, 237, 0.45)";
  const sw = 0.6; // stroke-width

  return (
    <div
      className="fixed hidden lg:block pointer-events-none z-[1]"
      style={{ left: 78, top: 56, bottom: 0, width: 60, opacity: 0.12 }}
      aria-hidden="true"
    >
      <svg
        width="56"
        height="100%"
        viewBox="0 0 56 900"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", margin: "0 auto" }}
      >
        {/* ── G ── */}
        <text x="28" y="74" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>G</text>

        {/* Ornament 1: measurement bracket */}
        <line x1="28" y1="88" x2="28" y2="118" stroke={strokeColor} strokeWidth={sw} />
        <line x1="18" y1="88" x2="38" y2="88" stroke={strokeColor} strokeWidth={sw} />
        <line x1="18" y1="118" x2="38" y2="118" stroke={strokeColor} strokeWidth={sw} />
        {/* Side ticks */}
        <line x1="10" y1="92" x2="16" y2="92" stroke={strokeColor} strokeWidth={sw} opacity="0.5" />
        <line x1="10" y1="114" x2="16" y2="114" stroke={strokeColor} strokeWidth={sw} opacity="0.5" />
        <circle cx="28" cy="103" r="3" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <circle cx="28" cy="103" r="0.8" fill={strokeColor} />

        {/* ── R ── */}
        <text x="28" y="196" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>R</text>

        {/* Ornament 2: compass cross */}
        <line x1="28" y1="210" x2="28" y2="244" stroke={strokeColor} strokeWidth={sw} />
        <circle cx="28" cy="227" r="10" stroke={strokeColor} strokeWidth={sw} fill="none" opacity="0.5" />
        <circle cx="28" cy="227" r="5" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <circle cx="28" cy="227" r="1.2" fill={strokeColor} />
        <line x1="14" y1="227" x2="18" y2="227" stroke={strokeColor} strokeWidth={sw} />
        <line x1="38" y1="227" x2="42" y2="227" stroke={strokeColor} strokeWidth={sw} />

        {/* ── A ── */}
        <text x="28" y="318" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>A</text>

        {/* Ornament 3: dashed bridge */}
        <line x1="28" y1="332" x2="28" y2="362" stroke={strokeColor} strokeWidth={sw} strokeDasharray="3 3" />
        <line x1="16" y1="344" x2="40" y2="344" stroke={strokeColor} strokeWidth={sw} opacity="0.4" />
        <line x1="16" y1="350" x2="40" y2="350" stroke={strokeColor} strokeWidth={sw} opacity="0.4" />
        <circle cx="28" cy="362" r="2" fill={strokeColor} />

        {/* ── P ── */}
        <text x="28" y="440" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>P</text>

        {/* Ornament 4: diamond */}
        <line x1="28" y1="454" x2="28" y2="486" stroke={strokeColor} strokeWidth={sw} />
        <polygon points="28,462 36,470 28,478 20,470" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <circle cx="28" cy="470" r="1.5" fill={strokeColor} />
        {/* Wing tick marks */}
        <line x1="6" y1="470" x2="14" y2="470" stroke={strokeColor} strokeWidth={sw} opacity="0.5" />
        <line x1="42" y1="470" x2="50" y2="470" stroke={strokeColor} strokeWidth={sw} opacity="0.5" />

        {/* ── K ── */}
        <text x="28" y="562" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>K</text>

        {/* Ornament 5: orbital arc */}
        <line x1="28" y1="576" x2="28" y2="602" stroke={strokeColor} strokeWidth={sw} />
        <path d="M 14 589 A 14 14 0 0 1 42 589" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <path d="M 14 589 A 14 14 0 0 0 42 589" stroke={strokeColor} strokeWidth={sw} fill="none" opacity="0.3" strokeDasharray="2 2" />
        <circle cx="28" cy="589" r="2.5" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <circle cx="28" cy="589" r="0.8" fill={strokeColor} />

        {/* ── E ── */}
        <text x="28" y="684" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>E</text>

        {/* Ornament 6: angular bracket */}
        <line x1="28" y1="698" x2="28" y2="726" stroke={strokeColor} strokeWidth={sw} />
        <polyline points="14,704 22,712 14,720" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <polyline points="42,704 34,712 42,720" stroke={strokeColor} strokeWidth={sw} fill="none" />
        <circle cx="28" cy="712" r="1.8" fill={strokeColor} opacity="0.7" />
        <line x1="22" y1="712" x2="34" y2="712" stroke={strokeColor} strokeWidth={sw} strokeDasharray="2 2" opacity="0.5" />

        {/* ── N ── */}
        <text x="28" y="808" textAnchor="middle" fontFamily="var(--font-space-grotesk, sans-serif)" fontSize="68" fontWeight="900" fill={strokeColor}>N</text>

        {/* Bottom terminal */}
        <line x1="28" y1="820" x2="28" y2="840" stroke={strokeColor} strokeWidth={sw} />
        <line x1="18" y1="840" x2="38" y2="840" stroke={strokeColor} strokeWidth={sw} />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Architectural navbar
   ══════════════════════════════════════════════════════════════════════════ */

function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: scrolled ? "rgba(5, 5, 14, 0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.4)" : "none",
        borderBottom: scrolled ? "1px solid rgba(124,58,237,0.1)" : "1px solid transparent",
        transition: "background 0.5s ease, backdrop-filter 0.5s ease, border-color 0.5s ease",
      }}
    >
      <div className="flex items-center justify-between px-6 lg:px-14 h-14">
        {/* ── Left: brand ── */}
        <div className="flex items-center gap-2.5">
          <img src="/logoGrapken.png" alt="Grapken" width={120} height={32} className="h-8 w-auto" />
          <span className="text-[9px] font-medium text-violet-500 border border-violet-800/60 rounded-full px-1.5 py-0.5 bg-violet-500/[0.06]">
            Beta
          </span>
        </div>

        {/* ── Center: nav links ── */}
        <div className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {[
            { label: "Features", href: "/landing#features" },
            { label: "Scenarios", href: "/landing#scenarios" },
            { label: "Pricing", href: "/landing#pricing" },
            { label: "Contribute", href: "/landing#contribute" },
          ].map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="relative text-xs text-neutral-500 hover:text-neutral-200 transition-colors duration-300 group py-1"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0 group-hover:w-full transition-all duration-400" />
            </Link>
          ))}
        </div>

        {/* ── Right: GitHub + CTA ── */}
        <div className="flex items-center gap-3">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-600 hover:text-neutral-300 transition-colors duration-300"
          aria-label="GitHub repository"
        >
          <Github size={18} />
        </a>
        <Link
          to="/"
          className="group relative text-xs px-4 py-2 rounded-xl overflow-hidden font-semibold flex items-center gap-1.5 text-white transition-all duration-300 hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #6d28d9, #7c3aed)",
            boxShadow: "0 0 20px -4px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
              animation: "landing-shimmer 2s ease-in-out infinite",
            }}
          />
          <span className="relative">Open your Blueprint</span>
          <ArrowRight size={11} className="relative transition-transform group-hover:translate-x-0.5" />
        </Link>
        </div>
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className="landing-body flex flex-col min-h-screen text-neutral-100 overflow-x-hidden relative"
      style={{
        fontFamily: "var(--font-geist-sans)",
        background: "radial-gradient(ellipse at 50% 0%, #0e0a1e 0%, #07070e 45%, #050510 100%)",
      }}
    >
      {/* ── Atmospheric layers ── */}
      <ScrollProgressBar />
      <CursorGlow />
      <GrainOverlay />
      <BookSpine />

      {/* ── Background dot grid ── */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124, 58, 237, 0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Interstellar spine watermark ── */}
      <GrapkenSpineWatermark />

      {/* ── Architectural navbar ── */}
      <NavBar />

      {/* ══════════════════════════════════════════════════════════════════════
           HERO — "The cover of the book"
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative px-6 lg:px-16 pt-20 lg:pt-28 pb-8 overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] pointer-events-none -z-0">
          <div className="absolute inset-0 rounded-full blur-[120px]" style={{
            background: "radial-gradient(ellipse, rgba(124, 58, 237, 0.2) 0%, rgba(109, 40, 217, 0.08) 40%, transparent 70%)",
            animation: "landing-hero-glow 8s ease-in-out infinite",
          }} />
        </div>

        {/* Spinning conic gradient */}
        <div className="absolute top-[10%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-[0.1]">
          <div className="w-full h-full rounded-full" style={{
            background: "conic-gradient(from 0deg, transparent, rgba(124, 58, 237, 0.4), transparent, rgba(139, 92, 246, 0.3), transparent)",
            filter: "blur(60px)",
            animation: "landing-spin-slow 30s linear infinite",
          }} />
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className={`transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="relative inline-flex items-center gap-2 text-[10px] font-semibold text-violet-400 rounded-full px-3.5 py-1.5 mb-10 overflow-hidden">
              <div className="absolute inset-0 rounded-full p-px" style={{
                background: "linear-gradient(90deg, rgba(124,58,237,0.1), rgba(124,58,237,0.5), rgba(139,92,246,0.3), rgba(124,58,237,0.1))",
                backgroundSize: "200% 100%",
                animation: "landing-badge-border 4s linear infinite",
                mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
                padding: "1px",
                borderRadius: "9999px",
              }} />
              <div className="absolute inset-0 rounded-full bg-violet-500/[0.06]" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="relative hover:text-violet-300 transition-colors">Open source · AGPL-3.0 · Free forever</a>
            </div>
          </div>

          {/* Headline */}
          <h1
            className={`text-5xl sm:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.04] mb-6 max-w-3xl relative z-10 transition-all duration-700 ease-out delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
          >
            Your game lives in your head.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 bg-clip-text text-transparent">
              Build your game's Blueprint.
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-base sm:text-lg text-neutral-500 max-w-xl leading-relaxed mb-10 relative z-10 transition-all duration-700 ease-out delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            Connect ideas, tasks, and mechanics visually.
            No setup. No account. Just design.
          </p>

          {/* CTA row */}
          <div className={`flex flex-col sm:flex-row items-start gap-4 mb-12 relative z-10 transition-all duration-700 ease-out delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <Link
              to="/"
              className="group relative px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all duration-300 font-semibold text-sm flex items-center gap-2 text-white shadow-[0_0_30px_-5px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_-4px_rgba(124,58,237,0.55)] hover:scale-[1.03] overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                animation: "landing-shimmer 2.5s ease-in-out infinite",
              }} />
              <span className="relative">Open your Blueprint</span>
              <ArrowRight size={14} className="relative transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="text-xs text-neutral-700 self-center">No install. No signup. Just you and your game.</span>
          </div>

          {/* Context pills */}
          <div className={`flex flex-wrap gap-2 mb-14 relative z-10 transition-all duration-700 ease-out delay-[400ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            {CONTEXTS.map((c, i) => (
              <span
                key={c.label}
                className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] text-neutral-500 hover:border-violet-500/30 hover:text-neutral-400 hover:bg-violet-500/[0.04] transition-all duration-300 cursor-default hover:scale-105"
                style={{ transitionDelay: `${450 + i * 40}ms` }}
              >
                <c.icon /> {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Hero visual: split layout with video + live typewriter ── */}
        <div className="max-w-6xl mx-auto">
          <div className={`grid lg:grid-cols-[1fr_380px] gap-6 transition-all duration-1000 ease-out delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            {/* Video mockup */}
            <div className="relative">
              <div className="absolute -inset-4 bg-violet-600/[0.04] rounded-3xl blur-3xl pointer-events-none" />
              <div
                className="relative rounded-2xl border border-white/[0.06] bg-[#090916] overflow-hidden"
                style={{ boxShadow: "0 0 80px -20px rgba(124, 58, 237, 0.12), 0 30px 60px -15px rgba(0, 0, 0, 0.5)" }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] bg-[#060610]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                  <span className="text-[9px] text-neutral-700 ml-2 font-mono">Grapken — Stellar Game Project</span>
                </div>
                <video className="hidden lg:block w-full" src="/LandingVideoGrapken.mp4" poster="/LandingGrapkenExample.png" autoPlay muted loop playsInline />
                <img className="block lg:hidden w-full" src="/LandingGrapkenExample.png" alt="Grapken blueprint screenshot" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050510] via-[#050510]/60 to-transparent pointer-events-none z-10" />
            </div>

            {/* Live typewriter — the "book writing itself" */}
            <div className="hidden lg:block">
              <LiveGDDTypewriter />
            </div>
          </div>
        </div>
      </section>

      {/* ── Obsolescence demo ── */}
      <section className="relative px-6 lg:px-16 py-16 max-w-4xl mx-auto w-full">
        <RevealOnScroll className="relative">
          <div className="absolute -inset-6 bg-violet-600/[0.04] rounded-3xl blur-2xl pointer-events-none" />

          <div className="relative rounded-2xl border border-white/[0.05] bg-[#090915]/75 backdrop-blur-sm px-6 sm:px-10 py-10 sm:py-12">
            <p className="text-[10px] font-mono text-violet-700 tracking-[0.25em] uppercase mb-5 text-center">
              Why traditional GDDs fail
            </p>

            <h2
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight text-center"
              style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
            >
              Built for the "lazy genius."
            </h2>

            <p className="text-sm sm:text-base text-neutral-500 text-center max-w-2xl mx-auto leading-relaxed mb-6">
              Let&apos;s be honest. Documentation is boring when it feels like admin work instead of game design.
            </p>

            <div className="grid sm:grid-cols-3 gap-2.5 text-[10px] font-mono tracking-[0.12em] uppercase mb-8 max-w-2xl mx-auto">
              <span className="text-center rounded-full border border-red-500/25 bg-red-500/[0.06] text-red-300/80 px-3 py-2">Feels like homework</span>
              <span className="text-center rounded-full border border-amber-500/25 bg-amber-500/[0.06] text-amber-300/80 px-3 py-2">Kills momentum</span>
              <span className="text-center rounded-full border border-violet-500/25 bg-violet-500/[0.07] text-violet-300/90 px-3 py-2">Breaks creative flow</span>
            </div>

            <div className="max-w-2xl mx-auto text-center space-y-4">
              <p className="text-sm text-neutral-500 leading-relaxed">
                We wanted to build games, not write reports about them. But we also wanted to work like pros: clear systems, aligned teams, and realistic ship dates.
              </p>
              <p className="text-sm text-neutral-500 leading-relaxed">
                So we built Grapken, a bridge between the chaos in your head and the game on your screen. In Grapken, design <span className="text-violet-300">is</span> documentation.
              </p>
            </div>

            <p className="text-sm sm:text-base text-center text-violet-300 mt-8 mb-8 font-semibold">
              Stop doing paperwork. Start building your legacy.
            </p>

            <p className="text-xs text-neutral-700 text-center font-mono italic mb-8">
              Built in the trenches — by a dev who hated ticket trackers and loved game jams.
              Designed so your head doesn&apos;t explode when there are 24 hours left on the clock.
            </p>

            <ObsolescenceClock />
          </div>
        </RevealOnScroll>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           CHAPTER I — Capabilities (features)
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Part I" title="Capabilities" />

      <section id="features" className="relative py-20">
        <div className="px-6 lg:px-16 max-w-5xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
              Everything static docs can&apos;t do.
            </h2>
            <p className="text-sm text-neutral-600 mb-16 max-w-lg">
              Six chapters of a living document. Each one writes and updates itself as your game evolves.
            </p>
          </RevealOnScroll>

          {/* Feature cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </div>

          {/* Node connection viz */}
          <RevealOnScroll className="mt-20">
            <p className="text-[10px] font-mono text-violet-700 tracking-[0.15em] uppercase text-center mb-8">
              Connected, not siloed
            </p>
            <NodeConnectionViz />
          </RevealOnScroll>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           CHAPTER II — Audience
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Part II" title="Audience" />

      <section className="relative py-20">
        <div className="px-6 lg:px-16 max-w-5xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-16 leading-tight" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
              For the ones who actually ship.
            </h2>
          </RevealOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FOR_WHO.map((w, i) => (
              <AudienceCard key={w.role} who={w} index={i} />
            ))}
          </div>

          {/* Gamified stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <StatCounter value={100} suffix="%" label="browser-based" />
            <StatCounter value={8} label="node types" />
            <StatCounter value={0} suffix="$" label="forever free" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           CHAPTER III — Intelligence (AI)
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Part III" title="Intelligence" />

      <section className="relative py-20">
        <div className="px-6 lg:px-16 max-w-5xl mx-auto">
          <RevealOnScroll>
            <div
              className="relative border border-[#1a1a38] bg-[#09091a]/80 rounded-2xl overflow-hidden backdrop-blur-sm"
              style={{ boxShadow: "0 0 60px -15px rgba(124, 58, 237, 0.08), inset 0 1px 0 rgba(124, 58, 237, 0.1)" }}
            >
              {/* Animated top border */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{
                background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(139,92,246,0.3), transparent)",
                backgroundSize: "200% 100%",
                animation: "landing-border-flow 4s ease infinite",
              }} />

              {/* Corner markers */}
              {(["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"] as const).map((pos) => (
                <div key={pos} className={`absolute ${pos} w-4 h-4`}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <line x1="0" y1="8" x2="6" y2="8" stroke="#7c3aed" strokeWidth="0.75" opacity="0.45" />
                    <line x1="8" y1="0" x2="8" y2="6" stroke="#7c3aed" strokeWidth="0.75" opacity="0.45" />
                  </svg>
                </div>
              ))}

              <div className="px-8 sm:px-10 py-14 flex flex-col lg:flex-row items-start gap-12">
                <div className="flex-1">
                  <span className="text-[9px] font-mono text-violet-500 bg-violet-500/[0.08] border border-violet-800/50 rounded-full px-3 py-1.5 mb-6 inline-flex items-center gap-1.5 tracking-widest">
                    <IconBrain className="w-3 h-3" /> Coming to Pro
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-200 mb-5 leading-tight" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
                    AI that understands your entire game —{" "}
                    <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">not just one node.</span>
                  </h2>
                  <p className="text-sm text-neutral-600 leading-relaxed max-w-md">
                    Every widget has context. The AI reads all of it — characters, economy, mechanics — before it speaks. No generic suggestions. Just ideas that fit <em>your</em> game.
                  </p>
                </div>

                {/* Chat mockup */}
                <div className="w-full lg:w-80 shrink-0 rounded-xl border border-[#1c1c38] bg-[#060612]/80 p-5 space-y-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#1a1a30]">
                    <div className="w-5 h-5 rounded-md bg-violet-600/20 flex items-center justify-center text-violet-400">
                      <IconBrain className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-500">AI · Hero — Kael</span>
                  </div>
                  <div className="bg-[#0d0d1e] rounded-lg px-3.5 py-2.5">
                    <p className="text-[10px] text-neutral-700 mb-1 font-mono">You asked</p>
                    <p className="text-[11px] text-neutral-400">Suggest a backstory conflict for this character.</p>
                  </div>
                  <div className="bg-violet-500/[0.04] border border-violet-800/30 rounded-lg px-3.5 py-2.5">
                    <p className="text-[10px] text-violet-600 mb-1 font-mono">Grapken AI</p>
                    <p className="text-[11px] text-neutral-500">
                      Based on your <span className="text-violet-400">Economy</span> node, Kael&apos;s corruption could tie to an ancient debt — the relic was stolen to pay it...
                    </p>
                  </div>
                  <a
                    href="https://tally.so/r/7RDzY2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center text-xs py-2.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 border border-violet-800/40 text-violet-400 font-semibold transition-all duration-300 block hover:border-violet-700/60"
                  >
                    Join waitlist. Tell us what to build →
                  </a>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           CHAPTER IV — Scenarios
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Part IV" title="Scenarios" />

      <section id="scenarios" className="relative py-20">
        <div className="px-6 lg:px-16 max-w-5xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
              You&apos;ve been here before.
            </h2>
            <p className="text-sm sm:text-base text-neutral-500 mb-5 max-w-3xl leading-relaxed">
              <span className="text-neutral-300 font-semibold">The 48h Jam:</span> It&apos;s 2 AM. Your brain is fried. Open Grapken, drop your mechanics on the blueprint, connect the dots. You stop worrying about what&apos;s missing and start shipping what works.
            </p>
            <p className="text-sm sm:text-base text-neutral-500 mb-5 max-w-3xl leading-relaxed">
              <span className="text-neutral-300 font-semibold">The Mid-Project Fog:</span> You&apos;re 3 months in. Ideas are scattered. Grapken visualizes the connections you forgot. Suddenly, the path to the finish line is clear.
            </p>
            <p className="text-sm sm:text-base text-neutral-500 mb-0 max-w-3xl leading-relaxed">
              <span className="text-neutral-300 font-semibold">The "Pro" Move:</span> You need a GDD for your portfolio. Export a clean, connected Blueprint in one click. Look like a lead designer, even if you&apos;re a team of one.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           CHAPTER V — Pricing
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Part V" title="Pricing" />

      <section id="pricing" className="relative py-20">
        <div className="px-6 lg:px-16 max-w-3xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
              Open source core.{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 bg-clip-text text-transparent">Pro when you scale.</span>
            </h2>
            <p className="text-xs text-neutral-700 mb-16">The core is AGPL-3.0. Pro is a separate product for teams.</p>
          </RevealOnScroll>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Free tier */}
            <RevealOnScroll delay={0}>
              <div className="landing-tilt-card flex flex-col h-full p-7 border border-white/[0.04] bg-white/[0.01] rounded-2xl group">
                <p className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest mb-3">Community · Open Source</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-black text-neutral-200" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>$0</span>
                </div>
                <p className="text-[10px] text-neutral-700 mb-8 font-mono">AGPL-3.0 · Forever free · Self-hostable</p>
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-neutral-500">
                      <Check size={11} className="text-emerald-600 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/"
                  className="text-center text-sm py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all duration-300 font-semibold text-white shadow-[0_0_20px_-5px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_-3px_rgba(124,58,237,0.45)] block"
                >
                  Start for free
                </Link>
              </div>
            </RevealOnScroll>

            {/* Pro tier */}
            <RevealOnScroll delay={120}>
              <div className="relative rounded-2xl h-full">
                {/* Animated gradient border */}
                <div className="absolute -inset-px rounded-2xl" style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(139,92,246,0.2), rgba(124,58,237,0.1), rgba(139,92,246,0.4))",
                  backgroundSize: "300% 300%",
                  animation: "landing-border-flow 6s ease infinite",
                }} />
                <div className="absolute -inset-6 bg-violet-600/[0.04] rounded-3xl blur-2xl pointer-events-none" />

                <div className="relative flex flex-col h-full p-7 bg-[#09091e] rounded-2xl overflow-hidden">
                  <div className="absolute top-3 right-4 text-[9px] font-mono text-violet-500 bg-violet-500/[0.08] border border-violet-800/50 rounded-full px-2.5 py-0.5 tracking-widest">
                    Coming soon
                  </div>
                  <p className="text-[9px] font-mono text-violet-600 uppercase tracking-widest mb-3">Pro</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-5xl font-black text-neutral-200" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>$?</span>
                  </div>
                  <p className="text-[10px] text-neutral-700 mb-8 font-mono">Separate product · Cloud · Teams</p>
                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-xs text-neutral-500">
                        <Check size={11} className="text-violet-600 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://tally.so/r/7RDzY2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center text-sm py-2.5 rounded-xl border border-violet-700/50 bg-violet-500/[0.08] hover:bg-violet-500/15 text-violet-400 font-semibold transition-all duration-300 hover:border-violet-600/70 hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.3)] block"
                  >
                    Be first when Pro launches →
                  </a>
                  <p className="mt-3 text-[9px] text-center text-neutral-800 font-mono">
                    We&apos;re building team features. Tell us what matters most.
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           CHAPTER VI — Contribute / Open Source
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Part VI" title="Contribute" />

      <section id="contribute" className="relative py-20">
        <div className="px-6 lg:px-16 max-w-4xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
              Built in the{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 bg-clip-text text-transparent">open.</span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-500 mb-12 max-w-2xl leading-relaxed">
              Grapken is open source under AGPL-3.0. Read the code, run it locally, and help shape the tool.
            </p>
          </RevealOnScroll>

          {/* Steps */}
          <div className="grid sm:grid-cols-3 gap-5 mb-14">
            {[
              { step: "1", title: "Clone the repo", code: "git clone https://github.com/byronrosas/grapken-core.git" },
              { step: "2", title: "Install & run", code: "bun install && bun run dev" },
              { step: "3", title: "Open in your browser", code: "http://localhost:5173" },
            ].map((s) => (
              <RevealOnScroll key={s.step} delay={Number(s.step) * 80}>
                <div className="landing-tilt-card p-6 border border-white/[0.04] bg-white/[0.01] rounded-2xl group h-full">
                  <span className="text-3xl font-black text-violet-600/30 font-mono">{s.step}</span>
                  <p className="text-sm font-semibold text-neutral-300 mt-2 mb-3">{s.title}</p>
                  <code className="text-[10px] text-violet-400 bg-violet-500/[0.06] border border-violet-800/30 rounded-lg px-3 py-2 block font-mono break-all">{s.code}</code>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Stack + contribute CTA */}
          <RevealOnScroll>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 border border-white/[0.04] bg-white/[0.01] rounded-2xl">
              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-300 mb-2">Tech stack</p>
                <div className="flex flex-wrap gap-2">
                  {["React", "TypeScript", "Vite", "Tailwind CSS", "Zustand"].map((t) => (
                    <span key={t} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-neutral-500 font-mono">{t}</span>
                  ))}
                </div>
              </div>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-neutral-300 font-semibold transition-all duration-300 hover:border-violet-500/30 shrink-0"
              >
                <Github size={16} />
                View on GitHub
              </a>
            </div>
          </RevealOnScroll>

          {/* CLA note */}
          <RevealOnScroll>
            <p className="mt-6 text-[11px] text-neutral-700 font-mono text-center">
              By contributing, you agree to our{" "}
              <a
                href="https://cla-assistant.io/byronrosas/grapken-core"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-500 transition-colors"
              >
                Contributor License Agreement
              </a>
              {" "}&mdash; it lets us keep the project dual-licensed (OSS core + Pro).
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           FINAL CTA — "The last page of the book"
         ══════════════════════════════════════════════════════════════════════ */}
      <ChapterDivider chapter="Epilogue" title="Start" />

      <section className="relative py-28 px-6 lg:px-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-violet-950/10 via-transparent to-transparent pointer-events-none" />

        <RevealOnScroll>
          <div className="max-w-2xl mx-auto text-center relative z-10">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-[1.06]" style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}>
              Your game is{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500 bg-clip-text text-transparent">waiting.</span>
            </h2>
            <p className="text-neutral-500 text-sm mb-10 leading-relaxed max-w-md mx-auto">
              Don&apos;t let the idea fade. Open a blueprint, connect the dots, and build the game you were meant to make.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                to="/"
                className="group relative px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all duration-300 font-semibold text-sm flex items-center gap-2 text-white shadow-[0_0_35px_-5px_rgba(124,58,237,0.4)] hover:shadow-[0_0_45px_-4px_rgba(124,58,237,0.55)] hover:scale-[1.03] overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                  animation: "landing-shimmer 2.5s ease-in-out infinite",
                }} />
                <span className="relative">Open your Blueprint</span>
                <ArrowRight size={14} className="relative transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-xs text-neutral-700 font-mono">No signup. No install. Free forever.</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
           FOOTER
         ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.04] px-6 lg:px-16 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-700 font-mono">
        {/* Brand */}
        <span className="flex items-center gap-2.5">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="1" width="16" height="16" rx="4" stroke="#7c3aed" strokeWidth="1" opacity="0.3" />
              <circle cx="9" cy="9" r="2" fill="#7c3aed" opacity="0.4" />
            </svg>
            <div className="absolute -inset-0.5 bg-violet-500/10 rounded blur-sm -z-10" />
          </div>
          © 2026 Grapken — v0.1.0 Beta — AGPL-3.0
        </span>
        {/* Links */}
        <span className="flex items-center gap-4">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors flex items-center gap-1"><Github size={11} /> GitHub</a>
          <span className="text-neutral-800">·</span>
          <Link to="/privacy" className="hover:text-neutral-400 transition-colors">Privacy</Link>
          <span className="text-neutral-800">·</span>
          <Link to="/terms" className="hover:text-neutral-400 transition-colors">Terms</Link>
        </span>
        {/* Tagline */}
        <span className="text-neutral-800 text-center sm:text-right">Open source · Runs in your browser · Built for game devs</span>
      </footer>
    </div>
  );
}
