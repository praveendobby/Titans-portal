window.TitansActivity = (() => {

  const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";

  const DEFAULT_POINTS = {
    "Praveen M": { pSkill: 0, pbl: 0, events: 0, total: 3700 },
    "Tarun Kumar": { pSkill: 0, pbl: 0, events: 0, total: 5435 },
    "Thaya Tharsan N": { pSkill: 0, pbl: 0, events: 0, total: 3735 },
    "Thariq Anvar R": { pSkill: 0, pbl: 0, events: 0, total: 3685 },
    "Dhivya Dharshini S": { pSkill: 0, pbl: 0, events: 0, total: 3345 },
    "Keshanth V": { pSkill: 0, pbl: 0, events: 0, total: 3965 },
    "Vishnu G": { pSkill: 0, pbl: 0, events: 0, total: 3780 },
    "Subashree B": { pSkill: 0, pbl: 0, events: 0, total: 4690 },
    "Akilesh M": { pSkill: 0, pbl: 0, events: 0, total: 3640 },
    "Shiva Shanth M": { pSkill: 0, pbl: 0, events: 0, total: 3690 },
    "Muthamil Selvan": { pSkill: 0, pbl: 0, events: 0, total: 1790 },
    "Rubika s": { pSkill: 0, pbl: 0, events: 0, total: 1375 },
    "Roshini M": { pSkill: 0, pbl: 0, events: 0, total: 1450 },
    "mem14": { pSkill: 0, pbl: 0, events: 0, total: 0 },
    "mem15": { pSkill: 0, pbl: 0, events: 0, total: 0 },
  };

  let activityData = {};

  /* ── STYLE ── */
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap');

    .ap-card {
      font-family: 'Syne', sans-serif;
      background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04));
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 16px; padding: 20px; margin-top: 16px;
    }

    .ap-card-title {
      font-weight: 800;
      font-size: 13px; color: #818cf8; margin-bottom: 14px;
    }

    .ap-total {
      font-size: 40px; font-weight: 800;
      text-align: center; margin: 8px 0;
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .ap-total-label {
      text-align: center; font-size: 11px;
      color: rgba(255,255,255,0.3); margin-bottom: 16px;
    }

    .ap-cat-row {
      display: flex; justify-content: space-between;
      padding: 10px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      margin-bottom: 6px;
      font-family: 'Inter', sans-serif;
    }

    .ap-cat-name { color: rgba(255,255,255,0.6); }
    .ap-cat-pts { font-weight: 600; color: #a78bfa; }

    .ap-updated {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      text-align: center;
      margin-top: 10px;
    }
  `;
  document.head.appendChild(style);

  /* ── LOAD DATA ── */
  async function loadData() {
    try {
      const r = await fetch(`${FIREBASE_URL}/titans/activityPoints.json`);
      const data = await r.json();
      activityData = data || DEFAULT_POINTS;
    } catch {
      activityData = DEFAULT_POINTS;
    }
  }

  /* ── SAFE NAME MATCH ── */
  function getPoints(name) {
    const key = Object.keys(activityData).find(k => k.trim() === name.trim());
    return activityData[key] || { pSkill: 0, pbl: 0, events: 0, total: 0 };
  }

  /* ── PROFILE RENDER ── */
  function renderProfile(name, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pts = getPoints(name);

    container.innerHTML = `
      <div class="ap-card">
        <div class="ap-card-title">⚡ Activity Points</div>

        <div class="ap-total">${pts.total}</div>
        <div class="ap-total-label">TOTAL POINTS</div>

        <div class="ap-cat-row">
          <span class="ap-cat-name">📚 P Skill</span>
          <span class="ap-cat-pts">${pts.pSkill || "-"}</span>
        </div>

        <div class="ap-cat-row">
          <span class="ap-cat-name">🛠️ PBL</span>
          <span class="ap-cat-pts">${pts.pbl || "-"}</span>
        </div>

        <div class="ap-cat-row">
          <span class="ap-cat-name">🏆 Events</span>
          <span class="ap-cat-pts">${pts.events || "-"}</span>
        </div>

        <div class="ap-updated">Synced from PS Portal</div>
      </div>
    `;
  }

  async function init() {
    await loadData();
  }

  return { init, renderProfile, getPoints };

})();

document.addEventListener("DOMContentLoaded", () => {
  TitansActivity.init();

  // ✅ IMPORTANT: Call this manually after user loads
  setTimeout(() => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    if (user.name) {
      TitansActivity.renderProfile(user.name, "profile-activity");
    }
  }, 300);
});