/* ============================================================
   TITANS ACTIVITY POINTS — activity-points.js

   Features:
   ✅ Pre-loaded with actual PS portal activity points
   ✅ P Skill + PBL + Events breakdown
   ✅ Shows in Profile page
   ✅ Separate section in Leaderboard
   ✅ Captain can update points anytime
   ✅ Saves to Firebase
============================================================ */

window.TitansActivity = (() => {

  const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";

  // ── Pre-loaded Activity Points from PS Portal ──
  const DEFAULT_POINTS = {
    "Praveen M":          { pSkill: 0, pbl: 0, events: 0, total: 3700 },
    "Tarun Kumar ":       { pSkill: 0, pbl: 0, events: 0, total: 5435 },
    "Thaya Tharsan N":    { pSkill: 0, pbl: 0, events: 0, total: 3735 },
    "Thariq Anvar R":     { pSkill: 0, pbl: 0, events: 0, total: 3685 },
    "Dhivya Dharshini S": { pSkill: 0, pbl: 0, events: 0, total: 3345 },
    "Keshanth V":         { pSkill: 0, pbl: 0, events: 0, total: 0    },
    "Vishnu G":           { pSkill: 0, pbl: 0, events: 0, total: 3780 },
    "Subashree B":        { pSkill: 0, pbl: 0, events: 0, total: 4690 },
    "Akilesh M":          { pSkill: 0, pbl: 0, events: 0, total: 3640 },
    "Shiva Shanth M":     { pSkill: 0, pbl: 0, events: 0, total: 3690 },
    "Muthamil Selvan":    { pSkill: 0, pbl: 0, events: 0, total: 1790 },
    "mem12":              { pSkill: 0, pbl: 0, events: 0, total: 0    },
    "mem13":              { pSkill: 0, pbl: 0, events: 0, total: 1375 },
    "mem14":              { pSkill: 0, pbl: 0, events: 0, total: 1450 },
    "mem15":              { pSkill: 0, pbl: 0, events: 0, total: 0    },
  };

  let activityData = {};

  /* ── Inject CSS ── */
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

    /* Activity Points Card in Profile */
    .ap-card {
      background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04));
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 16px; padding: 20px; margin-top: 16px;
    }
    .ap-card-title {
      font-family: 'Syne', sans-serif; font-weight: 800;
      font-size: 13px; color: #818cf8; margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
    }
    .ap-total {
      font-size: 40px; font-weight: 800; color: #a78bfa;
      text-align: center; margin: 8px 0 2px;
      font-family: 'Syne', sans-serif;
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .ap-total-label {
      text-align: center; font-size: 11px;
      color: rgba(255,255,255,0.3); margin-bottom: 16px; letter-spacing: 1px;
    }
    .ap-categories { display: flex; flex-direction: column; gap: 8px; }
    .ap-cat-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: rgba(255,255,255,0.04);
      border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
    }
    .ap-cat-left { display: flex; align-items: center; gap: 8px; }
    .ap-cat-icon { font-size: 16px; }
    .ap-cat-name { font-size: 12px; color: rgba(255,255,255,0.6); }
    .ap-cat-pts { font-size: 14px; font-weight: 700; color: #a78bfa; }
    .ap-updated {
      font-size: 10px; color: rgba(255,255,255,0.2);
      text-align: center; margin-top: 12px;
      padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);
    }

    /* Leaderboard Activity Points */
    .ap-lb-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 20px; font-size: 11px;
      background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
      color: #818cf8; font-weight: 600; margin-top: 2px;
    }

    /* Leaderboard Activity Section */
    .ap-lb-section { margin-top: 20px; }
    .ap-lb-title {
      font-family: 'Syne', sans-serif; font-weight: 800;
      font-size: 15px; color: #a78bfa; margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
    }
    .ap-lb-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
      animation: apFadeIn 0.3s ease;
    }
    @keyframes apFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
    .ap-lb-rank {
      width: 32px; text-align: center; font-size: 14px;
      font-weight: 700; flex-shrink: 0;
    }
    .ap-lb-rank-1 { color: #fbbf24; }
    .ap-lb-rank-2 { color: #94a3b8; }
    .ap-lb-rank-3 { color: #f97316; }
    .ap-lb-rank-n { color: rgba(255,255,255,0.3); font-size: 12px; }
    .ap-lb-name {
      flex: 1; font-size: 13px; font-weight: 600;
      color: var(--text, #e8edf5);
    }
    .ap-lb-bar-bg {
      width: 100px; height: 6px; background: rgba(255,255,255,0.06);
      border-radius: 3px; overflow: hidden;
    }
    .ap-lb-bar-fill {
      height: 100%; border-radius: 3px;
      background: linear-gradient(90deg, #6366f1, #a78bfa);
      transition: width 0.8s cubic-bezier(0.34,1.56,0.64,1);
    }
    .ap-lb-pts {
      font-size: 14px; font-weight: 700; color: #a78bfa;
      min-width: 55px; text-align: right;
    }

    /* Captain Update Panel */
    .ap-update-card {
      background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05));
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 16px; padding: 20px; margin-bottom: 20px;
    }
    .ap-update-title {
      font-family: 'Syne', sans-serif; font-weight: 800;
      font-size: 14px; color: #818cf8; margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
    }
    .ap-input {
      width: 100%; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: #e8edf5;
      outline: none; font-family: inherit; transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .ap-input:focus { border-color: rgba(99,102,241,0.5); }
    .ap-select {
      width: 100%; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: #e8edf5;
      outline: none; font-family: inherit; margin-bottom: 10px;
    }
    .ap-input-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 10px; margin-bottom: 10px;
    }
    .ap-input-col { display: flex; flex-direction: column; gap: 4px; }
    .ap-input-label { font-size: 11px; color: rgba(255,255,255,0.4); }
    .ap-save-btn {
      width: 100%; padding: 11px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      color: #fff; font-family: 'Syne', sans-serif;
      font-weight: 700; font-size: 13px; cursor: pointer;
      transition: all 0.2s; box-shadow: 0 4px 16px rgba(99,102,241,0.3);
      margin-top: 10px;
    }
    .ap-save-btn:hover { transform: scale(1.02); box-shadow: 0 6px 20px rgba(99,102,241,0.5); }

    /* Me highlight */
    .ap-lb-row.me { background: rgba(99,102,241,0.06); border-radius: 10px; padding: 12px 8px; }
  `;
  document.head.appendChild(style);

  /* ── Load from Firebase or defaults ── */
  async function loadData() {
    try {
      const r = await fetch(`${FIREBASE_URL}/titans/activityPoints.json`);
      const data = await r.json();
      if (data) {
        activityData = data;
      } else {
        activityData = JSON.parse(JSON.stringify(DEFAULT_POINTS));
        await saveToFirebase();
      }
    } catch (e) {
      activityData = JSON.parse(JSON.stringify(DEFAULT_POINTS));
    }
    return activityData;
  }

  /* ── Save to Firebase ── */
  async function saveToFirebase() {
    try {
      await fetch(`${FIREBASE_URL}/titans/activityPoints.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData)
      });
    } catch (e) {
      console.warn("Failed to save activity points:", e);
    }
  }

  /* ── Get points for a member ── */
  function getPoints(name) {
    return activityData[name] || { pSkill: 0, pbl: 0, events: 0, total: 0 };
  }

  /* ── Render in Profile ── */
  function renderProfile(name, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const pts = getPoints(name);

    container.innerHTML = `
      <div class="ap-card">
        <div class="ap-card-title">⚡ Activity Points <span style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:400;margin-left:4px">PS Portal</span></div>
        <div class="ap-total">${pts.total.toLocaleString()}</div>
        <div class="ap-total-label">TOTAL ACTIVITY POINTS</div>
        <div class="ap-categories">
          <div class="ap-cat-row">
            <div class="ap-cat-left">
              <span class="ap-cat-icon">📚</span>
              <span class="ap-cat-name">P Skill</span>
            </div>
            <span class="ap-cat-pts">${pts.pSkill ? pts.pSkill.toLocaleString() : "—"}</span>
          </div>
          <div class="ap-cat-row">
            <div class="ap-cat-left">
              <span class="ap-cat-icon">🛠️</span>
              <span class="ap-cat-name">PBL (Project Based Learning)</span>
            </div>
            <span class="ap-cat-pts">${pts.pbl ? pts.pbl.toLocaleString() : "—"}</span>
          </div>
          <div class="ap-cat-row">
            <div class="ap-cat-left">
              <span class="ap-cat-icon">🏆</span>
              <span class="ap-cat-name">Events</span>
            </div>
            <span class="ap-cat-pts">${pts.events ? pts.events.toLocaleString() : "—"}</span>
          </div>
        </div>
        <div class="ap-updated">📡 Synced from PS Portal · Updated every 15 days</div>
      </div>
    `;
  }

  /* ── Render Activity Leaderboard ── */
  function renderLeaderboard(containerId, teamUsers, currentUserName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sorted = [...teamUsers]
      .map(u => ({ name: u.name, pts: getPoints(u.name) }))
      .sort((a, b) => b.pts.total - a.pts.total);

    const max = sorted[0]?.pts.total || 1;

    const rankIcon = i => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
    const rankCls  = i => i === 0 ? "ap-lb-rank-1" : i === 1 ? "ap-lb-rank-2" : i === 2 ? "ap-lb-rank-3" : "ap-lb-rank-n";

    container.innerHTML = `
      <div class="ap-lb-section">
        <div class="ap-lb-title">⚡ Activity Points Leaderboard</div>
        ${sorted.map((m, i) => `
          <div class="ap-lb-row ${m.name === currentUserName ? "me" : ""}">
            <div class="ap-lb-rank ${rankCls(i)}">${rankIcon(i)}</div>
            <div class="ap-lb-name">
              ${m.name}
              ${m.name === currentUserName ? `<span style="font-size:10px;color:#6366f1"> (you)</span>` : ""}
            </div>
            <div class="ap-lb-bar-bg">
              <div class="ap-lb-bar-fill" style="width:${Math.round(m.pts.total/max*100)}%"></div>
            </div>
            <div class="ap-lb-pts">${m.pts.total.toLocaleString()}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* ── Get badge for leaderboard row ── */
  function getLbBadge(name) {
    const pts = getPoints(name);
    if (!pts.total) return "";
    return `<span class="ap-lb-badge">⚡ ${pts.total.toLocaleString()}</span>`;
  }

  /* ── Render Captain Update Panel ── */
  function renderUpdatePanel(containerId, teamUsers) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="ap-update-card">
        <div class="ap-update-title">⚡ Update Activity Points</div>

        <div style="margin-bottom:10px">
          <div class="ap-input-label" style="margin-bottom:4px">Select Member</div>
          <select class="ap-select" id="apMemberSelect">
            ${teamUsers.map(u => `<option value="${u.name}">${u.name}</option>`).join("")}
          </select>
        </div>

        <div class="ap-input-grid">
          <div class="ap-input-col">
            <div class="ap-input-label">📚 P Skill</div>
            <input class="ap-input" id="apPSkill" type="number" placeholder="0" min="0"/>
          </div>
          <div class="ap-input-col">
            <div class="ap-input-label">🛠️ PBL</div>
            <input class="ap-input" id="apPBL" type="number" placeholder="0" min="0"/>
          </div>
          <div class="ap-input-col">
            <div class="ap-input-label">🏆 Events</div>
            <input class="ap-input" id="apEvents" type="number" placeholder="0" min="0"/>
          </div>
        </div>

        <div class="ap-input-col" style="margin-bottom:4px">
          <div class="ap-input-label">⭐ Total Activity Points (from PS Portal)</div>
          <input class="ap-input" id="apTotal" type="number" placeholder="0" min="0" style="margin-top:4px"/>
        </div>

        <button class="ap-save-btn" onclick="TitansActivity.savePoints()">💾 Save Activity Points</button>
      </div>

      <!-- Summary -->
      <div class="card">
        <div class="card-head">
          <span class="card-title">⚡ Activity Points Summary</span>
          <span class="badge-pill" style="background:rgba(99,102,241,0.15);color:#818cf8">PS Portal</span>
        </div>
        <div id="apSummaryList"></div>
      </div>
    `;

    document.getElementById("apMemberSelect")?.addEventListener("change", loadMemberPoints);
    loadMemberPoints();
    renderSummary(teamUsers);
  }

  function loadMemberPoints() {
    const name = document.getElementById("apMemberSelect")?.value;
    if (!name) return;
    const pts = getPoints(name);
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ""; };
    set("apPSkill", pts.pSkill);
    set("apPBL", pts.pbl);
    set("apEvents", pts.events);
    set("apTotal", pts.total);
  }

  async function savePoints() {
    const name = document.getElementById("apMemberSelect")?.value;
    if (!name) return;
    const get = id => parseInt(document.getElementById(id)?.value) || 0;

    activityData[name] = {
      pSkill: get("apPSkill"),
      pbl:    get("apPBL"),
      events: get("apEvents"),
      total:  get("apTotal"),
      updatedAt: new Date().toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})
    };

    await saveToFirebase();
    if (window.showToast) window.showToast(`✅ Activity points updated for ${name}!`);

    const teamUsers = JSON.parse(localStorage.getItem("teamUsers")) || [];
    renderSummary(teamUsers);
  }

  function renderSummary(teamUsers) {
    const el = document.getElementById("apSummaryList");
    if (!el) return;
    const sorted = [...teamUsers]
      .map(u => ({ ...u, pts: getPoints(u.name) }))
      .sort((a, b) => b.pts.total - a.pts.total);
    const max = sorted[0]?.pts.total || 1;

    el.innerHTML = sorted.map((u, i) => {
      const pct = Math.round(u.pts.total / max * 100);
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
          <div style="font-size:13px;font-weight:700;color:#818cf8;width:28px">${medal}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--text,#e8edf5);margin-bottom:4px">${u.name}</div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#6366f1,#a78bfa);border-radius:3px;transition:width 0.6s ease"></div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:700;color:#a78bfa">${u.pts.total.toLocaleString()}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.3)">pts</div>
          </div>
        </div>
      `;
    }).join("");
  }

  async function init() {
    await loadData();
  }

  return { init, loadData, getPoints, savePoints, renderProfile, renderLeaderboard, getLbBadge, renderUpdatePanel, renderSummary };

})();

document.addEventListener("DOMContentLoaded", () => TitansActivity.init());