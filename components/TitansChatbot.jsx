import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are Titan, an AI assistant for the Titans Portal. You are helpful, professional, and friendly.

Your goals:
1. Answer user questions about the portal accurately and helpfully.
2. Capture leads naturally — when a user shows interest in a service, demo, or partnership, politely ask for their name and email. Store captured leads in your responses with a special format: [LEAD_CAPTURED: name="...", email="..."]

Keep responses concise (2-4 sentences). Be conversational and warm. If you capture a lead, confirm it and say someone will reach out soon.`;

const suggestedQuestions = [
  "What can the Titans Portal do?",
  "How do I get started?",
  "I'd like a demo",
  "Tell me about pricing",
];

export default function TitansChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey! I'm Titan 👋 Your AI guide to the Titans Portal. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [showLeads, setShowLeads] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const extractLead = (text) => {
    const match = text.match(/\[LEAD_CAPTURED:\s*name="([^"]*)",\s*email="([^"]*)"\]/);
    if (match) {
      return { name: match[1], email: match[2], time: new Date().toLocaleTimeString() };
    }
    return null;
  };

  const cleanText = (text) =>
    text.replace(/\[LEAD_CAPTURED:[^\]]*\]/g, "").trim();

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      const data = await response.json();
      const rawText = data.content?.[0]?.text || "Sorry, I couldn't process that. Try again!";

      const lead = extractLead(rawText);
      if (lead) setLeads((prev) => [...prev, lead]);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: cleanText(rawText) },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oops! Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .titans-chat * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }

        .titans-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 9999;
          width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
          background: linear-gradient(135deg, #0f1923 0%, #1a3a5c 50%, #0066cc 100%);
          box-shadow: 0 4px 24px rgba(0,102,204,0.45), 0 0 0 0 rgba(0,102,204,0.3);
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          animation: fabPulse 2.5s infinite;
        }
        .titans-fab:hover { transform: scale(1.08); box-shadow: 0 6px 30px rgba(0,102,204,0.6); }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(0,102,204,0.45), 0 0 0 0 rgba(0,102,204,0.3); }
          50% { box-shadow: 0 4px 24px rgba(0,102,204,0.45), 0 0 0 10px rgba(0,102,204,0); }
        }
        .titans-fab svg { transition: transform 0.3s; }
        .titans-fab.open svg { transform: rotate(45deg); }

        .titans-window {
          position: fixed; bottom: 100px; right: 28px; z-index: 9998;
          width: 380px; height: 560px;
          background: #0a0f1a;
          border: 1px solid rgba(0,102,204,0.25);
          border-radius: 20px;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
          transform-origin: bottom right;
          animation: windowIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }
        @keyframes windowIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .titans-header {
          padding: 18px 20px 14px;
          background: linear-gradient(135deg, #0f1923 0%, #122a45 100%);
          border-bottom: 1px solid rgba(0,102,204,0.2);
          flex-shrink: 0;
        }
        .titans-header-top { display: flex; align-items: center; justify-content: space-between; }
        .titans-brand { display: flex; align-items: center; gap: 10px; }
        .titans-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #0066cc, #00aaff);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px; color: #fff;
          box-shadow: 0 2px 12px rgba(0,102,204,0.5);
        }
        .titans-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px; color: #fff; }
        .titans-status { font-size: 11px; color: #4db8ff; font-weight: 400; display: flex; align-items: center; gap: 4px; }
        .titans-dot { width: 6px; height: 6px; border-radius: 50%; background: #22d366; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .titans-header-btn {
          background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4);
          padding: 4px; border-radius: 6px; transition: color 0.2s, background 0.2s;
          display: flex; align-items: center;
        }
        .titans-header-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .titans-messages {
          flex: 1; overflow-y: auto; padding: 16px 16px 8px;
          display: flex; flex-direction: column; gap: 12px;
          scrollbar-width: thin; scrollbar-color: rgba(0,102,204,0.3) transparent;
        }
        .titans-messages::-webkit-scrollbar { width: 4px; }
        .titans-messages::-webkit-scrollbar-thumb { background: rgba(0,102,204,0.3); border-radius: 4px; }

        .titans-msg { display: flex; gap: 8px; animation: msgIn 0.2s ease; }
        @keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .titans-msg.user { flex-direction: row-reverse; }
        .titans-msg-avatar {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, #0066cc, #00aaff);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 10px; color: #fff;
        }
        .titans-msg.user .titans-msg-avatar { background: linear-gradient(135deg, #1a3a5c, #2d5a8e); }
        .titans-bubble {
          max-width: 78%; padding: 10px 14px; border-radius: 14px;
          font-size: 13.5px; line-height: 1.5; color: #e8edf5;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .titans-msg.user .titans-bubble {
          background: linear-gradient(135deg, #0052a3, #0066cc);
          border-color: rgba(0,136,255,0.3); color: #fff;
          border-radius: 14px 4px 14px 14px;
        }
        .titans-msg.assistant .titans-bubble { border-radius: 4px 14px 14px 14px; }

        .titans-typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
        .titans-typing span {
          width: 6px; height: 6px; border-radius: 50%; background: #4db8ff;
          animation: typingDot 1.2s infinite;
        }
        .titans-typing span:nth-child(2) { animation-delay: 0.2s; }
        .titans-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingDot { 0%,60%,100%{opacity:0.2;transform:scale(0.8)} 30%{opacity:1;transform:scale(1)} }

        .titans-suggestions {
          padding: 8px 16px 4px; display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0;
        }
        .titans-chip {
          padding: 5px 11px; border-radius: 20px; font-size: 11.5px; cursor: pointer;
          background: rgba(0,102,204,0.12); border: 1px solid rgba(0,102,204,0.3);
          color: #4db8ff; transition: all 0.15s; white-space: nowrap;
        }
        .titans-chip:hover { background: rgba(0,102,204,0.25); border-color: rgba(0,136,255,0.5); color: #80ccff; }

        .titans-input-area {
          padding: 12px 16px 16px; flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.2);
        }
        .titans-input-row { display: flex; gap: 8px; align-items: center; }
        .titans-input {
          flex: 1; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          padding: 10px 14px; font-size: 13.5px; color: #e8edf5;
          outline: none; transition: border-color 0.2s, background 0.2s;
          font-family: 'DM Sans', sans-serif; resize: none;
        }
        .titans-input::placeholder { color: rgba(255,255,255,0.25); }
        .titans-input:focus { border-color: rgba(0,102,204,0.5); background: rgba(255,255,255,0.08); }
        .titans-send {
          width: 40px; height: 40px; border-radius: 12px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #0052a3, #0099ff);
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s, box-shadow 0.15s; flex-shrink: 0;
          box-shadow: 0 2px 12px rgba(0,102,204,0.4);
        }
        .titans-send:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0,102,204,0.6); }
        .titans-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .titans-footer { text-align: center; font-size: 10px; color: rgba(255,255,255,0.15); margin-top: 8px; letter-spacing: 0.5px; }

        /* Lead panel */
        .titans-leads-panel {
          position: fixed; bottom: 100px; right: 420px; z-index: 9997;
          width: 280px; background: #0a0f1a;
          border: 1px solid rgba(0,102,204,0.25); border-radius: 16px;
          padding: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          animation: windowIn 0.2s ease;
        }
        .titans-leads-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; color: #4db8ff; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .titans-lead-item { padding: 8px 10px; background: rgba(0,102,204,0.08); border: 1px solid rgba(0,102,204,0.15); border-radius: 8px; margin-bottom: 6px; }
        .titans-lead-name { font-size: 12px; font-weight: 500; color: #e8edf5; }
        .titans-lead-email { font-size: 11px; color: #4db8ff; }
        .titans-lead-time { font-size: 10px; color: rgba(255,255,255,0.25); margin-top: 2px; }
        .titans-lead-badge {
          position: absolute; top: -6px; right: -6px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #ff4444; font-size: 10px; font-weight: 700; color: #fff;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #0a0f1a;
        }
      `}</style>

      <div className="titans-chat">
        {/* FAB Button */}
        <button
          className={`titans-fab ${open ? "open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Open chat"
          style={{ position: "fixed" }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
          {!open && leads.length > 0 && (
            <span className="titans-lead-badge">{leads.length}</span>
          )}
        </button>

        {/* Leads Panel */}
        {open && leads.length > 0 && showLeads && (
          <div className="titans-leads-panel">
            <div className="titans-leads-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Captured Leads ({leads.length})
            </div>
            {leads.map((l, i) => (
              <div className="titans-lead-item" key={i}>
                <div className="titans-lead-name">{l.name}</div>
                <div className="titans-lead-email">{l.email}</div>
                <div className="titans-lead-time">{l.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* Chat Window */}
        {open && (
          <div className="titans-window">
            {/* Header */}
            <div className="titans-header">
              <div className="titans-header-top">
                <div className="titans-brand">
                  <div className="titans-avatar">T</div>
                  <div>
                    <div className="titans-name">Titan AI</div>
                    <div className="titans-status"><span className="titans-dot" />Online · Ready to help</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {leads.length > 0 && (
                    <button className="titans-header-btn" onClick={() => setShowLeads(v => !v)} title="View leads">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      <span style={{ fontSize: "11px", marginLeft: "3px", color: "#4db8ff" }}>{leads.length}</span>
                    </button>
                  )}
                  <button className="titans-header-btn" onClick={() => setMessages([{ role: "assistant", content: "Hey! I'm Titan 👋 Your AI guide to the Titans Portal. How can I help you today?" }])} title="New chat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="titans-messages">
              {messages.map((m, i) => (
                <div className={`titans-msg ${m.role}`} key={i}>
                  <div className="titans-msg-avatar">{m.role === "assistant" ? "T" : "U"}</div>
                  <div className="titans-bubble">{m.content}</div>
                </div>
              ))}
              {loading && (
                <div className="titans-msg assistant">
                  <div className="titans-msg-avatar">T</div>
                  <div className="titans-bubble"><div className="titans-typing"><span /><span /><span /></div></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions */}
            {messages.length <= 2 && (
              <div className="titans-suggestions">
                {suggestedQuestions.map((q) => (
                  <button key={q} className="titans-chip" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="titans-input-area">
              <div className="titans-input-row">
                <input
                  ref={inputRef}
                  className="titans-input"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                />
                <button className="titans-send" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div className="titans-footer">Powered by Claude AI · Titans Portal</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}