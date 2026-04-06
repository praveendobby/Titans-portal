/* ============================================================
   TITANS VOICE NOTES — voice-notes.js
   Drop this into your project root and add to dashboard.html
   
   Features:
   ✅ Record voice notes on any task
   ✅ Playback with waveform visualizer
   ✅ Saves to Firebase as base64 audio
   ✅ Shows recorder name + timestamp
   ✅ Delete voice notes (captain only)
============================================================ */

window.VoiceNotes = (() => {

  let mediaRecorder = null;
  let audioChunks = [];
  let recordingTaskId = null;
  let isRecording = false;
  let timerInterval = null;
  let recordingSeconds = 0;
  let analyserInterval = null;

  /* ── Inject CSS ── */
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

    .vn-modal-overlay {
      position: fixed; inset: 0; z-index: 10001;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      animation: vnFadeIn 0.2s ease;
    }
    @keyframes vnFadeIn { from{opacity:0} to{opacity:1} }

    .vn-modal {
      width: 380px; background: #0a0f1a;
      border: 1px solid rgba(139,92,246,0.3);
      border-radius: 20px; padding: 24px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
      animation: vnSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes vnSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

    .vn-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
    }
    .vn-title {
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px;
      color: #fff; display: flex; align-items: center; gap: 8px;
    }
    .vn-title span { font-size: 20px; }
    .vn-close {
      background: none; border: none; color: rgba(255,255,255,0.4);
      font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 8px;
      transition: color 0.2s, background 0.2s;
    }
    .vn-close:hover { color: #fff; background: rgba(255,255,255,0.08); }

    .vn-task-name {
      font-size: 12px; color: #a78bfa; margin-bottom: 16px;
      padding: 8px 12px; background: rgba(139,92,246,0.1);
      border: 1px solid rgba(139,92,246,0.2); border-radius: 8px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* Visualizer */
    .vn-visualizer {
      height: 60px; background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      gap: 3px; padding: 0 16px; margin-bottom: 16px; overflow: hidden;
    }
    .vn-bar {
      width: 3px; border-radius: 2px;
      background: linear-gradient(to top, #7c3aed, #a78bfa);
      transition: height 0.1s ease;
      min-height: 4px;
    }
    .vn-bar.idle { height: 4px; opacity: 0.3; }
    .vn-bar.active { animation: vnBarPulse 0.8s ease infinite alternate; }
    @keyframes vnBarPulse {
      from { height: 4px; opacity: 0.5; }
      to { height: 40px; opacity: 1; }
    }

    /* Timer */
    .vn-timer {
      text-align: center; font-family: 'Syne', sans-serif;
      font-size: 28px; font-weight: 800; color: #fff;
      letter-spacing: 4px; margin-bottom: 16px;
    }
    .vn-timer.recording { color: #f87171; animation: vnTimerPulse 1s ease infinite; }
    @keyframes vnTimerPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

    /* Record button */
    .vn-record-btn {
      width: 100%; padding: 14px; border-radius: 14px; border: none;
      cursor: pointer; font-family: 'Syne', sans-serif; font-weight: 700;
      font-size: 14px; letter-spacing: 1px; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .vn-record-btn.start {
      background: linear-gradient(135deg, #7c3aed, #a78bfa);
      color: #fff; box-shadow: 0 4px 20px rgba(124,58,237,0.4);
    }
    .vn-record-btn.start:hover { transform: scale(1.02); box-shadow: 0 6px 24px rgba(124,58,237,0.6); }
    .vn-record-btn.stop {
      background: linear-gradient(135deg, #dc2626, #f87171);
      color: #fff; box-shadow: 0 4px 20px rgba(220,38,38,0.4);
      animation: vnRecordPulse 1.5s ease infinite;
    }
    @keyframes vnRecordPulse {
      0%,100% { box-shadow: 0 4px 20px rgba(220,38,38,0.4); }
      50% { box-shadow: 0 4px 30px rgba(220,38,38,0.7); }
    }
    .vn-record-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #fff;
      animation: vnDotBlink 1s ease infinite;
    }
    @keyframes vnDotBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }

    /* Divider */
    .vn-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 20px 0; color: rgba(255,255,255,0.2); font-size: 11px;
    }
    .vn-divider::before, .vn-divider::after {
      content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.08);
    }

    /* Voice note list */
    .vn-list { display: flex; flex-direction: column; gap: 10px; max-height: 200px; overflow-y: auto; }
    .vn-list::-webkit-scrollbar { width: 4px; }
    .vn-list::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }

    .vn-item {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;
      animation: vnFadeIn 0.2s ease;
    }
    .vn-item-header { display: flex; align-items: center; justify-content: space-between; }
    .vn-item-author {
      font-size: 12px; font-weight: 600; color: #a78bfa;
      display: flex; align-items: center; gap: 6px;
    }
    .vn-item-author::before {
      content: ""; width: 6px; height: 6px; border-radius: 50%;
      background: #a78bfa; display: inline-block;
    }
    .vn-item-time { font-size: 10px; color: rgba(255,255,255,0.25); }
    .vn-audio { width: 100%; height: 32px; border-radius: 8px; opacity: 0.9; }
    .vn-audio::-webkit-media-controls-panel { background: rgba(139,92,246,0.2); }

    .vn-delete-btn {
      background: none; border: none; color: rgba(255,255,255,0.2);
      cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 6px;
      transition: color 0.2s, background 0.2s;
    }
    .vn-delete-btn:hover { color: #f87171; background: rgba(248,113,113,0.1); }

    .vn-empty {
      text-align: center; padding: 16px; font-size: 12px;
      color: rgba(255,255,255,0.2);
    }

    /* Voice note badge on task */
    .vn-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 20px; font-size: 11px;
      background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);
      color: #a78bfa; cursor: pointer; transition: all 0.15s;
    }
    .vn-badge:hover { background: rgba(139,92,246,0.3); }

    /* Voice note button in task actions */
    .vn-task-btn {
      background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);
      color: #a78bfa; border-radius: 8px; padding: 6px 10px;
      cursor: pointer; font-size: 14px; transition: all 0.15s;
      display: flex; align-items: center; gap: 4px;
    }
    .vn-task-btn:hover { background: rgba(139,92,246,0.3); }
    .vn-task-btn .vn-count {
      font-size: 10px; background: #7c3aed; color: #fff;
      border-radius: 10px; padding: 1px 5px; font-weight: 700;
    }
  `;
  document.head.appendChild(style);

  /* ── Helpers ── */
  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  }

  function isCaptain() {
    const u = getUser();
    return u.role === "captain" || u.role === "vice captain";
  }

  /* ── Build bars for visualizer ── */
  function buildBars(container, count = 28) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const bar = document.createElement("div");
      bar.className = "vn-bar idle";
      bar.style.height = `${4 + Math.random() * 8}px`;
      container.appendChild(bar);
    }
  }

  function animateBars(container, active) {
    const bars = container.querySelectorAll(".vn-bar");
    if (active) {
      analyserInterval = setInterval(() => {
        bars.forEach(bar => {
          const h = 4 + Math.random() * 48;
          bar.style.height = `${h}px`;
          bar.style.opacity = "1";
          bar.className = "vn-bar";
        });
      }, 120);
    } else {
      clearInterval(analyserInterval);
      bars.forEach(bar => {
        bar.style.height = "4px";
        bar.style.opacity = "0.3";
        bar.className = "vn-bar idle";
      });
    }
  }

  /* ── Open Voice Notes Modal ── */
  function openModal(taskId) {
    recordingTaskId = String(taskId);

    // Get task from global tasks array
    const task = (window.titans_tasks || []).find(t => String(t.id) === recordingTaskId);
    const taskName = task ? task.text : "Task";
    const voiceNotes = task ? (task.voiceNotes || []) : [];

    // Remove existing modal
    document.getElementById("vnModal")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "vn-modal-overlay";
    overlay.id = "vnModal";
    overlay.innerHTML = `
      <div class="vn-modal">
        <div class="vn-header">
          <div class="vn-title"><span>🎤</span> Voice Notes</div>
          <button class="vn-close" onclick="VoiceNotes.closeModal()">✕</button>
        </div>
        <div class="vn-task-name">"${taskName}"</div>

        <div class="vn-visualizer" id="vnVisualizer"></div>

        <div class="vn-timer" id="vnTimer">00:00</div>

        <button class="vn-record-btn start" id="vnRecordBtn" onclick="VoiceNotes.toggleRecording()">
          <div class="vn-record-dot" style="background:#fff;animation:none"></div>
          START RECORDING
        </button>

        <div class="vn-divider">SAVED VOICE NOTES</div>

        <div class="vn-list" id="vnList">
          ${renderNotesList(voiceNotes)}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    buildBars(document.getElementById("vnVisualizer"));

    // Close on overlay click
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeModal();
    });
  }

  function renderNotesList(notes) {
    if (!notes || !notes.length) {
      return `<div class="vn-empty">🎤 No voice notes yet — record the first one!</div>`;
    }
    return notes.map((n, i) => `
      <div class="vn-item" id="vn-item-${i}">
        <div class="vn-item-header">
          <div class="vn-item-author">${n.author}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="vn-item-time">${n.time} · ${n.duration}</div>
            ${isCaptain() || n.author === getUser().name ?
              `<button class="vn-delete-btn" onclick="VoiceNotes.deleteNote('${recordingTaskId}', ${i})">✕</button>` : ""}
          </div>
        </div>
        <audio class="vn-audio" controls src="${n.audio}"></audio>
      </div>
    `).join("");
  }

  /* ── Toggle Recording ── */
  async function toggleRecording() {
    if (!isRecording) {
      await startRecording();
    } else {
      stopRecording();
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      recordingSeconds = 0;

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.start(100);
      isRecording = true;

      // Update UI
      const btn = document.getElementById("vnRecordBtn");
      const timer = document.getElementById("vnTimer");
      if (btn) {
        btn.className = "vn-record-btn stop";
        btn.innerHTML = `<div class="vn-record-dot"></div> STOP RECORDING`;
      }
      if (timer) timer.className = "vn-timer recording";

      // Start timer
      timerInterval = setInterval(() => {
        recordingSeconds++;
        const t = document.getElementById("vnTimer");
        if (t) t.textContent = formatTime(recordingSeconds);
        if (recordingSeconds >= 120) stopRecording(); // max 2 min
      }, 1000);

      // Animate bars
      animateBars(document.getElementById("vnVisualizer"), true);

    } catch (err) {
      alert("❌ Microphone access denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    if (!mediaRecorder) return;

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const base64 = await blobToBase64(blob);
      const user = getUser();

      const note = {
        author: user.name || "Unknown",
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        duration: formatTime(recordingSeconds),
        audio: base64
      };

      await saveNote(note);
    };

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    isRecording = false;

    clearInterval(timerInterval);
    animateBars(document.getElementById("vnVisualizer"), false);

    const btn = document.getElementById("vnRecordBtn");
    const timer = document.getElementById("vnTimer");
    if (btn) {
      btn.className = "vn-record-btn start";
      btn.innerHTML = `<div class="vn-record-dot" style="background:#fff;animation:none"></div> START RECORDING`;
    }
    if (timer) { timer.className = "vn-timer"; timer.textContent = "00:00"; }
  }

  function blobToBase64(blob) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  /* ── Save Note to Firebase ── */
  async function saveNote(note) {
    const tasks = window.titans_tasks || [];
    const task = tasks.find(t => String(t.id) === recordingTaskId);
    if (!task) return;

    if (!task.voiceNotes) task.voiceNotes = [];
    task.voiceNotes.push(note);

    // Save to Firebase
    const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";
    if (task._fbId) {
      try {
        await fetch(`${FIREBASE_URL}/titans/tasks/${task._fbId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceNotes: task.voiceNotes })
        });
      } catch (e) {
        console.warn("Voice note save failed:", e);
      }
    }

    // Update list in modal
    const list = document.getElementById("vnList");
    if (list) list.innerHTML = renderNotesList(task.voiceNotes);

    // Update badge on task
    updateTaskBadge(recordingTaskId, task.voiceNotes.length);

    showToastVN(`🎤 Voice note saved!`);
  }

  /* ── Delete Note ── */
  async function deleteNote(taskId, index) {
    if (!confirm("Delete this voice note?")) return;
    const tasks = window.titans_tasks || [];
    const task = tasks.find(t => String(t.id) === String(taskId));
    if (!task || !task.voiceNotes) return;

    task.voiceNotes.splice(index, 1);

    const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";
    if (task._fbId) {
      try {
        await fetch(`${FIREBASE_URL}/titans/tasks/${task._fbId}.json`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceNotes: task.voiceNotes })
        });
      } catch (e) { console.warn(e); }
    }

    const list = document.getElementById("vnList");
    if (list) list.innerHTML = renderNotesList(task.voiceNotes);
    updateTaskBadge(taskId, task.voiceNotes.length);
  }

  /* ── Update badge on task card ── */
  function updateTaskBadge(taskId, count) {
    const badge = document.getElementById(`vn-badge-${taskId}`);
    if (badge) {
      badge.innerHTML = `🎤 ${count}`;
    }
  }

  /* ── Close Modal ── */
  function closeModal() {
    if (isRecording) stopRecording();
    document.getElementById("vnModal")?.remove();
    recordingTaskId = null;
  }

  /* ── Toast ── */
  function showToastVN(msg) {
    if (window.showToast) { window.showToast(msg); return; }
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)",
      background: "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff",
      padding: "12px 24px", borderRadius: "12px", fontSize: "13px",
      fontWeight: "600", zIndex: "99999", pointerEvents: "none"
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ── Generate button HTML for task list ── */
  function getButtonHTML(taskId, voiceNotes) {
    const count = (voiceNotes || []).length;
    return `<button class="vn-task-btn" onclick="VoiceNotes.openModal('${taskId}')" title="Voice Notes">
      🎤${count > 0 ? `<span class="vn-count">${count}</span>` : ""}
    </button>`;
  }

  return { openModal, closeModal, toggleRecording, deleteNote, getButtonHTML };

})();

// Make tasks accessible to VoiceNotes
Object.defineProperty(window, 'titans_tasks', {
  get: () => {
    try { return JSON.parse(localStorage.getItem("titans_tasks")) || []; } catch { return []; }
  }
});