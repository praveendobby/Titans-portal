/* ============================================================
   TITANS DASHBOARD — v3 FIXED

   KEY FIXES:
   ✅ REST API polling every 8s → captain sees member changes
   ✅ All writes use REST API (no more localStorage-only sync)
   ✅ Notifications work without Firebase SDK
   ✅ Sync badge accurate (🟢 = REST polling active)
   ✅ Task submission/review/reject fully synced cross-device
   ✅ Comments, reassign, meetings, news all synced
   ✅ Duplicate notification prevention
============================================================ */

const FIREBASE_URL = "https://titans-portal-8b124-default-rtdb.firebaseio.com";
window.addEventListener("DOMContentLoaded", () => {
  const savedImage = localStorage.getItem("profilePhoto");

  if (savedImage) {
    document.getElementById("profPhoto").style.backgroundImage = `url(${savedImage})`;
    document.getElementById("topbarAvatar").style.backgroundImage = `url(${savedImage})`;
  }
});

/* ══════════════════════════════════════════════════════
   REST API HELPERS (primary write/read layer)
══════════════════════════════════════════════════════ */
const rest = {
  async get(path) {
    const r = await fetch(FIREBASE_URL + path + ".json");
    return r.json();
  },
  async put(path, data) {
    return fetch(FIREBASE_URL + path + ".json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  async patch(path, data) {
    return fetch(FIREBASE_URL + path + ".json", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  },
  async post(path, data) {
    const r = await fetch(FIREBASE_URL + path + ".json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return r.json(); // { name: "firebaseKey" }
  },
  async del(path) {
    return fetch(FIREBASE_URL + path + ".json", { method: "DELETE" });
  }
};

document.addEventListener("DOMContentLoaded", async () => {

  /* ── AUTH GUARD ── */
  let user = JSON.parse(localStorage.getItem("user"));
  if (!user) { window.location.href = "index.html"; return; }

  showLoadingScreen();

  /* ══════════════════════════════════════════════════════
     STEP 1: Push latest teamUsers → Firebase
  ══════════════════════════════════════════════════════ */
  let teamUsers = JSON.parse(localStorage.getItem("teamUsers")) || [];

  if (teamUsers.length > 0) {
    const safe = teamUsers.map(u => ({
      email: u.email, role: u.role, name: u.name,
      designation: u.designation, department: u.department,
      team: u.team, groupId: u.groupId, regNo: u.regNo,
      imgSrc: u.imgSrc || "", phone: u.phone || ""
    }));
    rest.put("/titans/team", safe).catch(() => {});
  }

  /* ══════════════════════════════════════════════════════
     STEP 2: Read back from Firebase → merge
  ══════════════════════════════════════════════════════ */
  try {
    const data = await rest.get("/titans/team");
    if (data && Array.isArray(data) && data.length > 0) {
      const local = JSON.parse(localStorage.getItem("teamUsers")) || [];
      const merged = data.map(fbU => {
        const loc = local.find(l => l.email === fbU.email);
        return { ...fbU, password: loc?.password || "1234", waApiKey: loc?.waApiKey || "", phone: fbU.phone || loc?.phone || "" };
      });
      teamUsers = merged;
      localStorage.setItem("teamUsers", JSON.stringify(merged));
    }
  } catch(e) {}

  /* ══════════════════════════════════════════════════════
     STEP 3: Refresh current user with latest data
  ══════════════════════════════════════════════════════ */
  const freshUser = teamUsers.find(u => u.email === user.email);
  if (freshUser) {
    user = { ...user, ...freshUser, password: user.password };
    localStorage.setItem("user", JSON.stringify(user));
  }

  hideLoadingScreen();

  const isCaptain = user.role === "captain" || user.role === "vice captain";
  const FB = window._FB || { hasFirebase: false };

  /* ── State ── */
  let tasks  = [];
  let meta   = {};
  let prevIds = new Set();
  let prevMeetingIds = new Set();
  let firstLoad = true;

  let activeSubmitTaskId   = null;
  let activeReviewTaskId   = null;
  let activeCommentTaskId  = null;
  let activeReassignTaskId = null;
  let selectedPoints = 5;

  /* ── Polling state ── */
  let _pollTasksHash = '';
  let _pollMetaHash  = '';

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */
  const ini   = n => (n||"??").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const avCls = i => "av-" + ((typeof i==="number"?i:0) % 10);
  const mIdx  = n => teamUsers.findIndex(u => u.name === n);
  const colors = ["#8b5cf6","#10b981","#f59e0b","#ef4444","#3b82f6","#ec4899","#14b8a6","#f97316","#6366f1","#22c55e"];

  function saveLocal(k,v) { try{localStorage.setItem(k,JSON.stringify(v));}catch{} }
  function loadLocal(k,d) { try{return JSON.parse(localStorage.getItem(k))||d;}catch{return d;} }

  function avatarHtml(u, idx) {
    const i       = typeof idx === "number" ? idx : Math.max(0, mIdx(u.name));
    const cls     = avCls(i);
    const initial = ini(u.name);
    const imgSrc  = fixImgUrl(u.imgSrc);
    if (imgSrc) {
      return { cls, html: `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;" onerror="this.remove();this.parentElement.textContent='${initial}';">` };
    }
    return { cls, html: initial };
  }

  function fixImgUrl(url) {
    if (!url) return "";
    const driveMatch = url.match(/\/file\/d\/([^\/]+)/);
    if (driveMatch) return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    return url;
  }

  function dueBadge(d) {
    if (!d) return "";
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(d);
    const lbl   = due.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    const over  = due < today;
    return `<span class="task-chip chip-due${over?" overdue":""}">📅 ${lbl}${over?" ⚠":""}</span>`;
  }

  function memberStats(name) {
    const mine = tasks.filter(t => t.member === name);
    const done = mine.filter(t => t.done || t.status==="reviewed").length;
    return { total:mine.length, done, pending:mine.length-done };
  }

  function getMemberPoints(name) {
    return tasks.filter(t=>t.member===name&&t.points).reduce((s,t)=>s+(t.points||0),0);
  }

  function memberScore(name) {
    const s = memberStats(name);
    const pts = getMemberPoints(name);
    return s.total ? s.done*10 + Math.round(s.done/s.total*50) + pts : pts;
  }

  function statusChip(t) {
    const st = t.status||"pending";
    const map = {
      pending:  ["status-pending",  "⏳ Pending"],
      submitted:["status-submitted","📤 Submitted"],
      reviewed: ["status-reviewed", "✅ Reviewed"],
      done:     ["status-done",     "✓ Done"],
      rejected: ["status-rejected", "↩ Returned"]
    };
    const [cls,lbl] = map[st]||map.pending;
    return `<span class="task-chip ${cls}">${lbl}</span>`;
  }

  /* ══════════════════════════════════════════════════════
     SYNC BADGE
  ══════════════════════════════════════════════════════ */
  function setSyncBadge(mode) {
    const b = document.getElementById("syncBadge");
    if (!b) return;
    b.className = "sync-badge " + (mode==="live"?"sync-live":"sync-local");
    b.innerHTML = `<span class="sync-dot"></span>${mode==="live"?"🟢 Live":"🟡 Local"}`;
  }

  /* ══════════════════════════════════════════════════════
     TOPBAR SETUP
  ══════════════════════════════════════════════════════ */
  function setupTopbar() {
    const nameEl = document.getElementById("topbarName");
    const roleEl = document.getElementById("topbarRole");
    const av     = document.getElementById("topbarAvatar");
    if (nameEl) nameEl.textContent = user.name.split(" ")[0];
    if (roleEl) roleEl.textContent = user.designation;

    if (av) {
      const {cls, html} = avatarHtml(user, mIdx(user.name));
      if (user.imgSrc) {
        av.innerHTML  = html;
        av.className  = "topbar-avatar " + cls;
      } else {
        av.className  = "topbar-avatar " + cls;
        av.textContent = ini(user.name);
      }
    }

    if (isCaptain) {
      const els = ["analyticsNav","captainTools","newsPostCard","meetingPostCard"];
      els.forEach(id => { const el=document.getElementById(id); if(el) el.style.display=""; });
      const ttl = document.getElementById("taskListTitle");
      if (ttl) ttl.textContent = "All Tasks";
      fillSelect("memberSelect", false);
      fillSelect("filterMember", true);
      fillSelect("reassignSelect", false);
    } else {
      const ttl = document.getElementById("taskListTitle");
      if (ttl) ttl.textContent = "My Tasks";
      const fw = document.getElementById("filterMember")?.closest("div");
      if (fw) fw.style.display = "none";
    }

    const sel = document.getElementById("myStatusSel");
    if (sel) sel.value = loadLocal("titans_status_"+user.name,"online");
  }

  function fillSelect(id, addAll) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = addAll ? '<option value="all">All Members</option>' : "";
    teamUsers.forEach(u => {
      const o = document.createElement("option");
      o.value = u.name;
      o.textContent = u.name + (u.role==="captain"?" ⚡":u.role==="vice captain"?" ★":"");
      sel.appendChild(o);
    });
  }

  window.updateMyStatus = val => {
    saveLocal("titans_status_"+user.name, val);
    if (FB.hasFirebase) {
      FB.set(FB.ref(FB.db,`titans/status/${user.name.replace(/\s/g,"_")}`), val).catch(()=>{});
    } else {
      rest.patch("/titans/status", { [user.name.replace(/\s/g,"_")]: val }).catch(()=>{});
    }
  };

  /* ══════════════════════════════════════════════════════
     SPRINT COUNTDOWN
  ══════════════════════════════════════════════════════ */
  const SPRINT_END   = new Date("2026-04-30T23:59:59");
  const SPRINT_START = new Date("2026-03-15T00:00:00");
  function updateCountdown() {
    const now  = new Date(), diff = SPRINT_END - now;
    const el   = document.getElementById("cdTimer");
    const bar  = document.getElementById("cdBarFill");
    if (!el) return;
    if (diff <= 0) { el.textContent = "Sprint Ended"; return; }
    const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000),
          m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
    el.textContent = `${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
    if (bar) bar.style.width = Math.min(100,Math.max(0,(new Date()-SPRINT_START)/(SPRINT_END-SPRINT_START)*100))+"%";
  }
  updateCountdown(); setInterval(updateCountdown, 1000);

  /* ══════════════════════════════════════════════════════
     REST POLLING — core fix for captain seeing member changes
  ══════════════════════════════════════════════════════ */
  async function pollFirebase() {
    /* ── Poll Tasks ── */
    try {
      const tasksData = await rest.get("/titans/tasks");
      if (tasksData) {
        const fresh = Object.entries(tasksData).map(([fbId,v]) => ({...v, _fbId: fbId}));
        const newHash = fresh.map(t => `${t.id}|${t.status}|${t.points||0}|${(t.comments||[]).length}|${t.member}`).sort().join(",");

        if (newHash !== _pollTasksHash) {
          _pollTasksHash = newHash;

          if (!firstLoad) {
            /* New task assigned to me */
            fresh.filter(t=>t.member===user.name&&!prevIds.has(String(t.id))).forEach(t=>{
              addNotif(`📌 New task: "${t.text}" — by ${t.assignedBy}`,t.priority);
              showToast(`🔔 New task: "${t.text}"`);
            });
            /* My task reviewed */
            fresh.filter(t=>t.member===user.name&&t.status==="reviewed").forEach(t=>{
              const old=tasks.find(x=>String(x.id)===String(t.id));
              if(old&&old.status!=="reviewed"){
                addNotif(`⭐ "${t.text}" reviewed — +${t.points||0} pts!`,"normal");
                showToast(`⭐ Task reviewed! +${t.points||0} pts`);
              }
            });
            /* My task rejected */
            fresh.filter(t=>t.member===user.name&&t.status==="rejected").forEach(t=>{
              const old=tasks.find(x=>String(x.id)===String(t.id));
              if(old&&old.status!=="rejected"){
                addNotif(`↩ "${t.text}" returned: ${t.reviewFeedback||"Please revise"}`,"normal");
                showToast(`↩ Task returned for revision`);
              }
            });
            /* New submission (captain only) */
            if (isCaptain) {
              fresh.filter(t=>t.status==="submitted").forEach(t=>{
                const old=tasks.find(x=>String(x.id)===String(t.id));
                if(old&&old.status!=="submitted"){
                  addNotif(`📤 ${t.member} submitted: "${t.text}"`,"normal");
                  showToast(`📤 New submission from ${t.member}`);
                }
              });
            }
          }

          prevIds = new Set(fresh.filter(t=>t.member===user.name).map(t=>String(t.id)));
          tasks = fresh;
          saveLocal("titans_tasks", tasks);
          bootRender();
        }
      }
    } catch(e) {}

    /* ── Poll Meta ── */
    try {
      const freshMeta = await rest.get("/titans/meta");
      if (freshMeta) {
        const newHash = JSON.stringify(freshMeta);
        if (newHash !== _pollMetaHash) {
          _pollMetaHash = newHash;

          if (!firstLoad) {
            (freshMeta.meetings||[]).forEach(m=>{
              if(!prevMeetingIds.has(String(m.id))){
                addNotif(`📅 Meeting: "${m.title}" on ${m.date} at ${m.time} — ${m.venue}`,"normal");
                showToast(`📅 New meeting: "${m.title}"`);
              }
            });
            prevMeetingIds = new Set((freshMeta.meetings||[]).map(m=>String(m.id)));
          }

          meta = freshMeta;
          saveLocal("titans_meta", meta);
          renderAnnouncement(); renderStandup();
          renderHomeUpcomingMeetings(); renderHomeLatestNews();
          const active = document.querySelector(".section.active")?.id;
          if(active==="sec-meetings")    renderMeetings();
          if(active==="sec-noticeboard") renderNewsFeed();
        }
      }
    } catch(e) {}
  }

  function startRestPolling() {
    setTimeout(pollFirebase, 1500);        // quick first poll
    setInterval(pollFirebase, 8000);       // then every 8 s
  }

  /* ══════════════════════════════════════════════════════
     FIREBASE REAL-TIME LISTENERS
  ══════════════════════════════════════════════════════ */
  function startFirebase() {
    /* Always start REST polling regardless of SDK availability */
    setSyncBadge("live");
    startRestPolling();

    if (!FB.hasFirebase) {
      /* Load from local first, then REST polling takes over */
      tasks = loadLocal("titans_tasks",[]);
      meta  = loadLocal("titans_meta",{});
      firstLoad = false;
      prevIds = new Set(tasks.filter(t=>t.member===user.name).map(t=>String(t.id)));
      prevMeetingIds = new Set((meta.meetings||[]).map(m=>String(m.id)));
      setupTopbar(); bootRender();
      return;
    }

    /* Firebase SDK listeners (real-time, instant) */
    FB.onValue(FB.tasksRef, snap => {
      const data  = snap.val();
      const fresh = data ? Object.entries(data).map(([fbId,v])=>({...v,_fbId:fbId})) : [];

      if (!firstLoad) {
        fresh.filter(t=>t.member===user.name&&!prevIds.has(String(t.id))).forEach(t=>{
          addNotif(`📌 New task: "${t.text}" — by ${t.assignedBy}`,t.priority);
          showToast(`🔔 New task: "${t.text}"`);
        });
        fresh.filter(t=>t.member===user.name&&t.status==="reviewed").forEach(t=>{
          const old=tasks.find(x=>String(x.id)===String(t.id));
          if(old&&old.status!=="reviewed"){
            addNotif(`⭐ "${t.text}" reviewed — +${t.points||0} pts!`,"normal");
            showToast(`⭐ Task reviewed! +${t.points||0} pts`);
          }
        });
        fresh.filter(t=>t.member===user.name&&t.status==="rejected").forEach(t=>{
          const old=tasks.find(x=>String(x.id)===String(t.id));
          if(old&&old.status!=="rejected"){
            addNotif(`↩ "${t.text}" returned: ${t.reviewFeedback||"Please revise"}`,"normal");
            showToast(`↩ Task returned for revision`);
          }
        });
        if (isCaptain) fresh.filter(t=>t.status==="submitted").forEach(t=>{
          const old=tasks.find(x=>String(x.id)===String(t.id));
          if(old&&old.status!=="submitted"){
            addNotif(`📤 ${t.member} submitted: "${t.text}"`,"normal");
            showToast(`📤 New submission from ${t.member}`);
          }
        });
      }

      prevIds = new Set(fresh.filter(t=>t.member===user.name).map(t=>String(t.id)));
      tasks = fresh;
      saveLocal("titans_tasks", tasks);
      if (firstLoad) { firstLoad=false; setupTopbar(); }
      bootRender();
    }, () => {
      tasks = loadLocal("titans_tasks",[]);
      firstLoad = false;
      setupTopbar(); bootRender();
    });

    FB.onValue(FB.metaRef, snap => {
      const fresh = snap.val()||{};
      if (!firstLoad) {
        (fresh.meetings||[]).forEach(m=>{
          if(!prevMeetingIds.has(String(m.id))){
            addNotif(`📅 Meeting: "${m.title}" on ${m.date} at ${m.time} — ${m.venue}`,"normal");
            showToast(`📅 New meeting: "${m.title}"`);
          }
        });
        prevMeetingIds = new Set((fresh.meetings||[]).map(m=>String(m.id)));
      } else {
        prevMeetingIds = new Set((fresh.meetings||[]).map(m=>String(m.id)));
      }
      meta = fresh;
      saveLocal("titans_meta", meta);
      renderAnnouncement(); renderStandup();
      renderHomeUpcomingMeetings(); renderHomeLatestNews();
      const active = document.querySelector(".section.active")?.id;
      if(active==="sec-meetings")    renderMeetings();
      if(active==="sec-noticeboard") renderNewsFeed();
    }, ()=>{ meta=loadLocal("titans_meta",{}); });
  }

  /* ── Boot render ── */
  function bootRender() {
    renderHome(); renderTasks(); renderPendingReviews(); checkBadges();
    const active = document.querySelector(".section.active")?.id;
    if(active==="sec-members")     renderMembers();
    if(active==="sec-leaderboard") renderLeaderboard();
    if(active==="sec-analytics")   renderAnalytics();
    if(active==="sec-profile")     renderProfile();
    if(active==="sec-meetings")    renderMeetings();
    if(active==="sec-noticeboard") renderNewsFeed();
  }

  /* ══════════════════════════════════════════════════════
     SECTION SWITCHING
  ══════════════════════════════════════════════════════ */
  window.showSection = (name, el) => {
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
    document.querySelectorAll(".sidebar li").forEach(l=>l.classList.remove("active"));
    document.getElementById("sec-"+name)?.classList.add("active");
    if (el) el.classList.add("active");
    const titles={home:"Dashboard",tasks:"Tasks",members:"Team Members",
                  leaderboard:"Leaderboard",noticeboard:"Notice Board",
                  meetings:"Meetings",analytics:"Analytics",profile:"Profile"};
    document.getElementById("sectionTitle").textContent = titles[name]||name;
    const fns = {home:renderHome,tasks:()=>{renderTasks();renderPendingReviews();},
                  members:renderMembers,leaderboard:renderLeaderboard,
                  analytics:renderAnalytics,profile:renderProfile,
                  meetings:renderMeetings,noticeboard:renderNewsFeed};
    fns[name]?.();
  };

  /* ══════════════════════════════════════════════════════
     ANNOUNCEMENT
  ══════════════════════════════════════════════════════ */
  window.postAnnouncement = async () => {
    const txt = document.getElementById("annInput")?.value.trim();
    if (!txt) return;
    const ann = {text:txt, by:user.name, time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})};
    try {
      if (FB.hasFirebase) await FB.set(FB.ref(FB.db,"titans/meta/announcement"), ann);
      else await rest.patch("/titans/meta", { announcement: ann });
      meta.announcement = ann;
    } catch {
      meta.announcement = ann;
      saveLocal("titans_meta", meta);
    }
    renderAnnouncement();
    document.getElementById("annInput").value = "";
    showToast("📢 Announcement posted!");
  };

  function renderAnnouncement() {
    const ann=meta?.announcement, b=document.getElementById("announcementBanner"), t=document.getElementById("annText");
    if(!b||!t) return;
    if(ann?.text && sessionStorage.getItem("ann_dismissed")!==ann.text){
      t.textContent=`${ann.text}  —  ${ann.by}, ${ann.time}`; b.style.display="flex";
    } else b.style.display="none";
  }
  window.dismissAnnouncement = () => {
    if(meta?.announcement) sessionStorage.setItem("ann_dismissed", meta.announcement.text);
    document.getElementById("announcementBanner").style.display="none";
  };

  /* ══════════════════════════════════════════════════════
     HOME
  ══════════════════════════════════════════════════════ */
  function renderHome() {
    const vis  = isCaptain ? tasks : tasks.filter(t=>t.member===user.name);
    const done = vis.filter(t=>t.done||t.status==="reviewed").length;
    const sD=document.getElementById("statDone"),sP=document.getElementById("statPending"),sT=document.getElementById("statTotal");
    if(sD) sD.textContent=done;
    if(sP) sP.textContent=vis.length-done;
    if(sT) sT.textContent=vis.length;

    const mine=tasks.filter(t=>t.member===user.name);
    const cEl=document.getElementById("myTaskCount"); if(cEl) cEl.textContent=mine.length;

    const hL=document.getElementById("homeTaskList"),hE=document.getElementById("homeEmpty");
    const sorted=[...mine].sort((a,b)=>{
      const pOrd={high:0,medium:1,normal:2,low:3};
      const ra=a.status==="reviewed"||a.done, rb=b.status==="reviewed"||b.done;
      if(ra!==rb) return ra?1:-1;
      return (pOrd[a.priority||"normal"]||2)-(pOrd[b.priority||"normal"]||2);
    });
    if(hL) hL.innerHTML=!sorted.length?"":sorted.slice(0,6).map(t=>`
      <li>
        <div class="task-check ${t.status==="reviewed"||t.done?"done":""}" style="cursor:default;opacity:0.7">${t.status==="reviewed"||t.done?"✓":""}</div>
        <div class="task-body">
          <div class="task-name ${t.status==="reviewed"||t.done?"done":""}">${t.text}</div>
          <div class="task-meta">${statusChip(t)}<span class="task-chip priority-${t.priority||"normal"}">${t.priority||"normal"}</span>${t.points?`<span class="pts-badge">⭐${t.points}pts</span>`:""}${dueBadge(t.dueDate)}</div>
        </div>
      </li>`).join("");
    if(hE) hE.style.display=sorted.length?"none":"";

    const show=isCaptain?teamUsers:teamUsers.slice(0,6);
    const pbEl=document.getElementById("teamProgressBars");
    if(pbEl) pbEl.innerHTML=show.map((u,i)=>{
      const s=memberStats(u.name), pct=s.total?Math.round(s.done/s.total*100):0;
      return `<div class="prog-row">
        <div class="prog-header"><span class="prog-name">${u.name}</span><span class="prog-pct">${s.done}/${s.total}</span></div>
        <div class="prog-bg"><div class="prog-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
      </div>`;
    }).join("");

    renderWorkload(); renderHeatmap(); renderAnnouncement(); renderStandup();
    renderHomeUpcomingMeetings(); renderHomeLatestNews();
    const dateEl=document.getElementById("standupDate");
    if(dateEl) dateEl.textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
  }

  function renderWorkload() {
    const el=document.getElementById("workloadMeter"); if(!el) return;
    const show=isCaptain?teamUsers:teamUsers.slice(0,6);
    const max=Math.max(...show.map(u=>memberStats(u.name).pending),1);
    el.innerHTML=show.map(u=>{
      const s=memberStats(u.name),pct=Math.round(s.pending/max*100);
      const col=s.pending===0?"#10b981":s.pending<=2?"#f59e0b":s.pending<=4?"#f97316":"#ef4444";
      return `<div class="wl-row"><span class="wl-name">${u.name.split(" ")[0]}</span><div class="wl-bg"><div class="wl-fill" style="width:${pct}%;background:${col}"></div></div><span class="wl-count">${s.pending}</span></div>`;
    }).join("");
  }

  function renderHeatmap() {
    const el=document.getElementById("heatmap"); if(!el) return;
    const actMap={};
    tasks.filter(t=>(t.done||t.status==="reviewed")&&t.member===user.name).forEach(t=>{
      if(t.createdAt) actMap[t.createdAt]=(actMap[t.createdAt]||0)+1;
    });
    const cells=[];
    for(let i=34;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const key=d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
      const cnt=actMap[key]||0;
      cells.push({key,cnt,lvl:cnt===0?0:cnt===1?1:cnt<=2?2:cnt<=3?3:4});
    }
    let rows=[];for(let r=0;r<5;r++) rows.push(cells.slice(r*7,r*7+7));
    el.innerHTML=`<div class="heatmap-grid">${rows.map(row=>`<div class="heatmap-row">${row.map(c=>`<div class="hm-cell hm-${c.lvl}" title="${c.key}: ${c.cnt} tasks"></div>`).join("")}</div>`).join("")}</div>
    <div class="hm-legend">Less ${[0,1,2,3,4].map(n=>`<div class="hm-cell hm-${n}" style="display:inline-block"></div>`).join("")} More</div>`;
  }

  function renderStandup() {
    const sec=document.getElementById("standupSection"); if(!sec) return;
    const notes=(meta?.standup||[]).filter(n=>n.date===new Date().toDateString());
    let html=notes.map(n=>`<div class="standup-note"><div class="standup-author">${n.author}</div><div class="standup-text">${n.text}</div><div class="standup-time">${n.time}</div></div>`).join("")
      ||`<div style="font-size:13px;color:var(--text3);padding:8px 0">No standup notes yet today.</div>`;
    html+=`<div class="standup-input-row"><input id="standupInput" placeholder="Your update for today…"/><button class="btn-primary" style="padding:9px 14px;font-size:12px" onclick="postStandup()">Post</button></div>`;
    sec.innerHTML=html;
  }

  window.postStandup = async () => {
    const inp=document.getElementById("standupInput");
    if(!inp||!inp.value.trim()) return;
    const note={author:user.name,text:inp.value.trim(),date:new Date().toDateString(),
      time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})};
    inp.value="";
    const ex=meta?.standup||[]; ex.push(note);
    if(!meta.standup) meta.standup=[];
    meta.standup.push(note);
    try {
      if(FB.hasFirebase) await FB.set(FB.ref(FB.db,"titans/meta/standup"),ex);
      else await rest.patch("/titans/meta", { standup: ex });
    } catch { saveLocal("titans_meta",meta); }
    renderStandup();
  };

  /* ══════════════════════════════════════════════════════
     ADD TASK
  ══════════════════════════════════════════════════════ */
  window.addTask = async () => {
    if (!isCaptain) return;
    const text    = document.getElementById("taskInput")?.value.trim();
    const member  = document.getElementById("memberSelect")?.value;
    const priority= document.getElementById("prioritySelect")?.value;
    const dueDate = document.getElementById("dueDateInput")?.value;
    const fileLink= document.getElementById("fileLinkInput")?.value.trim();
    if(!text){
      const inp=document.getElementById("taskInput");
      if(inp){inp.style.borderColor="#ef4444";inp.focus();setTimeout(()=>inp.style.borderColor="",1500);}
      showToast("⚠ Enter a task description","warn"); return;
    }
    const task={
      id:Date.now(),text,member,priority,
      dueDate:dueDate||"",fileLink:fileLink||"",
      status:"pending",done:false,points:0,
      assignedBy:user.name,
      createdAt:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"}),
      comments:[]
    };

    let saved = false;
    if(FB.hasFirebase){
      try{ await FB.push(FB.tasksRef,task); saved=true; }catch{}
    }
    if(!saved){
      try {
        const res = await rest.post("/titans/tasks", task);
        if(res?.name) task._fbId = res.name;
        saved=true;
      } catch {}
    }
    if(!saved){
      tasks.push(task);
      saveLocal("titans_tasks",tasks);
      renderHome(); renderTasks();
    }

    ["taskInput","dueDateInput","fileLinkInput"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    showToast("✅ Task assigned to "+member);
    showWhatsAppBtn(member,text,priority,dueDate);
  };

  /* ══════════════════════════════════════════════════════
     RENDER TASKS
  ══════════════════════════════════════════════════════ */
  window.renderTasks = () => {
    const list=document.getElementById("taskList"),emp=document.getElementById("taskEmpty");
    const fM=document.getElementById("filterMember"),fS=document.getElementById("filterStatus"),fP=document.getElementById("filterPriority");
    let vis = isCaptain ? tasks : tasks.filter(t=>t.member===user.name);
    if(fM&&fM.value!=="all") vis=vis.filter(t=>t.member===fM.value);
    if(fS&&fS.value==="pending")   vis=vis.filter(t=>!t.status||t.status==="pending");
    if(fS&&fS.value==="submitted") vis=vis.filter(t=>t.status==="submitted");
    if(fS&&fS.value==="reviewed")  vis=vis.filter(t=>t.status==="reviewed");
    if(fS&&fS.value==="done")      vis=vis.filter(t=>t.done&&t.status!=="submitted");
    if(fS&&fS.value==="rejected")  vis=vis.filter(t=>t.status==="rejected");
    if(fP&&fP.value!=="all") vis=vis.filter(t=>(t.priority||"normal")===fP.value);
    const pOrd={high:0,medium:1,normal:2,low:3};
    vis=[...vis].sort((a,b)=>{
      const ra=a.status==="reviewed"||a.done, rb=b.status==="reviewed"||b.done;
      if(ra!==rb) return ra?1:-1;
      return (pOrd[a.priority||"normal"]||2)-(pOrd[b.priority||"normal"]||2);
    });
    if(!vis.length){if(list)list.innerHTML="";if(emp)emp.style.display="";return;}
    if(emp) emp.style.display="none";
    if(list) list.innerHTML=vis.map(t=>`
      <li id="task-${t.id}">
        <div class="task-check ${t.status==="reviewed"||t.done?"done":""}" style="cursor:default;opacity:0.6">${t.status==="reviewed"||t.done?"✓":""}</div>
        <div class="task-body">
          <div class="task-name ${t.status==="reviewed"||t.done?"done":""}">${t.text}</div>
          <div class="task-meta">
            <span class="task-chip chip-assignee">${t.member}</span>
            <span style="color:var(--text3)">by ${t.assignedBy}</span>
            ${t.createdAt?`<span style="color:var(--text3)">${t.createdAt}</span>`:""}
            <span class="task-chip priority-${t.priority||"normal"}">${t.priority||"normal"}</span>
            ${statusChip(t)}
            ${t.points?`<span class="pts-badge">⭐ ${t.points} pts</span>`:""}
            ${dueBadge(t.dueDate)}
            ${t.fileLink?`<a href="${t.fileLink}" target="_blank" class="task-chip chip-file">🔗 File</a>`:""}
          </div>
          ${t.reviewFeedback&&(t.status==="reviewed"||t.status==="rejected")?`<div class="review-feedback">💬 ${t.reviewFeedback}</div>`:""}
          ${t.submissionLink&&t.status==="submitted"?`<div style="margin-top:4px"><a href="${t.submissionLink}" target="_blank" class="task-chip chip-file">🔗 Submitted Work</a></div>`:""}
        </div>
        <div class="task-actions">
          ${!isCaptain&&t.member===user.name&&(!t.status||t.status==="pending"||t.status==="rejected")?
            `<button class="task-btn submit-btn" onclick="openSubmitModal('${t.id}')" title="Submit work">📤</button>`:""}
          <button class="task-btn comment-btn" onclick="openCommentModal('${t.id}')" title="Comments">💬${(t.comments||[]).length>0?`<span class="comment-count">${(t.comments||[]).length}</span>`:""}</button>
          ${isCaptain?`
            <button class="task-btn reassign-btn" onclick="openReassignModal('${t.id}')" title="Reassign">↔</button>
            <button class="task-btn del" onclick="deleteById('${t.id}','${t._fbId||""}')" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>`:""}
        </div>
      </li>`).join("");
  };

  window.deleteById = async (taskId,fbId) => {
    if(!isCaptain||!confirm("Delete this task?")) return;
    const row=document.getElementById("task-"+taskId);
    if(row){row.style.transition="all 0.35s ease";row.style.opacity="0";row.style.transform="translateX(40px) scale(0.95)";row.style.maxHeight=row.offsetHeight+"px";setTimeout(()=>{row.style.maxHeight="0";row.style.padding="0";row.style.margin="0";},200);await new Promise(r=>setTimeout(r,420));}

    let deleted = false;
    if(FB.hasFirebase&&fbId){ try{ await FB.remove(FB.ref(FB.db,`titans/tasks/${fbId}`)); deleted=true; }catch{} }
    if(!deleted&&fbId){ try{ await rest.del(`/titans/tasks/${fbId}`); deleted=true; }catch{} }
    if(!deleted){
      tasks=tasks.filter(t=>String(t.id)!==String(taskId));
      saveLocal("titans_tasks",tasks); bootRender();
    }
  };

  /* ══════════════════════════════════════════════════════
     TASK SUBMISSION
  ══════════════════════════════════════════════════════ */
  window.openSubmitModal = taskId => {
    const t=tasks.find(x=>String(x.id)===String(taskId));
    if(!t||t.member!==user.name) return;
    activeSubmitTaskId=String(taskId);
    const el=document.getElementById("submitTaskName"); if(el) el.textContent=`"${t.text}"`;
    const n=document.getElementById("submitNote"),l=document.getElementById("submitLink");
    if(n) n.value=""; if(l) l.value=t.submissionLink||"";
    const m=document.getElementById("submitModal"); if(m) m.style.display="flex";
  };
  window.closeSubmitModal = () => { const m=document.getElementById("submitModal");if(m)m.style.display="none";activeSubmitTaskId=null; };

  window.submitTask = async () => {
    if(!activeSubmitTaskId) return;
    const note=document.getElementById("submitNote")?.value.trim();
    const link=document.getElementById("submitLink")?.value.trim();
    const t=tasks.find(x=>String(x.id)===String(activeSubmitTaskId)); if(!t) return;
    t.status="submitted"; t.submissionNote=note; t.submissionLink=link;
    t.submittedAt=new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    closeSubmitModal(); showToast("📤 Submitted for review!");

    const upd={status:"submitted",submissionNote:note,submissionLink:link,submittedAt:t.submittedAt};
    let saved=false;
    if(FB.hasFirebase&&t._fbId){ try{ await FB.update(FB.ref(FB.db,`titans/tasks/${t._fbId}`),upd); saved=true; }catch{} }
    if(!saved&&t._fbId){ try{ await rest.patch(`/titans/tasks/${t._fbId}`,upd); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_tasks",tasks); }
    renderTasks(); renderPendingReviews();
  };

  /* ══════════════════════════════════════════════════════
     CAPTAIN REVIEW
  ══════════════════════════════════════════════════════ */
  function renderPendingReviews() {
    if(!isCaptain) return;
    const el=document.getElementById("reviewList"),cnt=document.getElementById("reviewCount");
    if(!el) return;
    const submitted=tasks.filter(t=>t.status==="submitted");
    if(cnt) cnt.textContent=submitted.length;
    if(!submitted.length){el.innerHTML=`<div class="empty-state"><span>✅</span><p>No submissions to review</p></div>`;return;}
    el.innerHTML=submitted.map(t=>`
      <div class="review-item">
        <div class="review-item-head">
          <div class="review-task-name">${t.text}</div>
          <span class="review-member">📤 ${t.member}</span>
          <span style="font-size:11px;color:var(--text3)">${t.submittedAt||""}</span>
        </div>
        ${t.submissionNote?`<div class="review-note">💬 "${t.submissionNote}"</div>`:""}
        ${t.submissionLink?`<a href="${t.submissionLink}" target="_blank" class="review-link">🔗 View submitted work</a>`:""}
        <div style="margin-top:10px"><button class="btn-primary" style="padding:8px 16px;font-size:12px" onclick="openReviewModal('${t.id}')">🔍 Review</button></div>
      </div>`).join("");
  }

  window.openReviewModal = taskId => {
    if(!isCaptain) return;
    activeReviewTaskId=String(taskId); selectedPoints=5;
    const t=tasks.find(x=>String(x.id)===String(taskId)); if(!t) return;
    const det=document.getElementById("reviewTaskDetails");
    if(det) det.innerHTML=`<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${t.text}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px">👤 ${t.member} · ${t.priority||"normal"} priority</div>
      ${t.submissionNote?`<div class="review-note">💬 "${t.submissionNote}"</div>`:""}
      ${t.submissionLink?`<a href="${t.submissionLink}" target="_blank" class="review-link" style="display:block;margin-top:6px">🔗 View Work</a>`:""}`;
    const picker=document.getElementById("pointsPicker");
    if(picker) picker.innerHTML=[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="pt-btn ${n===5?"active":""}" onclick="selectPoints(${n},this)">${n}</button>`).join("");
    const fb=document.getElementById("reviewFeedback"); if(fb) fb.value="";
    const m=document.getElementById("reviewModal"); if(m) m.style.display="flex";
  };
  window.closeReviewModal = () => { const m=document.getElementById("reviewModal");if(m)m.style.display="none";activeReviewTaskId=null; };
  window.selectPoints = (n,el) => { selectedPoints=n; document.querySelectorAll(".pt-btn").forEach(b=>b.classList.remove("active")); el.classList.add("active"); };

  window.approveTask = async () => {
    if(!activeReviewTaskId) return;
    const t=tasks.find(x=>String(x.id)===String(activeReviewTaskId));
    const fb=document.getElementById("reviewFeedback")?.value.trim(); if(!t) return;
    t.status="reviewed";t.done=true;t.points=selectedPoints;
    t.reviewFeedback=fb;t.reviewedBy=user.name;
    t.reviewedAt=new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    closeReviewModal(); showToast(`✅ Approved! +${selectedPoints} pts to ${t.member}`);

    const upd={status:"reviewed",done:true,points:selectedPoints,reviewFeedback:fb,reviewedBy:user.name,reviewedAt:t.reviewedAt};
    let saved=false;
    if(FB.hasFirebase&&t._fbId){ try{ await FB.update(FB.ref(FB.db,`titans/tasks/${t._fbId}`),upd); saved=true; }catch{} }
    if(!saved&&t._fbId){ try{ await rest.patch(`/titans/tasks/${t._fbId}`,upd); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_tasks",tasks); bootRender(); }
    checkBadges();
  };

  window.rejectTask = async () => {
    if(!activeReviewTaskId) return;
    const t=tasks.find(x=>String(x.id)===String(activeReviewTaskId));
    const fb=document.getElementById("reviewFeedback")?.value.trim()||"Please revise and resubmit"; if(!t) return;
    t.status="rejected"; t.reviewFeedback=fb;
    closeReviewModal(); showToast(`↩ Returned to ${t.member}`);

    const upd={status:"rejected",reviewFeedback:fb};
    let saved=false;
    if(FB.hasFirebase&&t._fbId){ try{ await FB.update(FB.ref(FB.db,`titans/tasks/${t._fbId}`),upd); saved=true; }catch{} }
    if(!saved&&t._fbId){ try{ await rest.patch(`/titans/tasks/${t._fbId}`,upd); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_tasks",tasks); }
    renderTasks(); renderPendingReviews();
  };

  /* ══════════════════════════════════════════════════════
     MEMBERS
  ══════════════════════════════════════════════════════ */
  function renderMembers() {
    const grid=document.getElementById("membersGrid"); if(!grid) return;
    grid.innerHTML=teamUsers.map((u,i)=>{
      const s=memberStats(u.name),pct=s.total?Math.round(s.done/s.total*100):0;
      const pts=getMemberPoints(u.name);
      const bCls=u.role==="captain"?"badge-captain":u.role==="vice captain"?"badge-vc":"badge-member";
      const bLbl=u.role==="captain"?"⚡ Captain":u.role==="vice captain"?"★ Vice Cap":"Member";
      const isMe=u.name===user.name;
      const stat=loadLocal("titans_status_"+u.name,"online");
      const {cls,html}=avatarHtml(u,i);
      const myBadges=getBadges(u.name);
      return `<div class="member-card${isMe?" me-card":""}">
        <div class="mc-status-dot status-${stat}"></div>
        <div class="mc-avatar ${cls}">${html}</div>
        <div class="mc-badge ${bCls}">${bLbl}</div>
        <div class="mc-name">${u.name}${isMe?` <span class="me-tag">(you)</span>`:""}</div>
        <div class="mc-role">${u.designation}</div>
        <div class="mc-pct">${pct}%</div>
        <div class="mc-tasks">${s.done} done · ${s.pending} pending</div>
        ${pts>0?`<div class="mc-pts">⭐ ${pts} pts</div>`:""}
        <div class="mc-bar-bg"><div class="mc-bar-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
        ${myBadges.length?`<div class="mc-badges-row">${myBadges.map(b=>`<span class="mc-badge-icon" title="${b.name}">${b.icon}</span>`).join("")}</div>`:""}
      </div>`;
    }).join("");
  }

  /* ══════════════════════════════════════════════════════
     LEADERBOARD
  ══════════════════════════════════════════════════════ */
  function renderMvpBanner() {
    const el=document.getElementById("mvpBanner"); if(!el) return;
    const sorted=[...teamUsers].map(u=>({u,sc:memberScore(u.name),st:memberStats(u.name)})).sort((a,b)=>b.sc-a.sc);
    const mvp=sorted[0];
    if(!mvp||mvp.st.done===0){el.style.display="none";return;}
    el.style.display="flex";
    el.innerHTML=`<span class="mvp-crown">👑</span><div class="mvp-info"><div class="mvp-label">🏆 WEEKLY MVP</div><div class="mvp-name">${mvp.u.name}</div><div class="mvp-sub">${mvp.st.done} tasks · ⭐ ${getMemberPoints(mvp.u.name)} pts · Score: ${mvp.sc}</div></div>`;
  }

  function renderLeaderboard() {
    renderMvpBanner();
    const sorted=[...teamUsers].map(u=>({...u,sc:memberScore(u.name),st:memberStats(u.name),pts:getMemberPoints(u.name)})).sort((a,b)=>b.sc-a.sc);
    const maxSc=sorted[0]?.sc||1;
    const pArr=sorted.length>=3?[sorted[1],sorted[0],sorted[2]]:sorted;
    const pCls=["podium-2","podium-1","podium-3"],pEmoji=["🥈","🥇","🥉"];
    const podEl=document.getElementById("podium");
    if(podEl) podEl.innerHTML=pArr.map((u,pi)=>{
      const {cls,html}=avatarHtml(u,mIdx(u.name));
      return `<div class="podium-item">
        <div class="podium-avatar ${cls}">${html}</div>
        <div class="podium-name">${u.name.split(" ")[0]}</div>
        <div class="podium-score">${u.sc} pts</div>
        <div class="${pCls[pi]||"podium-2"} podium-block">${pEmoji[pi]}</div>
      </div>`;
    }).join("");
    const lbEl=document.getElementById("leaderboardList");
    if(lbEl) lbEl.innerHTML=sorted.map((u,ri)=>{
      const isMe=u.name===user.name;
      const rCls=ri===0?"lb-rank-1":ri===1?"lb-rank-2":ri===2?"lb-rank-3":"lb-rank-n";
      const rIcn=ri===0?"🥇":ri===1?"🥈":ri===2?"🥉":"#"+(ri+1);
      const pct=Math.round(u.sc/maxSc*100);
      const streak=getStreak(u.name);
      const {cls,html}=avatarHtml(u,mIdx(u.name));
      return `<div class="lb-row${isMe?" lb-me":""}">
        <div class="lb-rank ${rCls}">${rIcn}</div>
        <div class="lb-avatar ${cls}">${html}</div>
        <div class="lb-info">
          <div class="lb-name">${u.name}${isMe?` <span style="font-size:10px;color:#8b5cf6">(you)</span>`:""}</div>
          <div class="lb-sub">${u.st.done} done · ⭐ ${u.pts} pts</div>
          ${streak>1?`<div class="lb-streak">🔥 ${streak} day streak</div>`:""}
        </div>
        <div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
        <div class="lb-right"><div class="lb-score">${u.sc}</div><div class="lb-label">score</div></div>
      </div>`;
    }).join("");
  }

  /* ══════════════════════════════════════════════════════
     MEETINGS
  ══════════════════════════════════════════════════════ */
  window.scheduleMeeting = async () => {
    const title=document.getElementById("meetingTitle")?.value.trim();
    const date=document.getElementById("meetingDate")?.value;
    const time=document.getElementById("meetingTime")?.value;
    const venue=document.getElementById("meetingVenue")?.value.trim();
    const link=document.getElementById("meetingLink")?.value.trim();
    const type=document.getElementById("meetingType")?.value;
    if(!title||!date||!time||!venue){showToast("⚠ Fill title, date, time and venue","warn");return;}
    const meeting={id:Date.now(),title,date,time,venue,link:link||"",type,scheduledBy:user.name,
      createdAt:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"})};
    const ex=(meta.meetings||[]).concat([meeting]);
    let saved=false;
    if(FB.hasFirebase){ try{ await FB.set(FB.ref(FB.db,"titans/meta/meetings"),ex); saved=true; }catch{} }
    if(!saved){ try{ await rest.patch("/titans/meta",{meetings:ex}); saved=true; }catch{} }
    if(!saved){ if(!meta.meetings)meta.meetings=[]; meta.meetings.push(meeting); saveLocal("titans_meta",meta); }
    else { meta.meetings=ex; }
    ["meetingTitle","meetingDate","meetingTime","meetingVenue","meetingLink"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    renderMeetings(); renderHomeUpcomingMeetings();
    showToast("📅 Meeting scheduled!");
  };

  function renderMeetings() {
    const el=document.getElementById("meetingsList"); if(!el) return;
    const all=meta.meetings||[],filter=document.getElementById("meetingFilter")?.value||"upcoming";
    const todayStr=new Date().toISOString().split("T")[0];
    let filtered=[...all].sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(filter==="upcoming") filtered=filtered.filter(m=>m.date>=todayStr);
    if(filter==="past")     filtered=filtered.filter(m=>m.date<todayStr);
    if(!filtered.length){el.innerHTML=`<div class="empty-state"><span>📅</span><p>No ${filter} meetings</p></div>`;return;}
    const tCls={standup:"mtype-standup",sprint:"mtype-sprint",planning:"mtype-planning",demo:"mtype-demo",other:"mtype-other"};
    const tLbl={standup:"☀ Standup",sprint:"🏃 Sprint",planning:"📋 Planning",demo:"🎯 Demo",other:"📅 Meeting"};
    el.innerHTML=filtered.map(m=>{
      const d=new Date(m.date),isToday=m.date===todayStr,isPast=m.date<todayStr;
      return `<div class="meeting-card ${isToday?"today":isPast?"past":"upcoming"}">
        <div class="meeting-date-box"><div class="mdb-day">${d.getDate()}</div><div class="mdb-month">${d.toLocaleString("en",{month:"short"})}</div></div>
        <div class="meeting-info">
          <div class="meeting-title">${m.title} ${isToday?'<span style="font-size:10px;color:#34d399">● Today</span>':""}</div>
          <div class="meeting-meta"><span class="meeting-venue">📍 ${m.venue}</span><span class="meeting-time">🕐 ${m.time}</span>
          ${m.link?`<a href="${m.link}" target="_blank" style="color:#60a5fa;font-size:11px">🔗 Join</a>`:""}
          <span style="color:var(--text3)">By ${m.scheduledBy}</span></div>
        </div>
        <span class="meeting-type-badge ${tCls[m.type]||"mtype-other"}">${tLbl[m.type]||"Meeting"}</span>
        ${isCaptain?`<button class="task-btn del" onclick="deleteMeeting('${m.id}')" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>`:""}
      </div>`;
    }).join("");
  }
  window.renderMeetings=renderMeetings;

  window.deleteMeeting = async id => {
    if(!isCaptain||!confirm("Delete this meeting?")) return;
    const updated=(meta.meetings||[]).filter(m=>String(m.id)!==String(id));
    let saved=false;
    if(FB.hasFirebase){ try{ await FB.set(FB.ref(FB.db,"titans/meta/meetings"),updated); saved=true; }catch{} }
    if(!saved){ try{ await rest.patch("/titans/meta",{meetings:updated}); saved=true; }catch{} }
    if(!saved){ meta.meetings=updated; saveLocal("titans_meta",meta); }
    else { meta.meetings=updated; }
    renderMeetings(); renderHomeUpcomingMeetings();
  };

  function renderHomeUpcomingMeetings() {
    const el=document.getElementById("homeUpcomingMeetings"); if(!el) return;
    const todayStr=new Date().toISOString().split("T")[0];
    const upcoming=(meta.meetings||[]).filter(m=>m.date>=todayStr).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,4);
    if(!upcoming.length){el.innerHTML=`<div style="font-size:13px;color:var(--text3);padding:8px">No upcoming meetings</div>`;return;}
    const tColor={standup:"#34d399",sprint:"#a78bfa",planning:"#60a5fa",demo:"#fbbf24",other:"#818cf8"};
    el.innerHTML=upcoming.map(m=>`
      <div class="home-meeting-item">
        <div class="hmi-dot" style="background:${tColor[m.type]||"#818cf8"}"></div>
        <div class="hmi-info"><div class="hmi-title">${m.title}</div><div class="hmi-meta">📍 ${m.venue} · ${new Date(m.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div></div>
        <span class="hmi-time">${m.time}</span>
      </div>`).join("");
  }

  /* ══════════════════════════════════════════════════════
     NOTICE BOARD
  ══════════════════════════════════════════════════════ */
  const catIcons={news:"📰",venue:"📍",schedule:"🗓",important:"🚨",achievement:"🏅"};
  const catClasses={news:"ncat-news",venue:"ncat-venue",schedule:"ncat-schedule",important:"ncat-important",achievement:"ncat-achievement"};
  const catLabels={news:"News",venue:"Venue Update",schedule:"Schedule",important:"Important",achievement:"Achievement"};

  window.postNews = async () => {
    const title=document.getElementById("newsTitleInput")?.value.trim();
    const body=document.getElementById("newsBody")?.value.trim();
    const cat=document.getElementById("newsCategory")?.value;
    const link=document.getElementById("newsLink")?.value.trim();
    if(!title||!body){showToast("⚠ Enter title and content","warn");return;}
    const item={id:Date.now(),title,body,category:cat,link:link||"",postedBy:user.name,
      time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
      date:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})};
    if(!meta.news) meta.news=[];
    meta.news.unshift(item);
    let saved=false;
    if(FB.hasFirebase){ try{ await FB.set(FB.ref(FB.db,"titans/meta/news"),meta.news); saved=true; }catch{} }
    if(!saved){ try{ await rest.patch("/titans/meta",{news:meta.news}); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_meta",meta); }
    ["newsTitleInput","newsBody","newsLink"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
    renderNewsFeed(); renderHomeLatestNews();
    showToast("📰 Update posted!");
    addNotif(`📰 New update: "${title}"`,"normal");
  };

  function renderNewsFeed() {
    const el=document.getElementById("newsFeed"); if(!el) return;
    const news=meta.news||[];
    if(!news.length){el.innerHTML=`<div class="card"><div class="empty-state"><span>📰</span><p>No updates yet</p></div></div>`;return;}
    el.innerHTML=news.map(n=>`
      <div class="news-card">
        <div class="news-card-head">
          <span class="news-cat-icon">${catIcons[n.category]||"📰"}</span>
          <div class="news-card-meta"><div class="news-card-title">${n.title}</div><div class="news-card-byline">By ${n.postedBy} · ${n.date} ${n.time}</div></div>
          <span class="news-cat-badge ${catClasses[n.category]||"ncat-news"}">${catLabels[n.category]||"News"}</span>
          ${isCaptain?`<button onclick="deleteNews('${n.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0 6px" title="Delete">✕</button>`:""}
        </div>
        <div class="news-card-body">${n.body}</div>
        ${n.link?`<a href="${n.link}" target="_blank" class="news-card-link">🔗 ${n.link}</a>`:""}
      </div>`).join("");
  }

  window.deleteNews = async id => {
    if(!isCaptain) return;
    meta.news=(meta.news||[]).filter(n=>String(n.id)!==String(id));
    let saved=false;
    if(FB.hasFirebase){ try{ await FB.set(FB.ref(FB.db,"titans/meta/news"),meta.news); saved=true; }catch{} }
    if(!saved){ try{ await rest.patch("/titans/meta",{news:meta.news}); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_meta",meta); }
    renderNewsFeed(); renderHomeLatestNews();
    showToast("Deleted");
  };

  function renderHomeLatestNews() {
    const el=document.getElementById("homeLatestNews"); if(!el) return;
    const news=(meta.news||[]).slice(0,4);
    if(!news.length){el.innerHTML=`<div style="font-size:13px;color:var(--text3);padding:8px">No updates yet</div>`;return;}
    el.innerHTML=news.map(n=>`
      <div class="home-news-item">
        <div class="hni-title">${catIcons[n.category]||"📰"} ${n.title}</div>
        <div class="hni-meta">${n.postedBy} · ${n.date}</div>
      </div>`).join("");
  }

  /* ══════════════════════════════════════════════════════
     AI TASK SUGGESTER
  ══════════════════════════════════════════════════════ */
  window.suggestTasks = async () => {
    const goal=document.getElementById("aiGoalInput")?.value.trim(); if(!goal) return;
    const btn=document.querySelector(".btn-ai"),results=document.getElementById("aiResults");
    if(!btn||!results) return;
    btn.disabled=true;btn.textContent="✨ Thinking…";
    results.innerHTML=`<div style="font-size:13px;color:var(--text3);padding:8px">🤖 Generating tasks…</div>`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Break down into 5 specific tasks.\nGoal: "${goal}"\nTeam: ${teamUsers.map(u=>u.name+"("+u.designation+")").join(", ")}\nRespond ONLY with JSON array: [{"task":"...","member":"...","priority":"high/medium/normal/low"}]`}]})});
      const data=await res.json();
      const raw=data.content?.[0]?.text||"[]";
      const suggested=JSON.parse(raw.replace(/```json|```/g,"").trim());
      results.innerHTML=suggested.map((t,i)=>`<div class="ai-task-item"><span class="task-chip priority-${t.priority||"normal"}">${t.priority||"normal"}</span><span class="ai-task-text">${t.task}</span><span style="font-size:11px;color:var(--text3)">${t.member}</span><button class="ai-assign-btn" onclick="assignAiTask(${i})">+ Assign</button></div>`).join("");
      window._aiSuggested=suggested;
    }catch{results.innerHTML=`<div style="font-size:13px;color:#f87171;padding:8px">⚠ AI unavailable. Try again.</div>`;}
    btn.disabled=false;btn.textContent="✨ Suggest Tasks";
  };
  window.assignAiTask = i => {
    const t=window._aiSuggested?.[i]; if(!t) return;
    const ti=document.getElementById("taskInput"),ms=document.getElementById("memberSelect"),ps=document.getElementById("prioritySelect");
    if(ti) ti.value=t.task; if(ms) ms.value=t.member; if(ps) ps.value=t.priority||"normal";
    showToast("✓ Task filled — click Assign to confirm");
  };

  /* ══════════════════════════════════════════════════════
     COMMENTS
  ══════════════════════════════════════════════════════ */
  window.openCommentModal = taskId => {
    activeCommentTaskId=String(taskId);
    const t=tasks.find(x=>String(x.id)===String(taskId)); if(!t) return;
    const el=document.getElementById("commentTaskTitle"); if(el) el.textContent=t.text;
    renderComments(t);
    const m=document.getElementById("commentModal"); if(m) m.style.display="flex";
  };
  window.closeCommentModal = () => { const m=document.getElementById("commentModal");if(m)m.style.display="none";activeCommentTaskId=null; };

  function renderComments(t) {
    const comments=t.comments||[],cl=document.getElementById("commentsList"); if(!cl) return;
    cl.innerHTML=!comments.length?`<div style="font-size:13px;color:var(--text3);padding:8px">No comments yet.</div>`
      :comments.map(c=>`<div class="comment-item"><div class="comment-author">${c.author}</div><div class="comment-text">${c.text}</div><div class="comment-time">${c.time}</div></div>`).join("");
    cl.scrollTop=cl.scrollHeight;
  }

  window.addComment = async () => {
    const inp=document.getElementById("commentInput");
    if(!inp||!inp.value.trim()||!activeCommentTaskId) return;
    const t=tasks.find(x=>String(x.id)===String(activeCommentTaskId)); if(!t) return;
    const c={author:user.name,text:inp.value.trim(),time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})};
    if(!t.comments) t.comments=[];
    t.comments.push(c); inp.value=""; renderComments(t);

    let saved=false;
    if(FB.hasFirebase&&t._fbId){ try{ await FB.update(FB.ref(FB.db,`titans/tasks/${t._fbId}`),{comments:t.comments}); saved=true; }catch{} }
    if(!saved&&t._fbId){ try{ await rest.patch(`/titans/tasks/${t._fbId}`,{comments:t.comments}); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_tasks",tasks); }
    renderTasks(); checkBadges();
  };

  /* ══════════════════════════════════════════════════════
     REASSIGN
  ══════════════════════════════════════════════════════ */
  window.openReassignModal = taskId => {
    if(!isCaptain) return; activeReassignTaskId=String(taskId);
    const t=tasks.find(x=>String(x.id)===String(taskId)); if(!t) return;
    const el=document.getElementById("reassignTaskName"); if(el) el.textContent=`"${t.text}" → now: ${t.member}`;
    const m=document.getElementById("reassignModal"); if(m) m.style.display="flex";
  };
  window.closeReassignModal = () => { const m=document.getElementById("reassignModal");if(m)m.style.display="none";activeReassignTaskId=null; };

  window.confirmReassign = async () => {
    if(!activeReassignTaskId) return;
    const t=tasks.find(x=>String(x.id)===String(activeReassignTaskId));
    const newMem=document.getElementById("reassignSelect")?.value; if(!t||!newMem) return;
    t.member=newMem;t.status="pending";t.done=false;
    closeReassignModal(); showToast(`↔ Reassigned to ${newMem}`);

    const upd={member:newMem,status:"pending",done:false};
    let saved=false;
    if(FB.hasFirebase&&t._fbId){ try{ await FB.update(FB.ref(FB.db,`titans/tasks/${t._fbId}`),upd); saved=true; }catch{} }
    if(!saved&&t._fbId){ try{ await rest.patch(`/titans/tasks/${t._fbId}`,upd); saved=true; }catch{} }
    if(!saved){ saveLocal("titans_tasks",tasks); }
    renderTasks();
  };

  /* ══════════════════════════════════════════════════════
     ANALYTICS
  ══════════════════════════════════════════════════════ */
  function renderAnalytics() {
    if(!isCaptain) return;
    const distEl=document.getElementById("taskDistChart"); if(!distEl) return;
    const maxT=Math.max(...teamUsers.map(u=>memberStats(u.name).total),1);
    distEl.innerHTML=teamUsers.map((u,i)=>{
      const s=memberStats(u.name),pct=Math.round(s.total/maxT*100);
      return `<div class="task-dist-row"><span class="tdr-name">${u.name.split(" ")[0]}</span><div class="tdr-bg"><div class="tdr-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div><span class="tdr-count">${s.total}</span></div>`;
    }).join("");
    const today=new Date();today.setHours(0,0,0,0);
    const overdue=tasks.filter(t=>!t.done&&t.status!=="reviewed"&&t.dueDate&&new Date(t.dueDate)<today);
    const overdueEl=document.getElementById("overdueList"); if(!overdueEl) return;
    overdueEl.innerHTML=!overdue.length?`<div style="font-size:13px;color:#34d399;padding:8px">✅ No overdue tasks!</div>`
      :overdue.map(t=>`<div class="overdue-item"><div class="overdue-task">${t.text}</div><div class="overdue-meta">📌 ${t.member} · Due ${new Date(t.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div></div>`).join("");
  }

  window.generateReport = () => {
    const el=document.getElementById("reportContent"); if(!el) return;
    const total=tasks.length,done=tasks.filter(t=>t.done||t.status==="reviewed").length;
    const today=new Date();today.setHours(0,0,0,0);
    const overdue=tasks.filter(t=>!t.done&&t.status!=="reviewed"&&t.dueDate&&new Date(t.dueDate)<today).length;
    const submitted=tasks.filter(t=>t.status==="submitted").length;
    const totalPts=tasks.reduce((s,t)=>s+(t.points||0),0);
    const sorted=[...teamUsers].sort((a,b)=>memberScore(b.name)-memberScore(a.name));
    el.innerHTML=`
      <div class="report-row"><span>Total Tasks</span><strong>${total}</strong></div>
      <div class="report-row"><span>Completed & Reviewed</span><strong style="color:#34d399">${done}</strong></div>
      <div class="report-row"><span>Pending</span><strong style="color:#fbbf24">${total-done}</strong></div>
      <div class="report-row"><span>Awaiting Review</span><strong style="color:#60a5fa">${submitted}</strong></div>
      <div class="report-row"><span>Completion Rate</span><strong style="color:var(--primary)">${total?Math.round(done/total*100):0}%</strong></div>
      <div class="report-row"><span>Overdue Tasks</span><strong style="color:#f87171">${overdue}</strong></div>
      <div class="report-row"><span>Total Points Awarded</span><strong style="color:#f59e0b">⭐ ${totalPts}</strong></div>
      <div class="report-row"><span>Top Performer</span><strong style="color:#f59e0b">👑 ${sorted[0]?.name||"—"} (${memberScore(sorted[0]?.name||"")} score)</strong></div>`;
    showToast("📊 Report generated!");
  };

  /* ══════════════════════════════════════════════════════
     PROFILE
  ══════════════════════════════════════════════════════ */
  function renderProfile() {
    const ph=document.getElementById("profPhoto");
    const idx=Math.max(0,mIdx(user.name));
    if(ph){
      const imgSrc=fixImgUrl(user.imgSrc);
      if(imgSrc){
        ph.innerHTML=`<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;" onerror="this.remove();">`;
        ph.className="prof-photo "+avCls(idx);
      } else {
        ph.className="prof-photo "+avCls(idx);
        ph.textContent=ini(user.name);
      }
    }

    const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val||"";};
    set("profileName", user.name);
    set("profileDesig", user.designation);
    set("pDept",  user.department);
    set("pTeam",  user.team);
    set("pGroup", user.groupId);
    set("pReg",   user.regNo);
    set("pRole",  user.designation);
    set("pEmail", user.email);

    const s=memberStats(user.name),pct=s.total?Math.round(s.done/s.total*100):0;
    const pts=getMemberPoints(user.name);
    set("perfDone",    String(s.done));
    set("perfPending", String(s.pending));
    set("perfTotal",   String(s.total));
    set("perfPct",     pct+"%");
    set("totalPoints", String(pts));
    const pBar=document.getElementById("perfBar"); if(pBar) pBar.style.width=pct+"%";

    const sorted=[...teamUsers].sort((a,b)=>memberScore(b.name)-memberScore(a.name));
    set("perfRank", "#"+(sorted.findIndex(u2=>u2.name===user.name)+1));

    const badges=getBadges(user.name);
    const bdgEl=document.getElementById("profileBadges");
    if(bdgEl) bdgEl.innerHTML=badges.length?badges.map(b=>`<div class="badge-item">${b.icon} ${b.name}</div>`).join("")
      :`<div style="font-size:12px;color:var(--text3)">No badges yet — complete tasks to earn!</div>`;

    const streak=getStreak(user.name);
    const strEl=document.getElementById("streakRow");
    if(strEl) strEl.innerHTML=streak>0?`<div class="streak-fire">🔥</div><div class="streak-info"><div class="streak-num">${streak} day streak</div><div style="font-size:11px;color:var(--text3)">Keep it up!</div></div>`:"";

    const mine=tasks.filter(t=>t.member===user.name).slice(-10).reverse();
    const aL=document.getElementById("recentActivity"),aE=document.getElementById("recentEmpty");
    const rC=document.getElementById("recentCount"); if(rC) rC.textContent=mine.length;
    if(!mine.length){if(aL)aL.innerHTML="";if(aE)aE.style.display="";}
    else{
      if(aE) aE.style.display="none";
      if(aL) aL.innerHTML=mine.map(t=>`<li>
        <div class="task-check ${t.status==="reviewed"||t.done?"done":""}" style="cursor:default;opacity:0.6">${t.status==="reviewed"||t.done?"✓":""}</div>
        <div class="task-body"><div class="task-name ${t.status==="reviewed"||t.done?"done":""}">${t.text}</div>
        <div class="task-meta">${statusChip(t)}${t.points?`<span class="pts-badge">⭐ ${t.points} pts</span>`:""}</div></div>
      </li>`).join("");
    }
  }

  /* ══════════════════════════════════════════════════════
     BADGES + STREAK
  ══════════════════════════════════════════════════════ */
  const BADGE_DEFS=[
    {id:"first_blood",  icon:"🎯",name:"First Blood",     check:n=>memberStats(n).done>=1},
    {id:"on_fire",      icon:"🔥",name:"On Fire",          check:n=>memberStats(n).done>=5},
    {id:"overachiever", icon:"🚀",name:"Overachiever",     check:n=>memberStats(n).done>=10},
    {id:"perfect",      icon:"💎",name:"Perfect Sprint",   check:n=>{const s=memberStats(n);return s.total>0&&s.pending===0;}},
    {id:"team_player",  icon:"🤝",name:"Team Player",      check:n=>tasks.some(t=>(t.comments||[]).some(c=>c.author===n))},
    {id:"top_scorer",   icon:"⭐",name:"Top Scorer",       check:n=>getMemberPoints(n)>=20},
    {id:"submitter",    icon:"📤",name:"Quick Submitter",  check:n=>tasks.some(t=>t.member===n&&t.status==="reviewed")},
    {id:"early_bird",   icon:"🌅",name:"Early Bird",       check:n=>tasks.filter(t=>t.member===n&&t.done).some(t=>{
      if(!t.dueDate||!t.reviewedAt) return false;
      return new Date(t.dueDate)>new Date();
    })},
  ];
  function getBadges(name){const e=loadLocal("titans_badges_"+name,[]);return BADGE_DEFS.filter(b=>e.includes(b.id));}
  function checkBadges(){
    const name=user.name,earned=loadLocal("titans_badges_"+name,[]);
    let newBadge=false;
    BADGE_DEFS.forEach(b=>{
      if(!earned.includes(b.id)&&b.check(name)){
        earned.push(b.id);newBadge=true;
        showToast(`🏅 Badge: ${b.icon} ${b.name}!`);
        addNotif(`🏅 Badge earned: ${b.icon} ${b.name}`,"normal");
      }
    });
    if(newBadge) saveLocal("titans_badges_"+name,earned);
  }
  function getStreak(name){
    const activity=loadLocal("titans_activity_"+name,[]);
    const today=new Date().toDateString();
    if(!activity.includes(today)){activity.push(today);saveLocal("titans_activity_"+name,activity.slice(-60));}
    let streak=0;const d=new Date();
    while(true){if(activity.includes(d.toDateString())){streak++;d.setDate(d.getDate()-1);}else break;}
    return streak;
  }

  /* ══════════════════════════════════════════════════════
     WHATSAPP BUTTON
  ══════════════════════════════════════════════════════ */
  function showWhatsAppBtn(memberName,taskText,priority,dueDate) {
    const due=dueDate?new Date(dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"No due date";
    const msg=encodeURIComponent(`⚡ *TITANS - New Task*\n\nHi ${memberName}! 👋\n📌 *Task:* ${taskText}\n👤 *By:* ${user.name}\n🎯 *Priority:* ${priority||"normal"}\n📅 *Due:* ${due}\n\nLogin to TITANS portal.`);
    const phone=(teamUsers.find(u=>u.name===memberName)?.phone)||"";
    const waUrl=phone?`https://wa.me/${phone}?text=${msg}`:`https://wa.me/?text=${msg}`;
    const wrap=document.getElementById("wa-btn-wrap"); if(!wrap) return;
    wrap.style.cssText="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.3);border-radius:12px;margin-top:4px;animation:waSlide 0.4s ease";
    wrap.innerHTML=`<div style="flex:1;font-size:13px;color:var(--text)"><strong style="color:#25d366">Assigned!</strong> Send WhatsApp to <strong>${memberName}</strong>?</div>
      <a href="${waUrl}" target="_blank" style="display:flex;align-items:center;gap:8px;background:#25d366;color:white;padding:10px 16px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;font-family:inherit">📱 Send WhatsApp</a>
      <button onclick="this.parentElement.style.display='none'" style="background:transparent;border:none;color:var(--text3);font-size:18px;cursor:pointer">×</button>`;
    setTimeout(()=>{if(wrap)wrap.style.display="none";},30000);
  }

  /* ══════════════════════════════════════════════════════
     NOTIFICATIONS
  ══════════════════════════════════════════════════════ */
  let notifs=loadLocal("titans_notifs_"+user.name,[]);
  function saveNotifs(){saveLocal("titans_notifs_"+user.name,notifs);}
  function addNotif(msg,priority){
    /* Prevent duplicate notifs within 30s */
    const recent=notifs.find(n=>n.msg===msg);
    if(recent) return;
    notifs.unshift({msg,priority:priority||"normal",time:new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),read:false});
    notifs=notifs.slice(0,30);saveNotifs();renderNotifs();
  }
  function renderNotifs(){
    const dot=document.getElementById("notifDot"),list=document.getElementById("notifList");
    if(!dot||!list) return;
    dot.classList.toggle("show",notifs.some(n=>!n.read));
    list.innerHTML=!notifs.length?`<div class="notif-empty">🎉 All caught up!</div>`
      :notifs.map((n,i)=>`<div class="notif-item ${n.read?"":"unread"}" onclick="markNotifRead(${i})"><div class="notif-title">${n.msg}</div><div class="notif-time">${n.time}</div></div>`).join("");
  }
  window.markNotifRead=i=>{if(notifs[i]){notifs[i].read=true;saveNotifs();renderNotifs();}};
  window.clearNotifs=()=>{notifs=[];saveNotifs();renderNotifs();document.getElementById("notifPanel")?.classList.remove("open");};
  window.toggleNotif=()=>{
    const p=document.getElementById("notifPanel"); if(!p) return;
    p.classList.toggle("open");
    if(p.classList.contains("open")){notifs.forEach(n=>n.read=true);saveNotifs();renderNotifs();}
  };
  document.addEventListener("click",e=>{
    const p=document.getElementById("notifPanel");
    if(p?.classList.contains("open")&&!p.contains(e.target)&&!document.getElementById("notifBtn")?.contains(e.target))
      p.classList.remove("open");
  });
  renderNotifs();

  /* ── Toast ── */
  function showToast(msg,type="success") {
    let t=document.getElementById("titans-toast");
    if(!t){
      t=document.createElement("div");t.id="titans-toast";
      Object.assign(t.style,{position:"fixed",bottom:"28px",right:"28px",
        color:"white",padding:"13px 22px",borderRadius:"12px",fontSize:"13px",
        fontFamily:"inherit",fontWeight:"500",zIndex:"9999",
        transition:"opacity 0.4s,transform 0.4s",pointerEvents:"none",maxWidth:"300px"});
      document.body.appendChild(t);
    }
    const colors_map={success:"linear-gradient(135deg,#059669,#047857)",error:"linear-gradient(135deg,#dc2626,#b91c1c)",warn:"linear-gradient(135deg,#d97706,#b45309)",info:"linear-gradient(135deg,#7c3aed,#6d28d9)"};
    t.style.background=colors_map[type]||colors_map.info;
    t.style.boxShadow=type==="success"?"0 8px 28px rgba(5,150,105,0.4)":"0 8px 28px rgba(124,58,237,0.4)";
    t.textContent=msg;t.style.opacity="1";t.style.transform="translateY(0)";
    clearTimeout(t._tmr);t._tmr=setTimeout(()=>{t.style.opacity="0";t.style.transform="translateY(8px)";},3000);
  }

  /* ── Logout ── */
  window.logout=()=>{if(confirm("Logout from TITANS?")){localStorage.removeItem("user");window.location.href="index.html";}};

  /* ══════════════════════════════════════════════════════
     LOADING SCREEN
  ══════════════════════════════════════════════════════ */
  function showLoadingScreen() {
    let s=document.getElementById("titans-loading");
    if(!s){
      s=document.createElement("div");s.id="titans-loading";
      s.innerHTML=`<div style="text-align:center"><div style="font-size:48px;animation:boltPulse 1.5s ease-in-out infinite alternate">⚡</div><div style="font-family:Syne,sans-serif;font-size:24px;font-weight:700;color:#a78bfa;letter-spacing:4px;margin-top:12px">TITANS</div><div style="font-size:13px;color:#475569;margin-top:8px">Loading workspace…</div></div>`;
      Object.assign(s.style,{position:"fixed",inset:"0",background:"#040913",display:"flex",alignItems:"center",justifyContent:"center",zIndex:"10000"});
      document.body.appendChild(s);
    }
  }
  function hideLoadingScreen() {
    const s=document.getElementById("titans-loading");
    if(s){s.style.transition="opacity 0.4s";s.style.opacity="0";setTimeout(()=>s.remove(),400);}
  }

  /* ── START ── */
  setupTopbar();
  startFirebase();
});