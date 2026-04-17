/* ============================================================
   TITANS ACTIVITY — Activity Points & Reward Points System
   
   DROP-IN MODULE for Titans Dashboard
   
   HOW TO USE:
   1. Add <script src="titans-activity.js"></script> to dashboard.html
      (after dashboard.js, before closing </body>)
   2. Add the profile HTML block inside sec-profile
   3. Add the leaderboard HTML columns (already described below)
   4. Module auto-initialises on DOMContentLoaded
   
   FIREBASE PATH:
     /titans/activity/{memberName_underscored}
       → rewardPoints  : number  (captain-awarded)
       → activityPoints: number  (auto-earned)
       → log           : array of { type, reason, pts, by, time }
   
   FEATURES:
   ✅ Reward Points  — captain awards manually per task review
   ✅ Activity Points — auto-earned (logins, task submits, comments, streaks)
   ✅ Profile cards  — two glowing stat cards matching portal style
   ✅ Add-points form — captain only, live Firebase write
   ✅ Points log     — scrollable history per member
   ✅ Leaderboard columns — RP + AP columns injected automatically
   ✅ REST polling   — syncs every 8 s like rest of dashboard
   ✅ Toast + notif  — uses portal's existing showToast / addNotif
============================================================ */

(function () {
  "use strict";

  /* ── Constants ── */
  const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";
  const AP_RULES = {
    login:     { pts: 2,  label: "Daily login" },
    submit:    { pts: 5,  label: "Task submitted" },
    reviewed:  { pts: 10, label: "Task reviewed & approved" },
    comment:   { pts: 1,  label: "Comment posted" },
    streak3:   { pts: 8,  label: "3-day streak bonus" },
    streak7:   { pts: 20, label: "7-day streak bonus" },
    streak14:  { pts: 40, label: "14-day streak bonus" },
  };

  /* ── Shared state ── */
  let _user        = null;
  let _teamUsers   = [];
  let _isCaptain   = false;
  let _actData     = {};          // { [memberKey]: { rewardPoints, activityPoints, log[] } }
  let _pollHash    = "";
  let _initialized = false;

  /* ── REST helper (mirrors dashboard rest object) ── */
  function getToken() { return localStorage.getItem("firebaseToken") || ""; }
  function authParam() { const t = getToken(); return t ? `?auth=${t}` : ""; }

  async function fbGet(path) {
    const r = await fetch(FIREBASE_URL + path + ".json" + authParam());
    return r.json();
  }
  async function fbPatch(path, data) {
    return fetch(FIREBASE_URL + path + ".json" + authParam(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }
  async function fbPut(path, data) {
    return fetch(FIREBASE_URL + path + ".json" + authParam(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }

  /* ── Key helper ── */
  function key(name) { return (name || "").replace(/\s+/g, "_"); }

  /* ── Safe access to portal globals ── */
  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type || "success");
  }

  /* ══════════════════════════════════════════════════════
     DATA LAYER
  ══════════════════════════════════════════════════════ */

  function defaultEntry() {
    return { rewardPoints: 0, activityPoints: 0, log: [] };
  }

  function getEntry(name) {
    return _actData[key(name)] || defaultEntry();
  }

  async function loadAll() {
    try {
      const data = await fbGet("/titans/activity");
      if (data && typeof data === "object") {
        _actData = data;
      }
    } catch (e) {
      // fallback: localStorage
      const cached = localStorage.getItem("titans_activity_pts");
      if (cached) {
        try { _actData = JSON.parse(cached); } catch {}
      }
    }
    localStorage.setItem("titans_activity_pts", JSON.stringify(_actData));
  }

  async function saveEntry(name, entry) {
    const k = key(name);
    _actData[k] = entry;
    localStorage.setItem("titans_activity_pts", JSON.stringify(_actData));
    try {
      await fbPut(`/titans/activity/${k}`, entry);
    } catch (e) {}
  }

  /* ── Append a log entry (max 50) ── */
  function appendLog(entry, type, pts, reason, by) {
    if (!Array.isArray(entry.log)) entry.log = [];
    entry.log.unshift({
      type,
      reason,
      pts,
      by: by || "System",
      time: new Date().toLocaleString("en-IN", {
        day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit"
      })
    });
    entry.log = entry.log.slice(0, 50);
  }

  /* ══════════════════════════════════════════════════════
     AUTO ACTIVITY POINTS
  ══════════════════════════════════════════════════════ */

  /* Called once per session on load */
  async function recordLogin(name) {
    const todayKey = "ta_login_" + name + "_" + new Date().toDateString();
    if (localStorage.getItem(todayKey)) return;
    localStorage.setItem(todayKey, "1");

    const entry = getEntry(name);
    entry.activityPoints = (entry.activityPoints || 0) + AP_RULES.login.pts;
    appendLog(entry, "activity", AP_RULES.login.pts, AP_RULES.login.label, "System");
    await saveEntry(name, entry);

    /* Check streak bonuses */
    await checkStreakBonus(name);
  }

  async function checkStreakBonus(name) {
    const storedDays = JSON.parse(localStorage.getItem("titans_activity_" + name) || "[]");
    const streak = storedDays.length;
    const bonuses = [
      { days: 14, rule: "streak14" },
      { days: 7,  rule: "streak7"  },
      { days: 3,  rule: "streak3"  },
    ];
    for (const b of bonuses) {
      if (streak >= b.days) {
        const bKey = "ta_streak_" + name + "_" + b.days + "_" + getWeekId();
        if (!localStorage.getItem(bKey)) {
          localStorage.setItem(bKey, "1");
          const rule = AP_RULES[b.rule];
          const entry = getEntry(name);
          entry.activityPoints = (entry.activityPoints || 0) + rule.pts;
          appendLog(entry, "activity", rule.pts, rule.label, "System");
          await saveEntry(name, entry);
          toast(`🔥 ${b.days}-day streak! +${rule.pts} Activity Points`);
        }
        break;
      }
    }
  }

  function getWeekId() {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  }

  /* Called by dashboard when task is submitted */
  async function onTaskSubmitted(memberName) {
    const entry = getEntry(memberName);
    entry.activityPoints = (entry.activityPoints || 0) + AP_RULES.submit.pts;
    appendLog(entry, "activity", AP_RULES.submit.pts, AP_RULES.submit.label, "System");
    await saveEntry(memberName, entry);
    if (memberName === _user?.name) {
      toast(`+${AP_RULES.submit.pts} Activity Points for submitting!`);
      refreshProfileCards();
    }
  }

  /* Called by dashboard when task is reviewed/approved */
  async function onTaskReviewed(memberName, rewardPts) {
    const entry = getEntry(memberName);
    // Activity points for getting reviewed
    entry.activityPoints = (entry.activityPoints || 0) + AP_RULES.reviewed.pts;
    appendLog(entry, "activity", AP_RULES.reviewed.pts, AP_RULES.reviewed.label, "System");
    // Reward points — captain assigned via review modal
    if (rewardPts > 0) {
      entry.rewardPoints = (entry.rewardPoints || 0) + rewardPts;
      appendLog(entry, "reward", rewardPts, "Task approved by captain", _user?.name || "Captain");
    }
    await saveEntry(memberName, entry);
    refreshProfileCards();
    refreshLeaderboard();
  }

  /* Called on comment posted */
  async function onCommentPosted(memberName) {
    const todayKey = "ta_comment_" + memberName + "_" + new Date().toDateString();
    if (localStorage.getItem(todayKey)) return; // max 1 AP per day for comments
    localStorage.setItem(todayKey, "1");
    const entry = getEntry(memberName);
    entry.activityPoints = (entry.activityPoints || 0) + AP_RULES.comment.pts;
    appendLog(entry, "activity", AP_RULES.comment.pts, AP_RULES.comment.label, "System");
    await saveEntry(memberName, entry);
    if (memberName === _user?.name) refreshProfileCards();
  }

  /* ══════════════════════════════════════════════════════
     CAPTAIN: MANUAL AWARD
  ══════════════════════════════════════════════════════ */

  window.TitansActivity_awardPoints = async function () {
    if (!_isCaptain) return;
    const typeEl   = document.getElementById("ta-type");
    const memberEl = document.getElementById("ta-member");
    const amtEl    = document.getElementById("ta-amount");
    const reasonEl = document.getElementById("ta-reason");
    if (!typeEl || !memberEl || !amtEl || !reasonEl) return;

    const type   = typeEl.value;
    const member = memberEl.value;
    const pts    = parseInt(amtEl.value) || 0;
    const reason = reasonEl.value.trim() || "Manual award";

    if (pts <= 0 || !member) { toast("Enter a valid member and points", "warn"); return; }

    const entry = getEntry(member);
    if (type === "reward") {
      entry.rewardPoints = (entry.rewardPoints || 0) + pts;
    } else {
      entry.activityPoints = (entry.activityPoints || 0) + pts;
    }
    appendLog(entry, type, pts, reason, _user?.name);
    await saveEntry(member, entry);

    amtEl.value   = "50";
    reasonEl.value = "";
    toast(`✅ +${pts} ${type === "reward" ? "Reward" : "Activity"} Points → ${member}`);
    refreshProfileCards();
    refreshLeaderboard();

    // Notify the member
    if (window.showToast && member !== _user?.name) {
      /* The toast is for captain; member will see it on next poll */
    }
    renderPointsLog(member);
  };

  /* ══════════════════════════════════════════════════════
     POLLING
  ══════════════════════════════════════════════════════ */

  async function pollActivity() {
    try {
      const data = await fbGet("/titans/activity");
      if (!data) return;
      const hash = JSON.stringify(data);
      if (hash === _pollHash) return;
      _pollHash = hash;
      _actData = data;
      localStorage.setItem("titans_activity_pts", JSON.stringify(_actData));
      refreshProfileCards();
      refreshLeaderboard();
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════
     RENDER — PROFILE CARDS
  ══════════════════════════════════════════════════════ */

  function refreshProfileCards() {
    const sec = document.getElementById("sec-profile");
    if (!sec || !sec.classList.contains("active")) return;
    if (_user) renderProfileCards(_user.name);
  }

  function renderProfileCards(name) {
    const entry = getEntry(name);
    const rp = entry.rewardPoints || 0;
    const ap = entry.activityPoints || 0;

    /* ── Reward Points card value ── */
    const rpEl = document.getElementById("ta-rp-val");
    const apEl = document.getElementById("ta-ap-val");
    if (rpEl) rpEl.textContent = rp.toLocaleString();
    if (apEl) apEl.textContent = ap.toLocaleString();

    /* ── RP tier progress ── */
    const rpTier   = getRpTier(rp);
    const rpNext   = rpTier.next;
    const rpPct    = rpNext ? Math.min(Math.round(((rp - rpTier.from) / (rpNext - rpTier.from)) * 100), 100) : 100;
    const rpBar    = document.getElementById("ta-rp-bar");
    const rpLabel  = document.getElementById("ta-rp-tier");
    const rpProg   = document.getElementById("ta-rp-prog");
    if (rpBar)   rpBar.style.width = rpPct + "%";
    if (rpLabel) rpLabel.textContent = rpTier.name;
    if (rpProg)  rpProg.textContent  = rpNext ? `${rp.toLocaleString()} / ${rpNext.toLocaleString()}` : "Max tier!";

    /* ── AP level progress ── */
    const apLevel  = getApLevel(ap);
    const apNext   = apLevel.nextAt;
    const apPct    = apNext ? Math.min(Math.round(((ap - apLevel.from) / (apNext - apLevel.from)) * 100), 100) : 100;
    const apBar    = document.getElementById("ta-ap-bar");
    const apLabel  = document.getElementById("ta-ap-level");
    const apProg   = document.getElementById("ta-ap-prog");
    if (apBar)   apBar.style.width = apPct + "%";
    if (apLabel) apLabel.textContent = "Level " + apLevel.level;
    if (apProg)  apProg.textContent  = apNext ? `${ap.toLocaleString()} / ${apNext.toLocaleString()}` : "Max level!";

    /* ── Log ── */
    renderPointsLog(name);
  }

  function renderPointsLog(name) {
    const el = document.getElementById("ta-log-list");
    if (!el) return;
    const entry = getEntry(name);
    const log = entry.log || [];
    if (!log.length) {
      el.innerHTML = `<div class="ta-log-empty">No points activity yet — complete tasks to earn!</div>`;
      return;
    }
    el.innerHTML = log.map(l => `
      <div class="ta-log-item">
        <div class="ta-log-dot ${l.type === "reward" ? "ta-dot-gold" : "ta-dot-blue"}"></div>
        <div class="ta-log-body">
          <div class="ta-log-reason">${l.reason}</div>
          <div class="ta-log-meta">${l.by} · ${l.time}</div>
        </div>
        <div class="ta-log-pts ${l.type === "reward" ? "ta-pts-gold" : "ta-pts-blue"}">+${l.pts}</div>
      </div>`).join("");
  }

  /* ── Tier / Level helpers ── */
  const RP_TIERS = [
    { name: "Bronze",   from: 0,    next: 500  },
    { name: "Silver",   from: 500,  next: 1500 },
    { name: "Gold",     from: 1500, next: 3000 },
    { name: "Platinum", from: 3000, next: 6000 },
    { name: "Diamond",  from: 6000, next: null },
  ];
  function getRpTier(rp) {
    for (let i = RP_TIERS.length - 1; i >= 0; i--) {
      if (rp >= RP_TIERS[i].from) return RP_TIERS[i];
    }
    return RP_TIERS[0];
  }

  function getApLevel(ap) {
    const level = Math.max(1, Math.floor(ap / 200) + 1);
    const from  = (level - 1) * 200;
    const nextAt = level * 200;
    return { level, from, nextAt };
  }

  /* ══════════════════════════════════════════════════════
     RENDER — LEADERBOARD INJECTION
  ══════════════════════════════════════════════════════ */

  function refreshLeaderboard() {
    const sec = document.getElementById("sec-leaderboard");
    if (!sec || !sec.classList.contains("active")) return;
    injectLeaderboardPoints();
  }

  function injectLeaderboardPoints() {
    /* Find every leaderboard row and inject RP + AP badges */
    const rows = document.querySelectorAll(".lb-row");
    rows.forEach(row => {
      /* Read name from the lb-name element */
      const nameEl = row.querySelector(".lb-name");
      if (!nameEl) return;
      /* Extract raw name (strip the "(you)" span text) */
      const rawName = nameEl.childNodes[0]?.textContent?.trim() || "";
      if (!rawName) return;

      const entry = getEntry(rawName);
      const rp = entry.rewardPoints || 0;
      const ap = entry.activityPoints || 0;

      /* Remove old injected badges if re-rendering */
      row.querySelectorAll(".ta-lb-pts").forEach(el => el.remove());

      /* Inject after lb-sub */
      const subEl = row.querySelector(".lb-sub");
      if (subEl) {
        const badge = document.createElement("div");
        badge.className = "ta-lb-pts";
        badge.innerHTML =
          `<span class="ta-lb-rp" title="Reward Points">🏅 ${rp} RP</span>` +
          `<span class="ta-lb-ap" title="Activity Points">⚡ ${ap} AP</span>`;
        subEl.insertAdjacentElement("afterend", badge);
      }
    });

    /* Also inject into the podium names */
    document.querySelectorAll(".podium-item").forEach(pod => {
      const nameEl = pod.querySelector(".podium-name");
      if (!nameEl) return;
      const firstName = nameEl.textContent.trim();
      /* Match by first name */
      const member = _teamUsers.find(u => u.name.split(" ")[0] === firstName);
      if (!member) return;
      const entry = getEntry(member.name);
      const rp = entry.rewardPoints || 0;

      pod.querySelectorAll(".ta-pod-pts").forEach(el => el.remove());
      const pip = document.createElement("div");
      pip.className = "ta-pod-pts";
      pip.innerHTML = `🏅 ${rp} RP`;
      nameEl.insertAdjacentElement("afterend", pip);
    });
  }

  /* ══════════════════════════════════════════════════════
     INJECT HTML INTO DOM
  ══════════════════════════════════════════════════════ */

  function injectProfileHTML() {
    /* Find the profile section */
    const profSec = document.getElementById("sec-profile");
    if (!profSec) return;

    /* Find .profile-wrap — we append before the second column */
    const profileWrap = profSec.querySelector(".profile-wrap");
    if (!profileWrap) return;

    /* ── Full-width points block (injected after profile-wrap) ── */
    const existing = document.getElementById("ta-profile-block");
    if (existing) return; // already injected

    const block = document.createElement("div");
    block.id = "ta-profile-block";
    block.className = "card";
    block.style.cssText = "margin-top: 24px;";

    block.innerHTML = `
      <!-- ── Points Overview Header ── -->
      <div class="card-head">
        <span class="card-title">Points Overview</span>
        <span class="badge-pill" style="background:rgba(245,158,11,0.15);color:#f59e0b">Season 1</span>
      </div>

      <!-- ── Two stat cards ── -->
      <div class="ta-points-grid">

        <div class="ta-points-card ta-card-gold">
          <div class="ta-card-icon">🏅</div>
          <div class="ta-card-label">Reward Points</div>
          <div class="ta-card-value" id="ta-rp-val">0</div>
          <div class="ta-card-tier-row">
            <span id="ta-rp-tier" class="ta-tier-badge">Bronze</span>
            <span id="ta-rp-prog" class="ta-tier-prog">0 / 500</span>
          </div>
          <div class="ta-bar-bg">
            <div class="ta-bar-fill ta-bar-gold" id="ta-rp-bar" style="width:0%"></div>
          </div>
          <div class="ta-card-sub">Awarded by captain on task approval</div>
        </div>

        <div class="ta-points-card ta-card-blue">
          <div class="ta-card-icon">⚡</div>
          <div class="ta-card-label">Activity Points</div>
          <div class="ta-card-value" id="ta-ap-val">0</div>
          <div class="ta-card-tier-row">
            <span id="ta-ap-level" class="ta-level-badge">Level 1</span>
            <span id="ta-ap-prog" class="ta-tier-prog">0 / 200</span>
          </div>
          <div class="ta-bar-bg">
            <div class="ta-bar-fill ta-bar-blue" id="ta-ap-bar" style="width:0%"></div>
          </div>
          <div class="ta-card-sub">Earned by logins, submits, reviews, streaks</div>
        </div>

      </div>

      <!-- ── Captain: Manual Award Form ── -->
      <div id="ta-award-form" style="display:none; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border)">
        <div class="card-head" style="margin-bottom:12px">
          <span class="card-title" style="font-size:13px">⚡ Award Points</span>
          <span class="badge-pill captain-badge">Captain Access</span>
        </div>
        <div class="ta-award-row">
          <select id="ta-type" class="ta-sel">
            <option value="reward">🏅 Reward Points</option>
            <option value="activity">⚡ Activity Points</option>
          </select>
          <select id="ta-member" class="ta-sel"></select>
          <input id="ta-amount" type="number" value="50" min="1" max="9999" class="ta-inp" placeholder="Points" style="width:90px"/>
          <input id="ta-reason" type="text" class="ta-inp" placeholder="Reason e.g. Extra effort on UI…" style="flex:1;min-width:160px"/>
          <button class="btn-primary" style="padding:9px 18px;font-size:13px;white-space:nowrap"
                  onclick="TitansActivity_awardPoints()">+ Award</button>
        </div>
      </div>

      <!-- ── Points Log ── -->
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border)">
        <div class="card-head" style="margin-bottom:12px">
          <span class="card-title" style="font-size:13px">Recent Points History</span>
        </div>
        <div id="ta-log-list" class="ta-log-list">
          <div class="ta-log-empty">No points activity yet</div>
        </div>
      </div>
    `;

    /* Insert after profile-wrap */
    profileWrap.insertAdjacentElement("afterend", block);
  }

  function injectStyles() {
    if (document.getElementById("ta-styles")) return;
    const style = document.createElement("style");
    style.id = "ta-styles";
    style.textContent = `
      /* ══════ POINTS GRID ══════ */
      .ta-points-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-top: 4px;
      }
      @media (max-width: 640px) {
        .ta-points-grid { grid-template-columns: 1fr; }
      }

      /* ══════ POINTS CARDS ══════ */
      .ta-points-card {
        position: relative;
        background: var(--bg2);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px;
        overflow: hidden;
        transition: border-color 0.2s;
      }
      .ta-points-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        border-radius: 14px 14px 0 0;
      }
      .ta-card-gold::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
      .ta-card-blue::before { background: linear-gradient(90deg, #6366f1, #60a5fa); }
      .ta-points-card:hover { border-color: var(--primary); }

      .ta-card-icon {
        font-size: 22px;
        position: absolute;
        top: 18px; right: 18px;
        opacity: 0.18;
        pointer-events: none;
      }

      .ta-card-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: var(--text3);
        margin-bottom: 8px;
      }

      .ta-card-value {
        font-size: 38px;
        font-weight: 700;
        color: var(--text);
        line-height: 1;
        margin-bottom: 10px;
        font-variant-numeric: tabular-nums;
      }

      .ta-card-tier-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .ta-tier-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 6px;
        background: rgba(245,158,11,0.15);
        color: #f59e0b;
        letter-spacing: 0.5px;
      }
      .ta-level-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 6px;
        background: rgba(99,102,241,0.15);
        color: #818cf8;
        letter-spacing: 0.5px;
      }
      .ta-tier-prog {
        font-size: 11px;
        color: var(--text3);
      }

      .ta-bar-bg {
        height: 5px;
        background: var(--bg3);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      .ta-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
      }
      .ta-bar-gold { background: linear-gradient(90deg, #d97706, #fbbf24); }
      .ta-bar-blue { background: linear-gradient(90deg, #6366f1, #60a5fa); }

      .ta-card-sub {
        font-size: 11px;
        color: var(--text3);
        line-height: 1.4;
      }

      /* ══════ AWARD FORM ══════ */
      .ta-award-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .ta-sel, .ta-inp {
        background: var(--bg3);
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--text);
        padding: 9px 12px;
        font-size: 13px;
        font-family: Inter, sans-serif;
        outline: none;
        transition: border-color 0.15s;
      }
      .ta-sel:focus, .ta-inp:focus { border-color: var(--primary); }
      .ta-sel option { background: var(--bg2); }

      /* ══════ POINTS LOG ══════ */
      .ta-log-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 260px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .ta-log-list::-webkit-scrollbar { width: 4px; }
      .ta-log-list::-webkit-scrollbar-track { background: var(--bg3); border-radius: 4px; }
      .ta-log-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

      .ta-log-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: var(--bg3);
        border: 1px solid var(--border);
        border-radius: 10px;
        transition: border-color 0.15s;
      }
      .ta-log-item:hover { border-color: var(--primary); }

      .ta-log-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .ta-dot-gold { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
      .ta-dot-blue { background: #6366f1; box-shadow: 0 0 6px rgba(99,102,241,0.5); }

      .ta-log-body { flex: 1; min-width: 0; }
      .ta-log-reason {
        font-size: 13px;
        color: var(--text);
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ta-log-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }

      .ta-log-pts {
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .ta-pts-gold { color: #fbbf24; }
      .ta-pts-blue { color: #818cf8; }

      .ta-log-empty {
        font-size: 13px;
        color: var(--text3);
        padding: 10px 0;
        text-align: center;
      }

      /* ══════ LEADERBOARD INJECTION ══════ */
      .ta-lb-pts {
        display: flex;
        gap: 8px;
        margin-top: 3px;
        flex-wrap: wrap;
      }
      .ta-lb-rp, .ta-lb-ap {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 5px;
        letter-spacing: 0.5px;
      }
      .ta-lb-rp {
        background: rgba(245,158,11,0.15);
        color: #fbbf24;
      }
      .ta-lb-ap {
        background: rgba(99,102,241,0.15);
        color: #818cf8;
      }

      .ta-pod-pts {
        font-size: 11px;
        font-weight: 700;
        color: #fbbf24;
        margin-top: 2px;
        text-align: center;
        background: rgba(245,158,11,0.12);
        border-radius: 6px;
        padding: 2px 8px;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════════════
     HOOK INTO EXISTING DASHBOARD FUNCTIONS
  ══════════════════════════════════════════════════════ */

  function hookDashboard() {
    /* ── Hook approveTask ── */
    const origApprove = window.approveTask;
    if (origApprove) {
      window.approveTask = async function () {
        await origApprove.apply(this, arguments);
        /* Find what was just reviewed — read from tasks */
        try {
          const tasks = JSON.parse(localStorage.getItem("titans_tasks") || "[]");
          const reviewed = tasks.filter(t => t.status === "reviewed");
          if (reviewed.length) {
            const last = reviewed[reviewed.length - 1];
            await onTaskReviewed(last.member, last.points || 0);
          }
        } catch (e) {}
      };
    }

    /* ── Hook submitTask ── */
    const origSubmit = window.submitTask;
    if (origSubmit) {
      window.submitTask = async function () {
        await origSubmit.apply(this, arguments);
        const tasks = JSON.parse(localStorage.getItem("titans_tasks") || "[]");
        const submitted = tasks.filter(t => t.status === "submitted" && t.member === _user?.name);
        if (submitted.length) await onTaskSubmitted(_user?.name);
      };
    }

    /* ── Hook addComment ── */
    const origComment = window.addComment;
    if (origComment) {
      window.addComment = async function () {
        await origComment.apply(this, arguments);
        if (_user?.name) await onCommentPosted(_user.name);
      };
    }

    /* ── Hook showSection to refresh on profile/leaderboard switch ── */
    const origShow = window.showSection;
    if (origShow) {
      window.showSection = function (name, el) {
        origShow.apply(this, arguments);
        if (name === "profile")     { setTimeout(refreshProfileCards, 80); }
        if (name === "leaderboard") { setTimeout(injectLeaderboardPoints, 200); }
      };
    }
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API (window.TitansActivity)
  ══════════════════════════════════════════════════════ */

  window.TitansActivity = {
    /* Called from renderProfile() in dashboard.js:
       Add this line inside renderProfile():
         if (window.TitansActivity) TitansActivity.renderProfile(user.name, "profile-activity");
       (already included in the dashboard.js renderProfile — the hook auto-calls it)
    */
    renderProfile(name) {
      renderProfileCards(name);
    },
    getEntry,
    onTaskReviewed,
    onTaskSubmitted,
    onCommentPosted,
    getRpTier,
    getApLevel,
  };

  /* ══════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════ */

  async function init() {
    if (_initialized) return;
    _initialized = true;

    /* Read user from localStorage (mirrors dashboard.js) */
    try {
      _user      = JSON.parse(localStorage.getItem("user") || "null");
      _teamUsers = JSON.parse(localStorage.getItem("teamUsers") || "[]");
      _isCaptain = _user?.role === "captain" || _user?.role === "vice captain";
    } catch (e) { return; }

    if (!_user) return;

    /* Inject styles + HTML */
    injectStyles();
    injectProfileHTML();

    /* Show award form for captains */
    const awardForm = document.getElementById("ta-award-form");
    if (awardForm && _isCaptain) {
      awardForm.style.display = "";
      /* Fill member dropdown */
      const memberSel = document.getElementById("ta-member");
      if (memberSel) {
        memberSel.innerHTML = _teamUsers.map(u =>
          `<option value="${u.name}">${u.name}${u.role === "captain" ? " ⚡" : u.role === "vice captain" ? " ★" : ""}</option>`
        ).join("");
      }
    }

    /* Load data */
    await loadAll();

    /* Record today's login AP */
    await recordLogin(_user.name);

    /* Hook dashboard functions */
    hookDashboard();

    /* Initial render if profile is active */
    refreshProfileCards();
    refreshLeaderboard();

    /* Poll every 8 s (same cadence as dashboard REST polling) */
    setTimeout(pollActivity, 3000);
    setInterval(pollActivity, 8000);
  }

  /* Wait for dashboard to finish its DOMContentLoaded first */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 600));
  } else {
    setTimeout(init, 600);
  }

})();