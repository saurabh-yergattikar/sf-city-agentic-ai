import Head from "next/head";
import Link from "next/link";

const STATS = [
  { number: "12", label: "Live City Databases" },
  { number: "16", label: "AI Agents" },
  { number: "70+", label: "Use Cases" },
  { number: "$0", label: "Cost — Forever Free" },
];

const EXAMPLES = [
  { emoji: "🕵️", title: "Investigate Any Address", desc: "Full history — permits, violations, complaints, fire safety, evictions — from real city records. Before you sign a lease or buy.", tag: "Real data" },
  { emoji: "🥶", title: "Know Your Tenant Rights", desc: "Broken heater? Bad landlord? Get exact legal rights, rent reduction amounts, escalation plan, and demand letter drafted.", tag: "Legal + Data" },
  { emoji: "☕", title: "Open a Business", desc: "Exact zoning verification, permit list, competition analysis, timeline, costs — from idea to open doors.", tag: "Real data" },
  { emoji: "🏠", title: "Build an ADU", desc: "Your exact lot size, zoning, max ADU dimensions, permit timeline, free grants, rental income projections.", tag: "Real data" },
  { emoji: "🌳", title: "Report City Issues", desc: "Trees, potholes, hazards — who to call, how to file, how to protect yourself legally.", tag: "Guidance" },
  { emoji: "🗺️", title: "Research Neighborhoods", desc: "Complaint patterns, eviction rates, construction activity, 311 trends — all real city data.", tag: "Real data" },
];

const DATA_SOURCES = [
  "Building Permits", "DBI Complaints", "DBI Violations", "311 Cases",
  "Registered Businesses", "Fire Violations", "Street Trees", "Eviction Notices",
  "Parcel Zoning", "Assessor Property Records", "Zoning Districts", "Planning Permits",
];

export default function Landing() {
  return (
    <>
      <Head>
        <title>SF City Agent — Free AI Navigator for San Francisco</title>
        <meta name="description" content="Navigate SF bureaucracy with AI. Real city data, real answers, real shortcuts. Free and open source." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏙️</text></svg>" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", backgroundColor: "#09090B", color: "#E4E4E7", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Nav */}
        <nav style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13 }}>SF</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#FAFAFA" }}>SF City Agent</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="https://github.com" target="_blank" rel="noopener" style={{ fontSize: 13, color: "#71717A", textDecoration: "none", fontWeight: 500 }}>GitHub</a>
            <Link href="/app" style={{ fontSize: 13, fontWeight: 600, color: "white", backgroundColor: "#F97316", padding: "8px 20px", borderRadius: 10, textDecoration: "none" }}>
              Use It Free →
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "#22C55E12", border: "1px solid #22C55E33", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22C55E", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 600 }}>FREE & OPEN SOURCE</span>
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: "#FAFAFA", letterSpacing: "-0.035em", lineHeight: 1.08, marginBottom: 20 }}>
            Navigate San Francisco<br />in 2 minutes, not 2 weeks.
          </h1>
          <p style={{ fontSize: 18, color: "#71717A", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.7 }}>
            AI agents investigate <strong style={{ color: "#A1A1AA" }}>real city databases</strong> — permits, violations, zoning, property records — and build your action plan. No mock data. No guesswork.
          </p>
          <Link href="/app" style={{ display: "inline-block", fontSize: 16, fontWeight: 700, color: "white", background: "linear-gradient(135deg, #F97316, #EA580C)", padding: "14px 36px", borderRadius: 14, textDecoration: "none", marginBottom: 12 }}>
            Start Investigating — It's Free
          </Link>
          <p style={{ fontSize: 12, color: "#52525B", marginTop: 12 }}>No signup. No cost. No data stored.</p>
        </div>

        {/* Stats */}
        <div style={{ maxWidth: 700, margin: "0 auto 60px", padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "20px 0", borderRadius: 12, border: "1px solid #27272A", background: "#111113" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: i === 3 ? "#22C55E" : "#F97316" }}>{s.number}</div>
              <div style={{ fontSize: 12, color: "#71717A", fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* What It Does */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FAFAFA", textAlign: "center", marginBottom: 8 }}>What can it do?</h2>
          <p style={{ fontSize: 15, color: "#71717A", textAlign: "center", marginBottom: 32 }}>Ask any question about San Francisco in plain English.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {EXAMPLES.map((e, i) => (
              <div key={i} style={{ border: "1px solid #27272A", borderRadius: 14, padding: "20px", background: "#0F0F12" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{e.emoji}</div>
                <div style={{ display: "inline-block", fontSize: 10, fontWeight: 600, color: "#22C55E", backgroundColor: "#22C55E15", padding: "2px 8px", borderRadius: 4, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{e.tag}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FAFAFA", marginBottom: 8 }}>{e.title}</h3>
                <p style={{ fontSize: 13, color: "#71717A", lineHeight: 1.6, margin: 0 }}>{e.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FAFAFA", textAlign: "center", marginBottom: 32 }}>How it works</h2>
          {[
            { n: "1", title: "You ask a question", desc: "\"I want to open a coffee shop on Valencia\" or \"My landlord won't fix my heater\" — anything about SF." },
            { n: "2", title: "AI agents investigate real databases", desc: "16 specialized agents fan out across 12 city databases — permits, violations, zoning, property records, business registries, 311 cases." },
            { n: "3", title: "You get a complete action plan", desc: "Verified data, legal citations, step-by-step timeline, shortcuts the city doesn't tell you, and warnings. In under 2 minutes." },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "20px", border: "1px solid #27272A", borderRadius: 14, background: "#111113", marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{s.n}</div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#FAFAFA", marginBottom: 4 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#71717A", lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Data */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 60px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#FAFAFA", textAlign: "center", marginBottom: 8 }}>Powered by real government data</h2>
          <p style={{ fontSize: 13, color: "#71717A", textAlign: "center", marginBottom: 20 }}>Live data from SF Open Data Portal (DataSF). Updated nightly to annually.</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {DATA_SOURCES.map((d, i) => (
              <span key={i} style={{ fontSize: 12, color: "#A1A1AA", backgroundColor: "#18181B", border: "1px solid #27272A", padding: "6px 12px", borderRadius: 8, fontWeight: 500 }}>{d}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px 60px", textAlign: "center" }}>
          <div style={{ border: "1px solid #F9731644", borderRadius: 20, padding: "40px 32px", background: "linear-gradient(135deg, #1C1508, #111113)" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#FAFAFA", marginBottom: 8 }}>Ready to try it?</h2>
            <p style={{ fontSize: 14, color: "#71717A", marginBottom: 24 }}>No signup. No payment. No data stored. Just ask your question.</p>
            <Link href="/app" style={{ display: "inline-block", fontSize: 16, fontWeight: 700, color: "white", background: "linear-gradient(135deg, #F97316, #EA580C)", padding: "14px 36px", borderRadius: 14, textDecoration: "none" }}>
              Launch SF City Agent →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px", borderTop: "1px solid #1A1A1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#3F3F46" }}>SF City Agent — Free & Open Source. Not legal advice.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="https://github.com" target="_blank" rel="noopener" style={{ fontSize: 12, color: "#52525B", textDecoration: "none" }}>GitHub</a>
            <a href="https://data.sfgov.org" target="_blank" rel="noopener" style={{ fontSize: 12, color: "#52525B", textDecoration: "none" }}>DataSF</a>
          </div>
        </div>
      </div>
    </>
  );
}
