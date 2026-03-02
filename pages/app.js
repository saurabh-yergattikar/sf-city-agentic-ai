import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

const AGENT_DISPLAY = {
  search_building_permits: { name: "Permits Agent", icon: "📋" },
  search_dbi_complaints: { name: "Complaints Agent", icon: "🔍" },
  search_dbi_violations: { name: "Violations Agent", icon: "⚠️" },
  search_311_cases: { name: "311 Cases Agent", icon: "📱" },
  search_businesses: { name: "Business Intel Agent", icon: "🏪" },
  search_fire_violations: { name: "Fire Safety Agent", icon: "🔥" },
  search_eviction_notices: { name: "Eviction History Agent", icon: "📄" },
  search_street_trees: { name: "Urban Forestry Agent", icon: "🌳" },
  search_adu_permits: { name: "ADU Research Agent", icon: "🏠" },
  investigate_address: { name: "Full Investigation Agent", icon: "🕵️" },
  sf_municipal_code_lookup: { name: "Legal Research Agent", icon: "⚖️" },
  lookup_parcel_zoning: { name: "Zoning Lookup Agent", icon: "🗺️" },
  lookup_property_details: { name: "Property Details Agent", icon: "🏗️" },
  get_street_zoning_summary: { name: "Street Zoning Agent", icon: "🛣️" },
  get_comparable_properties: { name: "Market Comparables Agent", icon: "📊" },
};

function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/### (.*)/g, '<h3 style="font-size:15px;font-weight:700;color:#FAFAFA;margin:16px 0 8px">$1</h3>')
    .replace(/## (.*)/g, '<h2 style="font-size:16px;font-weight:700;color:#FAFAFA;margin:20px 0 8px">$1</h2>')
    .replace(/# (.*)/g, '<h1 style="font-size:18px;font-weight:700;color:#FAFAFA;margin:20px 0 8px">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FAFAFA;font-weight:600">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code style="background:#27272A;padding:1px 5px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:0.85em">$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
  return html;
}

function AgentPulse({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10 }}>
      <span style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", backgroundColor: color, animation: "pulse-ring 1.5s ease-out infinite" }} />
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color, position: "relative", zIndex: 1 }} />
    </span>
  );
}

