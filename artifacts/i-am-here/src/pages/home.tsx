import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/* ─── tiny animation helpers (no extra deps) ─── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── animated counter ─── */
function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { ref, count };
}

const STAT_ITEMS = [
  { target: 12400, format: (n: number) => n.toLocaleString() + "+", label: "Connections made" },
  { target: 3,     format: (n: number) => n + " min",               label: "Avg. response time" },
  { target: 94,    format: (n: number) => n + "%",                  label: "Feel safe using it" },
  { target: 48,    format: (n: number) => String(n),                label: "Cities active" },
];

function StatCounter({ target, format, label }: { target: number; format: (n: number) => string; label: string }) {
  const { ref, count } = useCountUp(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-black tracking-tight tabular-nums" style={{ color: "hsl(243 75% 59%)" }}>
        {format(count)}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ─── live activity ticker ─── */
const ACTIVITY_FEED = [
  { name: "Alex K.", city: "Berlin", mood: "Chill", ago: "just now" },
  { name: "Priya S.", city: "New York", mood: "Talkative", ago: "1m ago" },
  { name: "Leo M.", city: "Tokyo", mood: "Creative", ago: "2m ago" },
  { name: "Sara J.", city: "London", mood: "Networking", ago: "3m ago" },
  { name: "Omar F.", city: "Dubai", mood: "Open", ago: "just now" },
  { name: "Mia R.", city: "Paris", mood: "Chill", ago: "4m ago" },
  { name: "Jake T.", city: "Sydney", mood: "Talkative", ago: "2m ago" },
  { name: "Nadia B.", city: "Toronto", mood: "Creative", ago: "just now" },
];
const MOOD_COLORS: Record<string, string> = {
  Chill: "#6366f1", Talkative: "#0d9488", Networking: "#2563eb",
  Creative: "#d97706", Open: "#7c3aed",
};

function ActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % ACTIVITY_FEED.length);
        setVisible(true);
      }, 350);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const item = ACTIVITY_FEED[idx];
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: MOOD_COLORS[item.mood] ?? "#6366f1" }}
      />
      <span className="font-medium text-foreground">{item.name}</span>
      <span>started a session in</span>
      <span className="font-medium text-foreground">{item.city}</span>
      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white" style={{ background: MOOD_COLORS[item.mood] }}>
        {item.mood}
      </span>
      <span className="text-xs text-muted-foreground/60">· {item.ago}</span>
    </div>
  );
}

/* ─── floating avatar dots for hero ─── */
const AVATARS = [
  { initials: "AK", color: "#6366f1", top: "18%", left: "8%", mood: "Chill", delay: "0s" },
  { initials: "MR", color: "#0d9488", top: "32%", left: "82%", mood: "Talkative", delay: "0.4s" },
  { initials: "SL", color: "#f59e0b", top: "68%", left: "12%", mood: "Creative", delay: "0.8s" },
  { initials: "JD", color: "#ec4899", top: "72%", left: "78%", mood: "Networking", delay: "0.2s" },
  { initials: "PW", color: "#8b5cf6", top: "12%", left: "60%", mood: "Open", delay: "0.6s" },
  { initials: "NN", color: "#10b981", top: "55%", left: "90%", mood: "Chill", delay: "1s" },
];

const STEPS = [
  {
    num: "01",
    title: "Set your presence",
    desc: "Tell the world you're open to meeting. Set your mood, how long you're available, and where you are — roughly.",
  },
  {
    num: "02",
    title: "Discover who's nearby",
    desc: "See a live map of people in your area who are also open to connecting right now, with approximate locations only.",
  },
  {
    num: "03",
    title: "Ping, meet, connect",
    desc: "Send a quick ping. If they accept, both of you get the real location. Walk over and say hello.",
  },
];

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
    title: "Live presence map",
    desc: "A real-time map showing who nearby is open to meeting, updated as people join and leave.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    title: "AI compatibility score",
    desc: "Our matching algorithm weighs shared interests, mood compatibility, distance, and availability to surface your top 3 suggested connections.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Privacy by design",
    desc: "Exact coordinates are never shared. Your location is blurred until you both agree to meet. Sessions expire automatically.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: "Time-boxed sessions",
    desc: "Set how long you're available — 30 minutes, an hour, or custom. When time's up, you disappear from the map automatically.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Mutual opt-in only",
    desc: "Nobody gets notified unless they want to. The ping system is two-way — no unwanted contact, no surprise arrivals.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    title: "Report & block",
    desc: "Comprehensive safety tools: block any user instantly, report bad actors, rate-limited pings to prevent spam.",
  },
];

