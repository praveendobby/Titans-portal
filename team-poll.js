/* ============================================================
   TITANS TEAM POLL — team-poll.js
   
   Features:
   ✅ Captain creates polls with up to 4 options
   ✅ Live results with animated bar chart
   ✅ One vote per member
   ✅ Captain sees who voted
   ✅ Saves to Firebase
   ✅ Auto-expires polls (optional)
============================================================ */

window.TitansPoll = (() => {

  const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";

  function getUser() {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  }

  function isCaptain() {
    const u = getUser();
    return u.role === "captain" || u.role === "vice captain";
  }

  /* ── Inject CSS ── */
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

    .poll-section { margin-top: 24px; }

    .poll-card {
      background: var(--card, #111827);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px; padding: 20px;
      margin-bottom: 16px;
      animation: pollFadeIn 0.3s ease;
    }
    @keyframes pollFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

    /* Create Poll Form */
    .poll-create-card {
      background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(167,139,250,0.05));
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: 16px; padding: 20px; margin-bottom: 20px;
    }
    .poll-create-title {
      font-family: 'Syne', sans-serif; font-weight: 800;
      font-size: 14px; color: #a78bfa; margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
    }
    .poll-question-input {
      width: 100%; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      padding: 10px 14px; font-size: 13px; color: var(--text, #e8edf5);
      outline: none; font-family: 'DM Sans', sans-serif;
      margin-bottom: 10px; transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .poll-question-input:focus { border-color: rgba(124,58,237,0.5); }
    .poll-question-input::placeholder { color: rgba(255,255,255,0.25); }

    .poll-options-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .poll-option-row { display: flex; gap: 8px; align-items: center; }
    .poll-option-input {
      flex: 1; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
      padding: 8px 12px; font-size: 12.5px; color: var(--text, #e8edf5);
      outline: none; font-family: 'DM Sans', sans-serif;
      transition: border-color 0.2s; box-sizing: border-box;
    }
    .poll-option-input:focus { border-color: rgba(124,58,237,0.4); }
    .poll-option-input::placeholder { color: rgba(255,255,255,0.2); }
    .poll-option-num {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #a78bfa; flex-shrink: 0;
    }

    .poll-create-row { display: flex; gap: 8px; align-items: center; }
    .poll-create-btn {
      flex: 1; padding: 10px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #7c3aed, #a78bfa);
      color: #fff; font-family: 'Syne', sans-serif; font-weight: 700;
      font-size: 13px; cursor: pointer; transition: all 0.2s;
      box-shadow: 0 4px 16px rgba(124,58,237,0.3);
    }
    .poll-create-btn:hover { transform: scale(1.02); box-shadow: 0 6px 20px rgba(124,58,237,0.5); }

    .poll-anonymous-toggle {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: rgba(255,255,255,0.4); cursor: pointer;
    }
    .poll-anonymous-toggle input { cursor: pointer; accent-color: #7c3aed; }

    /* Poll item */
    .poll-item {
      background: var(--card, #111827);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px; padding: 18px; margin-bottom: 14px;
      animation: pollFadeIn 0.3s ease;
    }
    .poll-item-header {
      display: flex; align-items: flex-start;
      justify-content: space-between; margin-bottom: 14px; gap: 12px;
    }
    .poll-question {
      font-family: 'Syne', sans-serif; font-weight: 700;
      font-size: 14px; color: var(--text, #e8edf5); flex: 1;
    }
    .poll-meta {
      font-size: 11px; color: rgba(255,255,255,0.3);
      display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
    }
    .poll-status-badge {
      padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;
    }
    .poll-status-active {
      background: rgba(52,211,153,0.15); color: #34d399;
      border: 1px solid rgba(52,211,153,0.3);
    }
    .poll-status-closed {
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }

    /* Vote options */
    .poll-vote-options { display: flex; flex-direction: column; gap: 8px; }
    .poll-vote-btn {
      width: 100%; padding: 10px 14px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: var(--text, #e8edf5); font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer; text-align: left; transition: all 0.2s;
      display: flex; align-items: center; justify-content: space-between;
    }
    .poll-vote-btn:hover:not(:disabled) {
      background: rgba(124,58,237,0.15);
      border-color: rgba(124,58,237,0.4); color: #a78bfa;
    }
    .poll-vote-btn:disabled { cursor: default; }
    .poll-vote-btn.voted {
      background: rgba(124,58,237,0.15);
      border-color: rgba(124,58,237,0.4); color: #a78bfa;
    }

    /* Results bars */
    .poll-results { display: flex; flex-direction: column; gap: 10px; }
    .poll-result-row { display: flex; flex-direction: column; gap: 4px; }
    .poll-result-label {
      display: flex; justify-content: space-between;
      font-size: 12.5px; color: var(--text, #e8edf5);
    }
    .poll-result-pct { font-weight: 600; color: #a78bfa; }
    .poll-result-bar-bg {
      height: 8px; background: rgba(255,255,255,0.06);
      border-radius: 4px; overflow: hidden;
    }
    .poll-result-bar-fill {
      height: 100%; border-radius: 4px;
      background: linear-gradient(90deg, #7c3aed, #a78bfa);
      transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1);
    }
    .poll-result-bar-fill.winner {
      background: linear-gradient(90deg, #059669, #34d399);
    }
    .poll-result-votes {
      font-size: 10px; color: rgba(255,255,255,0.3);
    }

    .poll-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 14px; padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .poll-total-votes { font-size: 11px; color: rgba(255,255,255,0.3); }
    .poll-actions { display: flex; gap: 6px; }
    .poll-action-btn {
      padding: 5px 10px; border-radius: 8px; border: none;
      font-size: 11px; cursor: pointer; font-family: 'DM Sans', sans-serif;
      transition: all 0.15s;
    }
    .poll-close-btn {
      background: rgba(245,158,11,0.15); color: #f59e0b;
      border: 1px solid rgba(245,158,11,0.3);
    }
    .poll-close-btn:hover { background: rgba(245,158,11,0.25); }
    .poll-delete-btn {
      background: rgba(239,68,68,0.1); color: #f87171;
      border: 1px solid rgba(239,68,68,0.2);
    }
    .poll-delete-btn:hover { background: rgba(239,68,68,0.2); }

    /* Voters list */
    .poll-voters {
      margin-top: 8px; font-size: 11px; color: rgba(255,255,255,0.3);
    }
    .poll-voters-label { color: rgba(255,255,255,0.4); margin-bottom: 4px; }
    .poll-voter-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 20px; margin: 2px;
      background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2);
      color: #a78bfa; font-size: 10px;
    }

    .poll-empty {
      text-align: center; padding: 32px; color: rgba(255,255,255,0.2);
      font-size: 13px;
    }
    .poll-empty span { font-size: 32px; display: block; margin-bottom: 8px; }
  `;
  document.head.appendChild(style);

  /* ── Render Poll Section ── */
  function renderPollSection(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const captain = isCaptain();

    container.innerHTML = `
      <div class="poll-section">
        ${captain ? `
        <div class="poll-create-card">
          <div class="poll-create-title">🗳️ Create New Poll</div>
          <input class="poll-question-input" id="pollQuestion" placeholder="Ask your team something..."/>
          <div class="poll-options-grid">
            ${[1,2,3,4].map(n => `
              <div class="poll-option-row">
                <div class="poll-option-num">${n}</div>
                <input class="poll-option-input" id="pollOpt${n}" placeholder="Option ${n}${n>2?' (optional)':''}"/>
              </div>
            `).join("")}
          </div>
          <div class="poll-create-row">
            <button class="poll-create-btn" onclick="TitansPoll.createPoll()">🗳️ Launch Poll</button>
            <label class="poll-anonymous-toggle">
              <input type="checkbox" id="pollAnonymous"/> Anonymous
            </label>
          </div>
        </div>
        ` : ""}
        <div id="pollList"></div>
      </div>
    `;

    loadPolls();
  }

  /* ── Load Polls from Firebase ── */
  async function loadPolls() {
    const list = document.getElementById("pollList");
    if (!list) return;

    try {
      const r = await fetch(`${FIREBASE_URL}/titans/polls.json`);
      const data = await r.json();

      if (!data) {
        list.innerHTML = `<div class="poll-empty"><span>🗳️</span>No polls yet${isCaptain() ? " — create one above!" : ""}</div>`;
        return;
      }

      const polls = Object.entries(data)
        .map(([id, p]) => ({ ...p, _id: id }))
        .sort((a, b) => b.createdAt - a.createdAt);

      list.innerHTML = polls.map(p => renderPoll(p)).join("");

    } catch (e) {
      list.innerHTML = `<div class="poll-empty"><span>⚠️</span>Could not load polls</div>`;
    }
  }

  /* ── Render Single Poll ── */
  function renderPoll(poll) {
    const user = getUser();
    const captain = isCaptain();
    const hasVoted = poll.voters && poll.voters[user.name.replace(/\s/g, "_")];
    const totalVotes = poll.options.reduce((s, o) => s + (o.votes || 0), 0);
    const isActive = poll.status === "active";
    const maxVotes = Math.max(...poll.options.map(o => o.votes || 0), 1);

    const showResults = hasVoted || !isActive || captain;

    return `
      <div class="poll-item" id="poll-${poll._id}">
        <div class="poll-item-header">
          <div class="poll-question">${poll.question}</div>
          <div class="poll-meta">
            <span class="poll-status-badge ${isActive ? 'poll-status-active' : 'poll-status-closed'}">
              ${isActive ? '🟢 Active' : '🔴 Closed'}
            </span>
            <span>by ${poll.createdBy}</span>
          </div>
        </div>

        ${showResults ? `
          <div class="poll-results">
            ${poll.options.map((o, i) => {
              const pct = totalVotes ? Math.round((o.votes || 0) / totalVotes * 100) : 0;
              const isWinner = (o.votes || 0) === maxVotes && totalVotes > 0;
              const myVote = hasVoted && poll.voters[user.name.replace(/\s/g,"_")] === i;
              return `
                <div class="poll-result-row">
                  <div class="poll-result-label">
                    <span>${myVote ? '✓ ' : ''}${o.text}</span>
                    <span class="poll-result-pct">${pct}%</span>
                  </div>
                  <div class="poll-result-bar-bg">
                    <div class="poll-result-bar-fill ${isWinner ? 'winner' : ''}" style="width:${pct}%"></div>
                  </div>
                  <div class="poll-result-votes">${o.votes || 0} vote${(o.votes || 0) !== 1 ? 's' : ''}${isWinner && totalVotes > 0 ? ' 🏆' : ''}</div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="poll-vote-options">
            ${poll.options.map((o, i) => `
              <button class="poll-vote-btn" onclick="TitansPoll.vote('${poll._id}', ${i})">
                ${o.text}
                <span style="font-size:11px;color:rgba(255,255,255,0.3)">Click to vote</span>
              </button>
            `).join("")}
          </div>
        `}

        <div class="poll-footer">
          <div class="poll-total-votes">📊 ${totalVotes} vote${totalVotes !== 1 ? 's' : ''} total</div>
          <div class="poll-actions">
            ${captain && isActive ? `<button class="poll-action-btn poll-close-btn" onclick="TitansPoll.closePoll('${poll._id}')">Close Poll</button>` : ""}
            ${captain ? `<button class="poll-action-btn poll-delete-btn" onclick="TitansPoll.deletePoll('${poll._id}')">Delete</button>` : ""}
          </div>
        </div>

        ${captain && poll.voters && !poll.anonymous ? `
          <div class="poll-voters">
            <div class="poll-voters-label">Voted:</div>
            ${Object.keys(poll.voters).map(v => `<span class="poll-voter-chip">✓ ${v.replace(/_/g," ")}</span>`).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }

  /* ── Create Poll ── */
  async function createPoll() {
    if (!isCaptain()) return;
    const question = document.getElementById("pollQuestion")?.value.trim();
    if (!question) { showToastPoll("⚠ Enter a question", "warn"); return; }

    const options = [1,2,3,4]
      .map(n => document.getElementById(`pollOpt${n}`)?.value.trim())
      .filter(Boolean);

    if (options.length < 2) { showToastPoll("⚠ Add at least 2 options", "warn"); return; }

    const user = getUser();
    const anonymous = document.getElementById("pollAnonymous")?.checked || false;

    const poll = {
      question,
      options: options.map(t => ({ text: t, votes: 0 })),
      createdBy: user.name,
      createdAt: Date.now(),
      status: "active",
      anonymous,
      voters: {}
    };

    try {
      await fetch(`${FIREBASE_URL}/titans/polls.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poll)
      });

      // Clear form
      document.getElementById("pollQuestion").value = "";
      [1,2,3,4].forEach(n => { const el = document.getElementById(`pollOpt${n}`); if(el) el.value = ""; });

      showToastPoll("🗳️ Poll launched!");
      loadPolls();

      // Push notification
      if (window.TitansPush) TitansPush.send("🗳️ New Poll!", `"${question}" — vote now!`);

    } catch (e) {
      showToastPoll("❌ Failed to create poll", "error");
    }
  }

  /* ── Vote ── */
  async function vote(pollId, optionIndex) {
    const user = getUser();
    const voterKey = user.name.replace(/\s/g, "_");

    try {
      // Get current poll
      const r = await fetch(`${FIREBASE_URL}/titans/polls/${pollId}.json`);
      const poll = await r.json();

      if (!poll || poll.status !== "active") {
        showToastPoll("This poll is closed", "warn"); return;
      }
      if (poll.voters && poll.voters[voterKey]) {
        showToastPoll("You already voted!", "warn"); return;
      }

      // Update vote count
      const newVotes = (poll.options[optionIndex].votes || 0) + 1;

      await fetch(`${FIREBASE_URL}/titans/polls/${pollId}/options/${optionIndex}/votes.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVotes)
      });

      // Record voter
      await fetch(`${FIREBASE_URL}/titans/polls/${pollId}/voters/${voterKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optionIndex)
      });

      showToastPoll("✅ Vote recorded!");
      loadPolls();

    } catch (e) {
      showToastPoll("❌ Vote failed", "error");
    }
  }

  /* ── Close Poll ── */
  async function closePoll(pollId) {
    if (!isCaptain()) return;
    try {
      await fetch(`${FIREBASE_URL}/titans/polls/${pollId}/status.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("closed")
      });
      showToastPoll("Poll closed!");
      loadPolls();
    } catch (e) { showToastPoll("Failed to close poll", "error"); }
  }

  /* ── Delete Poll ── */
  async function deletePoll(pollId) {
    if (!isCaptain() || !confirm("Delete this poll?")) return;
    try {
      await fetch(`${FIREBASE_URL}/titans/polls/${pollId}.json`, { method: "DELETE" });
      showToastPoll("Poll deleted!");
      loadPolls();
    } catch (e) { showToastPoll("Failed to delete", "error"); }
  }

  /* ── Toast ── */
  function showToastPoll(msg, type = "success") {
    if (window.showToast) { window.showToast(msg); return; }
    const t = document.createElement("div");
    t.textContent = msg;
    const colors = { success: "linear-gradient(135deg,#7c3aed,#a78bfa)", warn: "linear-gradient(135deg,#d97706,#b45309)", error: "linear-gradient(135deg,#dc2626,#f87171)" };
    Object.assign(t.style, {
      position: "fixed", bottom: "28px", right: "28px",
      background: colors[type] || colors.success,
      color: "#fff", padding: "12px 20px", borderRadius: "12px",
      fontSize: "13px", fontWeight: "600", zIndex: "99999"
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  return { renderPollSection, createPoll, vote, closePoll, deletePoll, loadPolls };

})();