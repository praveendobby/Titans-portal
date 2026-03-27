const suggestions = [
  "What can the Titans Portal do?",
  "How do I get started?",
  "I'd like a demo",
  "Tell me about pricing",
];

let messages = [];
let loading = false;

function createChatUI() {
  document.body.insertAdjacentHTML("beforeend", `
    <button class="titans-fab" id="titansFab" aria-label="Open chat">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
    <div class="titans-window" id="titansWindow">
      <div class="titans-header">
        <div class="titans-brand">
          <div class="titans-avatar">T</div>
          <div>
            <div class="titans-name">Titan AI</div>
            <div class="titans-status"><span class="titans-dot"></span> Online · Ready to help</div>
          </div>
        </div>
        <button class="titans-close-btn" id="titansClose">&#x2715;</button>
      </div>
      <div class="titans-messages" id="titansMessages"></div>
      <div class="titans-suggestions" id="titansSuggestions"></div>
      <div class="titans-input-area">
        <div class="titans-input-row">
          <input class="titans-input" id="titansInput" placeholder="Ask me anything..." />
          <button class="titans-send" id="titansSend">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="titans-footer">Powered by Claude AI &middot; Titans Portal</div>
      </div>
    </div>
  `);

  // Add welcome message
  addMessage("assistant", "Hey! I'm Titan 👋 Your AI guide to the Titans Portal. How can I help you today?");

  // Add suggestions
  const sugBox = document.getElementById("titansSuggestions");
  suggestions.forEach(q => {
    const btn = document.createElement("button");
    btn.className = "titans-chip";
    btn.textContent = q;
    btn.onclick = () => sendMessage(q);
    sugBox.appendChild(btn);
  });

  // Events
  document.getElementById("titansFab").onclick = toggleChat;
  document.getElementById("titansClose").onclick = toggleChat;
  document.getElementById("titansSend").onclick = () => sendMessage();
  document.getElementById("titansInput").addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });
}

function toggleChat() {
  document.getElementById("titansWindow").classList.toggle("open");
}

function addMessage(role, content) {
  messages.push({ role, content });
  const container = document.getElementById("titansMessages");
  const div = document.createElement("div");
  div.className = `titans-msg ${role}`;
  div.innerHTML = `
    <div class="titans-msg-avatar">${role === "assistant" ? "T" : "U"}</div>
    <div class="titans-bubble">${content}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  // Hide suggestions after first user message
  if (role === "user") {
    document.getElementById("titansSuggestions").style.display = "none";
  }
}

function showTyping() {
  const container = document.getElementById("titansMessages");
  const div = document.createElement("div");
  div.className = "titans-msg assistant";
  div.id = "titansTyping";
  div.innerHTML = `
    <div class="titans-msg-avatar">T</div>
    <div class="titans-bubble"><div class="titans-typing"><span></span><span></span><span></span></div></div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("titansTyping");
  if (el) el.remove();
}

async function sendMessage(text) {
  const input = document.getElementById("titansInput");
  const userMessage = text || input.value.trim();
  if (!userMessage || loading) return;
  input.value = "";
  loading = true;

  addMessage("user", userMessage);
  showTyping();

  const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "Sorry, I couldn't process that.";
    const cleanText = rawText.replace(/\[LEAD_CAPTURED:[^\]]*\]/g, "").trim();

    hideTyping();
    addMessage("assistant", cleanText);
  } catch {
    hideTyping();
    addMessage("assistant", "Oops! Something went wrong. Please try again.");
  } finally {
    loading = false;
  }
}

document.addEventListener("DOMContentLoaded", createChatUI);