const MOODS = [
  { label: "Chill", color: "#6366f1", bg: "#eef2ff", desc: "Relaxed, low-key, happy to just hang out" },
  { label: "Talkative", color: "#0d9488", bg: "#f0fdfa", desc: "Ready to chat about anything and everything" },
  { label: "Networking", color: "#2563eb", bg: "#eff6ff", desc: "Meeting people with a purpose in mind" },
  { label: "Creative", color: "#d97706", bg: "#fffbeb", desc: "Looking for a collab or a creative spark" },
  { label: "Open", color: "#7c3aed", bg: "#f5f3ff", desc: "No agenda, just curious to see who's out there" },
];

const TESTIMONIALS = [
  {
    name: "Aria M.",
    location: "San Francisco",
    text: "I was working alone at a coffee shop and noticed someone nearby was also working solo in 'chill' mode. We ended up co-working for 3 hours. This app is magic.",
    initials: "AM",
    color: "#6366f1",
  },
  {
    name: "Leo K.",
    location: "Berlin",
    text: "I moved to a new city and didn't know anyone. Within a week I had three genuinely interesting conversations with strangers — one turned into a friendship.",
    initials: "LK",
    color: "#0d9488",
  },
  {
    name: "Priya S.",
    location: "New York",
    text: "The privacy features made me actually feel safe. Nobody knows where I am exactly until I accept them — that made it possible for me to try this at all.",
    initials: "PS",
    color: "#ec4899",
  },
];

