// ═══════════════════════════════════════════════════════════
//  TITANS PORTAL — Team Formation Module (FIXED)
// ═══════════════════════════════════════════════════════════

const MAX_TEAMS = 13;
const SIZE_LABELS = ['', 'Solo', 'Duo', 'Trio', 'Squad'];

let _teamsRef = null;
let _teamsData = {};
let _currentUser = null;
let _isCapt = false;

// ─── INIT ──────────────────────────────────────────────────
function initTeamFormation() {
  const fb = window._FB;
  if (!fb || !fb.hasFirebase) return;

  _teamsRef = fb.ref(fb.db, 'titans/teams');
  _currentUser = window._currentUser || null;
  _isCapt = window._isCaptain || false;

  fb.onValue(_teamsRef, snap => {
    _teamsData = snap.val() || {};
    renderTeamSection();
  });
}

// ─── MAIN RENDER ───────────────────────────────────────────
function renderTeamSection() {
  renderTeamStats();
  renderTeamForm();
  renderTeamsGrid();
}

// ─── STATS ────────────────────────────────────────────────
function renderTeamStats() {
  const teams = Object.values(_teamsData);
  const total = teams.length;
  const slots = MAX_TEAMS - total;
  const members = teams.reduce((s, t) => s + (t.members ? t.members.length : 1), 0);

  el('tf-stat-teams').textContent = total;
  el('tf-stat-slots').textContent = slots;
  el('tf-stat-members').textContent = members;
}

// ─── FORM ─────────────────────────────────────────────────
function renderTeamForm() {
  if (!_currentUser) {
    el('tf-form-wrap').innerHTML = `
      <div style="padding:20px;color:#888;">
        ⚠️ Loading user data...
      </div>`;
    return;
  }

  const uid = _currentUser.uid || _currentUser.email;
  const myTeam = Object.values(_teamsData).find(t => t.leadUid === uid);

  if (myTeam) {
    el('tf-form-wrap').innerHTML = `
      <div class="tf-already-lead">
        <span>⚡</span>
        <div>
          <b>${myTeam.name}</b><br/>
          You are the team lead
        </div>
        <button onclick="dissolveTeam('${myTeam._key}')">Dissolve</button>
      </div>`;
    return;
  }

  el('tf-form-wrap').innerHTML = `
    <input id="tf-name" placeholder="Team Name"/>
    <input id="tf-lead-name" value="${_currentUser.displayName || ''}" placeholder="Your Name"/>
    <input id="tf-lead-email" value="${_currentUser.email || ''}" readonly/>
    <input id="tf-lead-id" placeholder="Roll No"/>
    
    <div id="tf-members-area"></div>
    <div id="tf-alert"></div>

    <button onclick="registerTeam()">Register Team</button>
  `;
}

// ─── REGISTER ─────────────────────────────────────────────
window.registerTeam = async function() {
  const fb = window._FB;
  if (!fb) return alert("Firebase not ready");

  const name = val('tf-name').trim();
  const leadName = val('tf-lead-name').trim();
  const leadEmail = val('tf-lead-email').trim();
  const leadId = val('tf-lead-id').trim();

  if (!name || !leadName || !leadId) {
    return alert("Fill all required fields");
  }

  const uid = _currentUser.uid || _currentUser.email;

  const teamData = {
    name,
    leadName,
    leadEmail,
    leadId,
    leadUid: uid,
    members: [leadName],
    registeredAt: new Date().toISOString()
  };

  await fb.push(_teamsRef, teamData);
  alert("Team Registered!");
};

// ─── DELETE ───────────────────────────────────────────────
window.dissolveTeam = async function(key) {
  if (!confirm("Delete team?")) return;
  const fb = window._FB;
  await fb.remove(fb.ref(fb.db, `titans/teams/${key}`));
};

// ─── GRID ────────────────────────────────────────────────
function renderTeamsGrid() {
  const grid = el('tf-teams-grid');
  if (!grid) return;

  const teams = Object.entries(_teamsData).map(([k,v]) => ({...v, _key:k}));

  if (teams.length === 0) {
    grid.innerHTML = `<p>No teams yet</p>`;
    return;
  }

  grid.innerHTML = teams.map(t => `
    <div>
      <b>${t.name}</b><br/>
      Lead: ${t.leadName}
    </div>
  `).join('');
}

// ─── HELPERS ─────────────────────────────────────────────
function el(id){ return document.getElementById(id); }
function val(id){ return el(id)?.value || ""; }

// ─── HOOK ────────────────────────────────────────────────
window.onShowTeams = function() {
  _currentUser = window._currentUser || null;
  _isCapt = window._isCaptain || false;

  if (!_teamsRef) initTeamFormation();
  else renderTeamSection();
};

// ─── SMART INIT (FIXED) ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const check = setInterval(() => {
    if (window._FB && window._FB.hasFirebase && window._currentUser) {
      clearInterval(check);
      initTeamFormation();
    }
  }, 300);
});