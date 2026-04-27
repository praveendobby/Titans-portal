// ═══════════════════════════════════════════════════════════
//  TITANS PORTAL — Team Formation Module
//  team-formation.js
//  Reads/writes to Firebase: titans/teams
// ═══════════════════════════════════════════════════════════

const MAX_TEAMS = 13;
const MAX_TEAM_SIZE = 4;
const SIZE_LABELS = ['', 'Solo', 'Duo', 'Trio', 'Squad'];

let _teamsRef = null;
let _teamsData = {};
let _currentUser = null;   // populated by dashboard.js → window._currentUser
let _isCapt = false;       // populated by dashboard.js → window._isCaptain

// ─── Bootstrap (called once dashboard.js has set up Firebase) ───────────────
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

// ─── Render entire section ───────────────────────────────────────────────────
function renderTeamSection() {
  renderTeamStats();
  renderTeamForm();
  renderTeamsGrid();
}

// ─── Stats bar ───────────────────────────────────────────────────────────────
function renderTeamStats() {
  const teams = Object.values(_teamsData);
  const total = teams.length;
  const slots = MAX_TEAMS - total;
  const members = teams.reduce((s, t) => s + (t.members ? t.members.length : 1), 0);

  el('tf-stat-teams').textContent = total;
  el('tf-stat-slots').textContent = slots;
  el('tf-stat-members').textContent = members;
}

// ─── Form: show / hide based on whether user already leads a team ────────────
function renderTeamForm() {
  if (!_currentUser) return;
  const uid = _currentUser.uid || _currentUser.email;
  const myTeam = Object.values(_teamsData).find(t => t.leadUid === uid);

  if (myTeam) {
    el('tf-form-wrap').innerHTML = `
      <div class="tf-already-lead">
        <span class="tf-already-icon">⚡</span>
        <div>
          <div class="tf-already-name">${myTeam.name}</div>
          <div class="tf-already-sub">You are the team lead of this squad.</div>
        </div>
        <button class="btn-danger tf-dissolve-btn" onclick="dissolveTeam('${myTeam._key}')">Dissolve Team</button>
      </div>`;
    return;
  }

  const selectedSize = parseInt(el('tf-size-select')?.value || '1');

  el('tf-form-wrap').innerHTML = `
    <div class="tf-form-inner">
      <div class="tf-form-row">
        <div class="tf-field">
          <label class="tf-label">Team Name</label>
          <input class="tf-input" id="tf-name" placeholder="e.g. Shadow Wolves" maxlength="30"/>
        </div>
        <div class="tf-field">
          <label class="tf-label">Your Name (Team Lead)</label>
          <input class="tf-input" id="tf-lead-name" placeholder="Your full name" maxlength="40"
            value="${_currentUser.displayName || ''}"/>
        </div>
      </div>

      <div class="tf-form-row">
        <div class="tf-field">
          <label class="tf-label">Lead Email</label>
          <input class="tf-input" id="tf-lead-email" placeholder="your@email.com"
            value="${_currentUser.email || ''}" readonly style="opacity:0.6"/>
        </div>
        <div class="tf-field">
          <label class="tf-label">Lead Roll / ID</label>
          <input class="tf-input" id="tf-lead-id" placeholder="e.g. 22CS001" maxlength="20"/>
        </div>
      </div>

      <div class="tf-field" style="margin-bottom:18px">
        <label class="tf-label">Squad Size</label>
        <div class="tf-size-btns" id="tf-size-btns">
          ${[1,2,3,4].map(n => `
            <button class="tf-size-btn ${n === 1 ? 'active' : ''}" data-n="${n}" onclick="tfSelectSize(${n})">
              <span class="tf-size-num">${n}</span>
              <span class="tf-size-tag">${SIZE_LABELS[n]}</span>
            </button>`).join('')}
        </div>
      </div>

      <div id="tf-members-area"></div>

      <div class="tf-alert" id="tf-alert" style="display:none"></div>

      <button class="btn-primary tf-submit" onclick="registerTeam()">⚡ Register Team</button>
    </div>`;

  tfSelectSize(1);
}