function AgentCard({ agent, status, resultCount, input }) {
  const display = AGENT_DISPLAY[agent] || { name: agent, icon: "🔧" };
  const isComplete = status === "complete";
  // Show what it's querying
  const queryHint = input ? (input.address || input.street_name || input.neighborhood || input.topic || "").slice(0, 40) : "";
  return (
    <div style={{ border: `1px solid ${isComplete ? "#22C55E22" : "#27272A"}`, background: isComplete ? "linear-gradient(135deg, #0D1F14, #0F0F12)" : "linear-gradient(135deg, #18181B, #0F0F12)", borderRadius: 12, padding: "12px 14px", marginBottom: 6, animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15 }}>{display.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FAFAFA" }}>{display.name}</span>
          {queryHint && <span style={{ fontSize: 11, color: "#52525B", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {queryHint}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {!isComplete ? (
            <><AgentPulse color="#F97316" /><span style={{ fontSize: 10, color: "#F97316", fontWeight: 500 }}>INVESTIGATING</span></>
          ) : (
            <><span style={{ fontSize: 10, color: "#22C55E" }}>●</span><span style={{ fontSize: 10, color: "#22C55E", fontWeight: 500 }}>DONE{resultCount !== "N/A" && resultCount !== undefined ? ` · ${resultCount} records` : ""}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

const EXAMPLE_QUERIES = [
  { emoji: "☕", text: "I want to open a coffee shop on Valencia Street" },
  { emoji: "🥶", text: "My landlord hasn't fixed my heater in 3 weeks" },
  { emoji: "🏠", text: "I want to build an ADU in the Sunset" },
  { emoji: "🕵️", text: "Investigate 1200 Market Street before I rent there" },
  { emoji: "🌳", text: "Dead tree about to fall on Fulton Street" },
  { emoji: "🗺️", text: "What's the zoning on 24th Street in the Mission?" },
];

export default function AppPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeAgents]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(queryText = null) {
    const text = queryText || input;
    if (!text.trim() || isLoading) return;

    setInput("");
    setIsLoading(true);
    setActiveAgents([]);

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let agents = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "tool_call") {
                agents = [...agents, { agent: event.agent, status: "running", id: event.id, input: event.input }];
                setActiveAgents([...agents]);
              } else if (event.type === "tool_result") {
                agents = agents.map((a) =>
                  a.id === event.id ? { ...a, status: "complete", resultCount: event.resultCount } : a
                );
                setActiveAgents([...agents]);
              } else if (event.type === "text") {
                fullText += event.content;
                setMessages((prev) => {
                  const streamIdx = prev.findIndex((m) => m.role === "assistant" && m.isStreaming);
                  if (streamIdx >= 0) {
                    const updated = [...prev];
                    updated[streamIdx] = { role: "assistant", content: fullText, agents: [...agents], isStreaming: true };
                    return updated;
                  }
                  return [...prev, { role: "assistant", content: fullText, agents: [...agents], isStreaming: true }];
                });
              } else if (event.type === "done") {
                setMessages((prev) => prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m));
              } else if (event.type === "error") {
                setMessages((prev) => [...prev, { role: "assistant", content: event.content, isError: true }]);
              }
            } catch (e) { /* skip malformed */ }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again.", isError: true }]);
    }

    setIsLoading(false);
    setActiveAgents([]);
    inputRef.current?.focus();
  }

  function clearChat() {
    setMessages([]);
    setActiveAgents([]);
    inputRef.current?.focus();
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      <Head>
        <title>SF City Agent — Ask Anything About SF</title>
        <meta name="description" content="AI-powered investigation of real SF city data." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏙️</text></svg>" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#09090B", color: "#E4E4E7", fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
          @keyframes pulse-ring { 0% { transform: scale(1); opacity: .8 } 100% { transform: scale(2.5); opacity: 0 } }
          @keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px) } 100% { opacity: 1; transform: translateY(0) } }
          @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
          .shimmer { background: linear-gradient(90deg, #71717A 25%, #A1A1AA 50%, #71717A 75%); background-size: 200% 100%; animation: shimmer 2s infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          * { box-sizing: border-box; margin: 0 }
          ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-thumb { background: #27272A; border-radius: 2px }
        `}</style>

        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #1A1A1E", backgroundColor: "#09090Bee", backdropFilter: "blur(12px)", padding: "12px 20px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13 }}>SF</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAFA" }}>SF City Agent</div>
                  <div style={{ fontSize: 10, color: "#71717A", fontWeight: 500 }}>Real city data • AI-powered</div>
                </div>
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {hasMessages && (
                <button onClick={clearChat} style={{ background: "transparent", border: "1px solid #27272A", borderRadius: 8, padding: "5px 12px", color: "#71717A", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
                  + New Chat
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <AgentPulse color="#22C55E" />
                <span style={{ fontSize: 10, color: "#22C55E", fontWeight: 500 }}>Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={{ flex: 1, overflowY: "auto", paddingBottom: 160 }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 20px 0" }}>

            {/* Empty state */}
            {!hasMessages && (
              <div style={{ textAlign: "center", paddingTop: 60, animation: "fadeIn 0.5s ease-out" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏙️</div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#FAFAFA", marginBottom: 8, letterSpacing: "-0.02em" }}>
                  What do you need from the city?
                </h1>
                <p style={{ fontSize: 14, color: "#71717A", maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.6 }}>
                  Ask anything about San Francisco — permits, tenant rights, zoning, business, city services. I'll investigate real city databases and build your action plan.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 540, margin: "0 auto" }}>
                  {EXAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(q.text)}
                      style={{
                        textAlign: "left", padding: "12px 14px", borderRadius: 12,
                        border: "1px solid #27272A", background: "#111113",
                        color: "#A1A1AA", fontSize: 13, fontWeight: 500,
                        cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
                        lineHeight: 1.5,
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#F9731644"; e.currentTarget.style.color = "#FAFAFA"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "#27272A"; e.currentTarget.style.color = "#A1A1AA"; }}
                    >
                      <span style={{ fontSize: 18, marginRight: 8 }}>{q.emoji}</span>{q.text}
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: 11, color: "#3F3F46", marginTop: 24 }}>
                  Powered by 12 live databases from DataSF · 16 AI agents · Free forever
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 20, animation: "fadeIn 0.4s ease-out" }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "linear-gradient(135deg, #F97316, #DC5F0A)", borderRadius: "18px 18px 4px 18px", padding: "11px 16px", maxWidth: "80%", fontSize: 14, fontWeight: 500, color: "white", lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700 }}>SF</div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#71717A" }}>SF City Agent</span>
                      {msg.isStreaming && <span className="shimmer" style={{ fontSize: 12, fontWeight: 500 }}>investigating...</span>}
                    </div>

                    {msg.agents && msg.agents.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                          🔍 {msg.agents.filter(a => a.status === "complete").length}/{msg.agents.length} agents complete
                        </div>
                        {msg.agents.map((a, j) => (
                          <AgentCard key={j} agent={a.agent} status={a.status} resultCount={a.resultCount} input={a.input} />
                        ))}
                      </div>
                    )}

                    {msg.content && (
                      <div
                        style={{ fontSize: 14, color: msg.isError ? "#F87171" : "#D4D4D8", lineHeight: 1.75 }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Loading agents before text */}
            {isLoading && activeAgents.length > 0 && !messages.find(m => m.isStreaming) && (
              <div style={{ marginBottom: 20, animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700 }}>SF</div>
                  <span className="shimmer" style={{ fontSize: 12, fontWeight: 500 }}>investigating...</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#52525B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  🔍 {activeAgents.filter(a => a.status === "complete").length}/{activeAgents.length} agents
                </div>
                {activeAgents.map((a, j) => (
                  <AgentCard key={j} agent={a.agent} status={a.status} resultCount={a.resultCount} input={a.input} />
                ))}
              </div>
            )}

            {/* Initial loading */}
            {isLoading && activeAgents.length === 0 && !messages.find(m => m.isStreaming) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, animation: "fadeIn 0.4s ease-out" }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #F97316, #EA580C)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700 }}>SF</div>
                <span className="shimmer" style={{ fontSize: 13, fontWeight: 500 }}>Analyzing your request and dispatching agents...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input bar */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, #09090B 60%, transparent)", paddingTop: 32, paddingBottom: 20, paddingLeft: 16, paddingRight: 16 }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#18181B", border: "1px solid #27272A", borderRadius: 16, padding: "10px 14px", transition: "border-color 0.2s" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Ask about permits, tenant rights, zoning, city services..."
                disabled={isLoading}
                style={{
                  flex: 1, backgroundColor: "transparent", border: "none", outline: "none",
                  fontSize: 14, color: "#FAFAFA", fontFamily: "inherit",
                  padding: "4px 0",
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: "8px 20px", borderRadius: 12, border: "none",
                  background: isLoading || !input.trim() ? "#27272A" : "linear-gradient(135deg, #F97316, #EA580C)",
                  color: isLoading || !input.trim() ? "#52525B" : "white",
                  fontSize: 13, fontWeight: 600, cursor: isLoading || !input.trim() ? "default" : "pointer",
                  fontFamily: "inherit", transition: "all .2s",
                }}
              >
                {isLoading ? "Investigating..." : "Investigate"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
              <span style={{ fontSize: 10, color: "#3F3F46" }}>Real data from DataSF · Not legal advice · Verify with city departments</span>
              <span style={{ fontSize: 10, color: "#3F3F46" }}>Free & Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
