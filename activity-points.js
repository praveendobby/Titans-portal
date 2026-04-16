/* ============================================================
   TITANS ACTIVITY POINTS — activity-points.js
   ✅ Matches portal CSS variables (dark/light theme)
   ✅ P Skill + PBL + Events breakdown
   ✅ Profile card, Leaderboard tab, Captain panel
   ✅ Saves to Firebase
============================================================ */
window.TitansActivity = (() => {
  const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";

  const DEFAULT_POINTS = {
    "Praveen M":          { pSkill:0, pbl:0, events:0, total:3700 },
    "Tarun Kumar ":       { pSkill:0, pbl:0, events:0, total:5435 },
    "Thaya Tharsan N":    { pSkill:0, pbl:0, events:0, total:3735 },
    "Thariq Anvar R":     { pSkill:0, pbl:0, events:0, total:3685 },
    "Dhivya Dharshini S": { pSkill:0, pbl:0, events:0, total:3345 },
    "Keshanth V":         { pSkill:0, pbl:0, events:0, total:0    },
    "Vishnu G":           { pSkill:0, pbl:0, events:0, total:3780 },
    "Subashree B":        { pSkill:0, pbl:0, events:0, total:4690 },
    "Akilesh M":          { pSkill:0, pbl:0, events:0, total:3640 },
    "Shiva Shanth M":     { pSkill:0, pbl:0, events:0, total:3690 },
    "Muthamil Selvan":    { pSkill:0, pbl:0, events:0, total:1790 },
    "mem12":              { pSkill:0, pbl:0, events:0, total:0    },
    "mem13":              { pSkill:0, pbl:0, events:0, total:1375 },
    "mem14":              { pSkill:0, pbl:0, events:0, total:1450 },
    "mem15":              { pSkill:0, pbl:0, events:0, total:0    },
  };

  let activityData = {};

  async function loadData() {
    try {
      const r = await fetch(`${FIREBASE_URL}/titans/activityPoints.json`);
      const data = await r.json();
      activityData = data || JSON.parse(JSON.stringify(DEFAULT_POINTS));
      if (!data) await saveToFirebase();
    } catch { activityData = JSON.parse(JSON.stringify(DEFAULT_POINTS)); }
    return activityData;
  }

  async function saveToFirebase() {
    try {
      await fetch(`${FIREBASE_URL}/titans/activityPoints.json`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(activityData)
      });
    } catch(e) { console.warn("Save failed:", e); }
  }

  function getPoints(name) {
    return activityData[name] || { pSkill:0, pbl:0, events:0, total:0 };
  }

  function renderProfile(name, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const pts = getPoints(name);
    el.innerHTML = `
      <div class="ap-card">
        <div class="ap-card-head">
          <div class="ap-card-title">⚡ Activity Points</div>
          <span class="ap-portal-tag">PS Portal</span>
        </div>
        <div class="ap-total-wrap">
          <div class="ap-total-num">${pts.total.toLocaleString()}</div>
          <div class="ap-total-sub">Total Activity Points</div>
        </div>
        <div class="ap-cats">
          <div class="ap-cat-item">
            <div class="ap-cat-left"><span class="ap-cat-icon">📚</span><span class="ap-cat-name">P Skill</span></div>
            <span class="ap-cat-val">${pts.pSkill?pts.pSkill.toLocaleString():"—"}</span>
          </div>
          <div class="ap-cat-item">
            <div class="ap-cat-left"><span class="ap-cat-icon">🛠️</span><span class="ap-cat-name">PBL</span></div>
            <span class="ap-cat-val">${pts.pbl?pts.pbl.toLocaleString():"—"}</span>
          </div>
          <div class="ap-cat-item">
            <div class="ap-cat-left"><span class="ap-cat-icon">🏆</span><span class="ap-cat-name">Events</span></div>
            <span class="ap-cat-val">${pts.events?pts.events.toLocaleString():"—"}</span>
          </div>
        </div>
        <div class="ap-footer">📡 Synced from PS Portal · Updated every 15 days</div>
      </div>`;
  }

  function renderLeaderboard(containerId, teamUsers, currentUserName) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const sorted = [...teamUsers].map(u=>({name:u.name,pts:getPoints(u.name)})).sort((a,b)=>b.pts.total-a.pts.total);
    const max = Math.max(...sorted.map(m=>m.pts.total), 1);
    const rankIcon = i => i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
    const rankCls  = i => i===0?"ap-lb-r1":i===1?"ap-lb-r2":i===2?"ap-lb-r3":"ap-lb-rn";
    el.innerHTML = `
      <div class="ap-lb-section">
        <div class="ap-lb-title">⚡ Activity Points Ranking</div>
        ${sorted.map((m,i)=>`
          <div class="ap-lb-row ${m.name===currentUserName?"me":""}">
            <div class="ap-lb-rank ${rankCls(i)}">${rankIcon(i)}</div>
            <div class="ap-lb-info">
              <div class="ap-lb-name">${m.name}${m.name===currentUserName?` <span style="font-size:10px;color:#6366f1">(you)</span>`:""}</div>
              <div class="ap-lb-sub">Activity Points</div>
            </div>
            <div class="ap-lb-bar-bg"><div class="ap-lb-bar-fill" style="width:${Math.round(m.pts.total/max*100)}%"></div></div>
            <div class="ap-lb-pts">${m.pts.total.toLocaleString()}</div>
          </div>`).join("")}
      </div>`;
  }

  function renderUpdatePanel(containerId, teamUsers) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="ap-update-card">
        <div class="ap-update-title">⚡ Update Activity Points <span style="font-size:11px;font-weight:400;color:var(--text3)">(Captain Only)</span></div>
        <div style="margin-bottom:10px">
          <div class="ap-input-label" style="margin-bottom:4px">Select Member</div>
          <select class="ap-select" id="apMemberSelect">
            ${teamUsers.map(u=>`<option value="${u.name}">${u.name}</option>`).join("")}
          </select>
        </div>
        <div class="ap-input-grid">
          <div class="ap-input-col"><div class="ap-input-label">📚 P Skill</div><input class="ap-input" id="apPSkill" type="number" placeholder="0" min="0"/></div>
          <div class="ap-input-col"><div class="ap-input-label">🛠️ PBL</div><input class="ap-input" id="apPBL" type="number" placeholder="0" min="0"/></div>
          <div class="ap-input-col"><div class="ap-input-label">🏆 Events</div><input class="ap-input" id="apEvents" type="number" placeholder="0" min="0"/></div>
        </div>
        <div class="ap-input-col" style="margin-bottom:4px">
          <div class="ap-input-label">⭐ Total (from PS Portal)</div>
          <input class="ap-input" id="apTotal" type="number" placeholder="0" min="0" style="margin-top:4px"/>
        </div>
        <button class="ap-save-btn" onclick="TitansActivity.savePoints()">💾 Save Activity Points</button>
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">⚡ Activity Points Summary</span>
          <span class="badge-pill" style="background:rgba(99,102,241,0.15);color:#818cf8">All Members</span>
        </div>
        <div id="apSummaryList"></div>
      </div>`;
    document.getElementById("apMemberSelect")?.addEventListener("change", _loadInputs);
    _loadInputs();
    renderSummary(teamUsers);
  }

  function _loadInputs() {
    const name = document.getElementById("apMemberSelect")?.value;
    if (!name) return;
    const pts = getPoints(name);
    const set = (id,val) => { const el=document.getElementById(id); if(el) el.value=val||""; };
    set("apPSkill", pts.pSkill); set("apPBL", pts.pbl);
    set("apEvents", pts.events); set("apTotal", pts.total);
  }

  async function savePoints() {
    const name = document.getElementById("apMemberSelect")?.value;
    if (!name) return;
    const get = id => parseInt(document.getElementById(id)?.value)||0;
    activityData[name] = {
      pSkill:get("apPSkill"), pbl:get("apPBL"),
      events:get("apEvents"), total:get("apTotal"),
      updatedAt:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
    };
    await saveToFirebase();
    if (window.showToast) window.showToast(`✅ Activity points updated for ${name}!`);
    const teamUsers = JSON.parse(localStorage.getItem("teamUsers"))||[];
    renderSummary(teamUsers);
  }

  function renderSummary(teamUsers) {
    const el = document.getElementById("apSummaryList");
    if (!el) return;
    const sorted = [...teamUsers].map(u=>({...u,pts:getPoints(u.name)})).sort((a,b)=>b.pts.total-a.pts.total);
    const max = Math.max(...sorted.map(u=>u.pts.total), 1);
    const medals = ["🥇","🥈","🥉"];
    el.innerHTML = sorted.map((u,i)=>`
      <div class="ap-summary-row">
        <div class="ap-summary-medal">${medals[i]||"#"+(i+1)}</div>
        <div class="ap-summary-info">
          <div class="ap-summary-name">${u.name}</div>
          <div class="ap-summary-bar"><div class="ap-summary-fill" style="width:${Math.round(u.pts.total/max*100)}%"></div></div>
        </div>
        <div style="text-align:right">
          <div class="ap-summary-pts">${u.pts.total.toLocaleString()}</div>
          <div class="ap-summary-pts-lbl">pts</div>
        </div>
      </div>`).join("");
  }

  async function init() { await loadData(); }

  return { init, loadData, getPoints, savePoints, renderProfile, renderLeaderboard, renderUpdatePanel, renderSummary };
})();

document.addEventListener("DOMContentLoaded", () => TitansActivity.init());