/* ─── COMPONENT ─── */
export default function Home() {
  const [pingAnimating, setPingAnimating] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setPingAnimating(true);
      setTimeout(() => setPingAnimating(false), 800);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  /* active nav section on scroll */
  useEffect(() => {
    const sections = ["how-it-works", "features", "safety"];
    const onScroll = () => {
      let current = "";
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 100) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white" style={{ background: "hsl(243 75% 59%)" }}>
            IH
          </div>
          <span className="font-bold text-lg tracking-tight">I AM HERE</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {[
            { href: "#how-it-works", id: "how-it-works", label: "How it works" },
            { href: "#features",    id: "features",    label: "Features" },
            { href: "#safety",      id: "safety",      label: "Safety" },
          ].map(({ href, id, label }) => (
            <a
              key={id}
              href={href}
              className="relative transition-colors"
              style={{ color: activeSection === id ? "hsl(243 75% 59%)" : undefined }}
            >
              <span className={activeSection === id ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
                {label}
              </span>
              {activeSection === id && (
                <span
                  className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "hsl(243 75% 59%)" }}
                />
              )}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm" className="font-semibold">Get started</Button>
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* gradient background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, hsl(243 75% 59%) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-10" style={{ background: "hsl(184 90% 41%)" }} />
          <div className="absolute top-10 right-0 w-[300px] h-[300px] rounded-full blur-3xl opacity-10" style={{ background: "hsl(243 75% 59%)" }} />
        </div>

        {/* floating user dots */}
        {AVATARS.map((a) => (
          <div
            key={a.initials}
            className="absolute hidden lg:flex flex-col items-center gap-1 pointer-events-none"
            style={{
              top: a.top,
              left: a.left,
              animation: `float 6s ease-in-out infinite`,
              animationDelay: a.delay,
            }}
            aria-hidden
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-lg border-2 border-white/30"
              style={{ background: a.color }}
            >
              {a.initials}
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white shadow-sm" style={{ background: a.color }}>
              {a.mood}
            </span>
          </div>
        ))}

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>

        {/* badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "hsl(184 90% 41%)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "hsl(184 90% 41%)" }} />
          </span>
          Live in 48 cities right now
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.92] mb-6 max-w-4xl">
          Spontaneous<br />
          <span style={{ color: "hsl(243 75% 59%)" }}>real-world</span><br />
          connection.
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mb-10 leading-relaxed">
          Declare you're open to meeting. Discover interesting people nearby who are available right now — for a coffee, a chat, or just a walk.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/signup">
            <Button size="lg" className="text-base px-8 h-13 font-semibold shadow-lg shadow-primary/25">
              Start your first session
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="text-base px-8 h-13">
              See how it works
            </Button>
          </a>
        </div>

        {/* live activity ticker */}
        <div className="mb-12 flex items-center gap-3 rounded-full border border-border bg-muted/50 backdrop-blur-sm px-5 py-2.5 max-w-full overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 flex-shrink-0">Live</span>
          <div className="w-px h-4 bg-border flex-shrink-0" />
          <ActivityTicker />
        </div>

        {/* mini dashboard preview */}
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-muted-foreground font-mono">iamhere.app / dashboard</span>
          </div>
          <div className="relative bg-slate-900 h-64 flex items-center justify-center overflow-hidden">
            {/* mock map grid */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: "linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(15,23,42,0.8) 100%)" }} />

            {/* mock user pins */}
            {[
              { x: "40%", y: "35%", color: "#6366f1", label: "MK · Chill", you: false },
              { x: "62%", y: "55%", color: "#0d9488", label: "SR · Talkative", you: false },
              { x: "28%", y: "62%", color: "#ec4899", label: "You", you: true },
              { x: "72%", y: "30%", color: "#f59e0b", label: "JL · Creative", you: false },
            ].map((pin) => (
              <div key={pin.label} className="absolute flex flex-col items-center" style={{ left: pin.x, top: pin.y, transform: "translate(-50%, -50%)" }}>
                <div
                  className="w-9 h-9 rounded-full border-2 border-white/40 flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                  style={{ background: pin.color, boxShadow: pin.you ? `0 0 0 6px ${pin.color}40` : undefined }}
                >
                  {pin.label.split(" · ")[0].slice(0, 2)}
                </div>
                {!pin.you && (
                  <span className="mt-1 text-[9px] text-white/80 bg-black/50 px-1.5 py-0.5 rounded whitespace-nowrap">{pin.label}</span>
                )}
                {pin.you && (
                  <span className="mt-1 text-[9px] font-semibold text-white bg-primary/80 px-1.5 py-0.5 rounded whitespace-nowrap">You</span>
                )}
              </div>
            ))}

            {/* ping animation */}
            <div className="absolute" style={{ left: "28%", top: "62%", transform: "translate(-50%, -50%)" }}>
              <div
                className="absolute rounded-full border-2 border-primary"
                style={{
                  width: 56, height: 56,
                  left: -28, top: -28,
                  opacity: pingAnimating ? 0 : 0.7,
                  transform: pingAnimating ? "scale(2.5)" : "scale(1)",
                  transition: pingAnimating ? "all 0.8s ease-out" : "none",
                }}
              />
            </div>
          </div>

          {/* bottom bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-card">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-medium">4 people nearby</span>
            </div>
            <span className="text-xs text-muted-foreground">within 2 km · updated live</span>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-border bg-muted/30 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STAT_ITEMS.map((s) => (
            <StatCounter key={s.label} target={s.target} format={s.format} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-4 max-w-5xl mx-auto w-full">
        <FadeUp>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(243 75% 59%)" }}>How it works</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Three steps to a real connection</h2>
          </div>
        </FadeUp>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.12}>
              <div className="relative rounded-2xl border border-border bg-card p-8 h-full hover:border-primary/40 transition-colors group">
                <div className="text-6xl font-black opacity-10 group-hover:opacity-20 transition-opacity leading-none mb-4 tracking-tighter" style={{ color: "hsl(243 75% 59%)" }}>
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── MOODS ── */}
      <section className="py-20 px-4 bg-muted/20 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <FadeUp>
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(184 90% 41%)" }}>Express yourself</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight">What's your mood today?</h2>
              <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">Your mood tells people what kind of connection you're looking for — before you even say a word.</p>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {MOODS.map((mood, i) => (
              <FadeUp key={mood.label} delay={i * 0.08}>
                <div
                  className="rounded-2xl p-5 text-center hover:scale-105 transition-transform cursor-default border"
                  style={{ background: mood.bg, borderColor: mood.color + "30" }}
                >
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: mood.color }}
                  >
                    <div className="w-3 h-3 rounded-full bg-white/70" />
                  </div>
                  <div className="font-bold text-sm mb-1" style={{ color: mood.color }}>{mood.label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mood.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4 max-w-5xl mx-auto w-full">
        <FadeUp>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(243 75% 59%)" }}>Everything you need</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Built for spontaneity,<br />designed for trust</h2>
          </div>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <FadeUp key={feat.title} delay={i * 0.08}>
              <div className="rounded-2xl border border-border bg-card p-6 h-full hover:border-primary/40 transition-colors group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-primary transition-transform group-hover:scale-110" style={{ background: "hsl(243 75% 59% / 0.1)" }}>
                  {feat.icon}
                </div>
                <h3 className="font-bold text-base mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── SAFETY ── */}
      <section id="safety" className="py-20 px-4 border-y border-border" style={{ background: "hsl(243 75% 59% / 0.04)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeUp>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "hsl(243 75% 59%)" }}>Safety first</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6">
                  Your safety is not a feature —<br />
                  <span style={{ color: "hsl(243 75% 59%)" }}>it's the foundation.</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Every decision in I AM HERE was made with your safety in mind. We don't compromise on privacy or control.
                </p>
              </div>
            </FadeUp>
            <div className="space-y-4">
              {[
                { title: "Blurred location", detail: "Your exact coordinates are never shown. We offset your position by 300–500 meters on the map." },
                { title: "Location revealed only on mutual accept", detail: "Precise coordinates are only exchanged when both parties agree to meet." },
                { title: "Ping rate limiting", detail: "You can only send a limited number of pings per session to prevent harassment." },
                { title: "Auto-expiring sessions", detail: "When your time is up, you disappear from the map. No ghost profiles." },
                { title: "Block and report, instantly", detail: "One tap to block or report anyone, no questions asked. Blocked users can never see you." },
              ].map((item, i) => (
                <FadeUp key={item.title} delay={i * 0.08}>
                  <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
                    <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(184 90% 41%)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</div>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-4 max-w-5xl mx-auto w-full">
        <FadeUp>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(243 75% 59%)" }}>Real stories</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">People are connecting</h2>
          </div>
        </FadeUp>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeUp key={t.name} delay={i * 0.12}>
              <div className="rounded-2xl border border-border bg-card p-7 h-full flex flex-col">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 mb-4 opacity-20">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                </svg>
                <p className="text-muted-foreground leading-relaxed flex-1 text-sm">{t.text}</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.location}</div>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4">
        <FadeUp>
          <div className="max-w-3xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden text-white" style={{ background: "hsl(243 75% 59%)" }}>
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 bg-white" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-20 bg-white" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Join people online right now
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                Someone interesting is<br />nearby right now.
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                Create your presence, set your mood, and discover who's open to connecting.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="bg-white font-semibold text-base px-8" style={{ color: "hsl(243 75% 59%)" }}>
                    Create your account — it's free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="ghost" className="text-white border-white/30 border text-base px-8 hover:bg-white/10">
                    Already have an account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "hsl(243 75% 59%)" }}>
              IH
            </div>
            <span className="font-bold tracking-tight">I AM HERE</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Built for spontaneous, safe, real-world human connection.
          </p>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