// ─── Size selector ────────────────────────────────────────────────────────────
window.tfSelectSize = function(n) {
  document.querySelectorAll('.tf-size-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.tf-size-btn[data-n="${n}"]`);
  if (btn) btn.classList.add('active');
  renderMemberFields(n);
};

function renderMemberFields(n) {
  const area = el('tf-members-area');
  if (!area) return;
  if (n <= 1) { area.innerHTML = ''; return; }

  const rows = Array.from({length: n - 1}, (_, i) => `
    <div class="tf-member-row">
      <span class="tf-member-badge">M${i + 2}</span>
      <input class="tf-input tf-member-input" id="tf-m${i+1}" placeholder="Member ${i+2} name" maxlength="40"/>
    </div>`).join('');

  area.innerHTML = `
    <div class="tf-field">
      <label class="tf-label">Additional Members</label>
      <div class="tf-members-list">${rows}</div>
    </div>`;
}

// ─── Register ─────────────────────────────────────────────────────────────────
window.registerTeam = async function() {
  const fb = window._FB;
  if (!fb || !fb.hasFirebase) return tfAlert('Firebase not connected.', 'err');

  const name      = val('tf-name').trim();
  const leadName  = val('tf-lead-name').trim();
  const leadEmail = val('tf-lead-email').trim();
  const leadId    = val('tf-lead-id').trim();

  if (!name)      return tfAlert('Team name is required.', 'err');
  if (!leadName)  return tfAlert('Your name is required.', 'err');
  if (!leadId)    return tfAlert('Roll / ID number is required.', 'err');

  const activeBtn = document.querySelector('.tf-size-btn.active');
  const size = activeBtn ? parseInt(activeBtn.dataset.n) : 1;

  const members = [leadName];
  for (let i = 1; i < size; i++) {
    const mval = val(`tf-m${i}`).trim();
    if (!mval) return tfAlert(`Member ${i+1} name is required.`, 'err');
    members.push(mval);
  }

  const teams = Object.values(_teamsData);

  if (teams.length >= MAX_TEAMS)
    return tfAlert('Maximum 13 teams reached. Registration closed.', 'err');

  if (teams.find(t => t.name.toLowerCase() === name.toLowerCase()))
    return tfAlert('A team with this name already exists.', 'err');

  const uid = (_currentUser?.uid || _currentUser?.email || '').toString();
  if (teams.find(t => t.leadUid === uid))
    return tfAlert('You already lead a team.', 'err');

  const teamData = {
    name,
    leadName,
    leadEmail,
    leadId,
    leadUid: uid,
    size,
    sizeLabel: SIZE_LABELS[size],
    members,
    registeredAt: new Date().toISOString()
  };

  try {
    const newRef = await fb.push(_teamsRef, teamData);
    tfAlert(`"${name}" registered! Welcome to Titans. ⚡`, 'ok');
  } catch (e) {
    tfAlert('Failed to register: ' + e.message, 'err');
  }
};

// ─── Dissolve (captain or own team only) ─────────────────────────────────────
window.dissolveTeam = async function(key) {
  if (!confirm('Are you sure you want to dissolve this team? This cannot be undone.')) return;
  const fb = window._FB;
  await fb.remove(fb.ref(fb.db, `titans/teams/${key}`));
};

// ─── Teams grid ───────────────────────────────────────────────────────────────
function renderTeamsGrid() {
  const grid = el('tf-teams-grid');
  if (!grid) return;

  const teams = Object.entries(_teamsData).map(([k, v]) => ({...v, _key: k}));
  const uid = (_currentUser?.uid || _currentUser?.email || '').toString();

  if (teams.length === 0) {
    grid.innerHTML = `<div class="tf-empty">
      <span>🛡️</span><p>No teams formed yet. Be the first to lead.</p>
    </div>`;
    return;
  }

  grid.innerHTML = teams.map(t => {
    const isMyTeam = t.leadUid === uid;
    const memberList = (t.members || [t.leadName]).map((m, i) => `
      <div class="tf-tc-member">
        <span class="tf-tc-dot ${i === 0 ? 'lead' : ''}"></span>
        ${m}${i === 0 ? ' <span class="tf-tc-lead-tag">lead</span>' : ''}
      </div>`).join('');

    return `
      <div class="tf-team-card ${isMyTeam ? 'my-team' : ''}">
        <div class="tf-tc-top">
          <span class="tf-tc-size-badge">${t.sizeLabel || SIZE_LABELS[t.size] || t.size}</span>
          ${isMyTeam ? '<span class="tf-tc-mine-badge">Your Team</span>' : ''}
        </div>
        <div class="tf-tc-name">${t.name}</div>
        <div class="tf-tc-lead">Lead: ${t.leadName} · ${t.leadId || ''}</div>
        <div class="tf-tc-members">${memberList}</div>
        ${(_isCapt || isMyTeam) ? `<button class="tf-tc-dissolve btn-danger" onclick="dissolveTeam('${t._key}')">Dissolve</button>` : ''}
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }
function val(id) { return el(id)?.value || ''; }

function tfAlert(msg, type) {
  const a = el('tf-alert');
  if (!a) return;
  a.textContent = msg;
  a.className = 'tf-alert ' + (type === 'ok' ? 'tf-alert-ok' : 'tf-alert-err');
  a.style.display = 'block';
  setTimeout(() => { a.style.display = 'none'; }, 4000);
}

// ─── Called by dashboard.js showSection() hook ───────────────────────────────
window.onShowTeams = function() {
  _currentUser = window._currentUser || null;
  _isCapt = window._isCaptain || false;
  if (!_teamsRef) initTeamFormation();
  else renderTeamSection();
};

// ─── Auto-init after DOM ready ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initTeamFormation, 1200); // wait for dashboard.js Firebase init
});