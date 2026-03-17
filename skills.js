/* ==============================
   TITANS — SKILLS DATA
============================== */

const teamSkills = {
  "praveenm.ad25@bitsathy.ac.in": {
    primary:   ["Machine Learning", "Python"],
    secondary: ["Data Analysis", "SQL"],
    special:   "Team Leadership",
    bars: [
      { name: "Python",     pct: 85, color: "#8b5cf6" },
      { name: "ML",         pct: 75, color: "#10b981" },
      { name: "Leadership", pct: 95, color: "#f59e0b" }
    ]
  },
  "tarunkumarr.ad25@bitsathy.ac.in": {
    primary:   ["React", "JavaScript"],
    secondary: ["Firebase", "CSS"],
    special:   "UI Design",
    bars: [
      { name: "React",  pct: 80, color: "#8b5cf6" },
      { name: "JS",     pct: 85, color: "#10b981" },
      { name: "Design", pct: 70, color: "#f59e0b" }
    ]
  },
  "thayatharsann.ad25@bitsathy.ac.in": {
    primary:   ["Python", "Data Science"],
    secondary: ["Pandas", "NumPy"],
    special:   "Data Visualization",
    bars: [
      { name: "Python",       pct: 80, color: "#8b5cf6" },
      { name: "Data Science", pct: 75, color: "#10b981" },
      { name: "Pandas",       pct: 70, color: "#f59e0b" }
    ]
  },
  "tariqanvar.ad25@bitsathy.ac.in": {
    primary:   ["Python", "AI"],
    secondary: ["OpenCV", "TensorFlow"],
    special:   "Computer Vision",
    bars: [
      { name: "Python",     pct: 78, color: "#8b5cf6" },
      { name: "AI",         pct: 72, color: "#10b981" },
      { name: "TensorFlow", pct: 65, color: "#f59e0b" }
    ]
  },
  "dhivyadharshinis.ad25@bitsathy.ac.in": {
    primary:   ["UI/UX", "Figma"],
    secondary: ["HTML", "CSS"],
    special:   "Prototyping",
    bars: [
      { name: "Figma", pct: 85, color: "#8b5cf6" },
      { name: "UI/UX", pct: 80, color: "#10b981" },
      { name: "HTML",  pct: 75, color: "#f59e0b" }
    ]
  },
  "keshanthv.cs25@bitsathy.ac.in": {
    primary:   ["C++", "DSA"],
    secondary: ["Python", "Java"],
    special:   "Problem Solving",
    bars: [
      { name: "C++", pct: 88, color: "#8b5cf6" },
      { name: "DSA", pct: 85, color: "#10b981" },
      { name: "Java", pct: 72, color: "#f59e0b" }
    ]
  },
  "vishnug.bt25@bitsathy.ac.in": {
    primary:   ["Bioinformatics", "Research"],
    secondary: ["Python", "Lab Analysis"],
    special:   "Bio Data Analysis",
    bars: [
      { name: "Research", pct: 80, color: "#8b5cf6" },
      { name: "Python",   pct: 65, color: "#10b981" },
      { name: "Lab",      pct: 75, color: "#f59e0b" }
    ]
  },
  "subhashreeb.bt25@bitsathy.ac.in": {
    primary:   ["Research", "Documentation"],
    secondary: ["Data Collection", "Reporting"],
    special:   "Technical Writing",
    bars: [
      { name: "Research", pct: 82, color: "#8b5cf6" },
      { name: "Docs",     pct: 78, color: "#10b981" },
      { name: "Reporting",pct: 74, color: "#f59e0b" }
    ]
  },
  "anafasadana.bt25@bitsathy.ac.in": {
    primary:   ["Biology", "Lab Work"],
    secondary: ["Research", "Python"],
    special:   "Experimental Design",
    bars: [
      { name: "Biology",  pct: 80, color: "#8b5cf6" },
      { name: "Lab Work", pct: 78, color: "#10b981" },
      { name: "Python",   pct: 55, color: "#f59e0b" }
    ]
  },
  "akileshm25@bitsathy.ac.in": {
    primary:   ["Machine Learning", "Python"],
    secondary: ["Data Analysis", "R"],
    special:   "Predictive Modeling",
    bars: [
      { name: "ML",     pct: 75, color: "#8b5cf6" },
      { name: "Python", pct: 78, color: "#10b981" },
      { name: "R",      pct: 65, color: "#f59e0b" }
    ]
  },
  "shivashanthm.mz25@bitsathy.ac.in": {
    primary:   ["Mechatronics", "Arduino"],
    secondary: ["CAD", "Robotics"],
    special:   "Hardware Integration",
    bars: [
      { name: "Arduino",     pct: 82, color: "#8b5cf6" },
      { name: "Robotics",    pct: 75, color: "#10b981" },
      { name: "CAD",         pct: 70, color: "#f59e0b" }
    ]
  },
  "muthamilselvan.it25@bitsathy.ac.in": {
    primary:   ["Web Dev", "Node.js"],
    secondary: ["React", "MongoDB"],
    special:   "Full Stack Dev",
    bars: [
      { name: "Node.js", pct: 80, color: "#8b5cf6" },
      { name: "React",   pct: 75, color: "#10b981" },
      { name: "MongoDB", pct: 70, color: "#f59e0b" }
    ]
  },
  "member13.ad25@bitsathy.ac.in": {
    primary:   ["Python", "AI"],
    secondary: ["Data Science", "ML"],
    special:   "Deep Learning",
    bars: [
      { name: "Python", pct: 70, color: "#8b5cf6" },
      { name: "AI",     pct: 65, color: "#10b981" }
    ]
  },
  "member14.ad25@bitsathy.ac.in": {
    primary:   ["Python", "Data Analysis"],
    secondary: ["SQL", "Visualization"],
    special:   "Statistical Modeling",
    bars: [
      { name: "Python", pct: 72, color: "#8b5cf6" },
      { name: "SQL",    pct: 68, color: "#10b981" }
    ]
  },
  "member15.ad25@bitsathy.ac.in": {
    primary:   ["Python", "NLP"],
    secondary: ["ML", "Data Science"],
    special:   "Natural Language Processing",
    bars: [
      { name: "Python", pct: 74, color: "#8b5cf6" },
      { name: "NLP",    pct: 68, color: "#10b981" }
    ]
  }
};


/* ==============================
   LOAD FLIP CARD
============================== */

function loadFlipCard() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  const skills = teamSkills[user.email];

  // --- FRONT SIDE ---
  const flipFrontName = document.getElementById("flipFrontName");
  const flipFrontRole = document.getElementById("flipFrontRole");
  const flipFrontDept = document.getElementById("flipFrontDept");
  if (flipFrontName) flipFrontName.textContent = user.name || "";
  if (flipFrontRole) flipFrontRole.textContent = (user.designation || "").toUpperCase();
  if (flipFrontDept) flipFrontDept.textContent = user.department || "";

  // --- BACK NAME ---
  const flipBackName = document.getElementById("flipBackName");
  if (flipBackName) flipBackName.textContent = user.name || "";

  // --- SYNC STATS FROM PROFILE (wait for dashboard to load them) ---
  setTimeout(() => {
    const done    = document.getElementById("perfDone")?.textContent    || "0";
    const pending = document.getElementById("perfPending")?.textContent || "0";
    const total   = document.getElementById("perfTotal")?.textContent   || "0";
    const rank    = document.getElementById("perfRank")?.textContent    || "#—";

    const f2Done    = document.getElementById("f2Done");
    const f2Pending = document.getElementById("f2Pending");
    const f2Total   = document.getElementById("f2Total");
    const f2Rank    = document.getElementById("f2Rank");

    if (f2Done)    f2Done.textContent    = done;
    if (f2Pending) f2Pending.textContent = pending;
    if (f2Total)   f2Total.textContent   = total;
    if (f2Rank)    f2Rank.textContent    = rank;

    // streak chip
    const streakText = document.getElementById("streakRow")?.textContent?.trim() || "";
    const chipEl = document.getElementById("flipStreakChip");
    if (chipEl && streakText) {
      chipEl.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:6px;
          background:rgba(245,158,11,0.1);
          border:1px solid rgba(245,158,11,0.2);
          border-radius:999px;padding:5px 12px;
          font-size:12px;color:#fbbf24">
          🔥 ${streakText}
        </div>`;
    }
  }, 600);

  // --- BACK SIDE SKILLS ---
  const flipPrimary   = document.getElementById("flipPrimary");
  const flipSecondary = document.getElementById("flipSecondary");
  const flipSpecial   = document.getElementById("flipSpecial");
  const flipBars      = document.getElementById("flipBars");

  if (skills) {
    if (flipPrimary) {
      flipPrimary.innerHTML = skills.primary
        .map(s => `<span class="tag-p">${s}</span>`).join("");
    }
    if (flipSecondary) {
      flipSecondary.innerHTML = skills.secondary
        .map(s => `<span class="tag-s">${s}</span>`).join("");
    }
    if (flipSpecial) {
      flipSpecial.innerHTML = `<span class="tag-sp">★ ${skills.special}</span>`;
    }
    if (flipBars) {
      flipBars.innerHTML = skills.bars.map(b => `
        <div class="flip-bar-row">
          <div class="flip-bar-top">
            <span>${b.name}</span><span>${b.pct}%</span>
          </div>
          <div class="flip-bar-bg">
            <div class="flip-bar-fill" style="width:${b.pct}%;background:${b.color}"></div>
          </div>
        </div>`).join("");
    }
  } else {
    if (flipPrimary)   flipPrimary.innerHTML   = `<span class="tag-p">Not set</span>`;
    if (flipSecondary) flipSecondary.innerHTML = `<span class="tag-s">Not set</span>`;
    if (flipSpecial)   flipSpecial.innerHTML   = `<span class="tag-sp">★ Not set</span>`;
    if (flipBars)      flipBars.innerHTML      = `<div style="font-size:12px;color:var(--text3)">No skill bars added yet</div>`;
  }
}


/* ==============================
   INIT
============================== */

document.addEventListener("DOMContentLoaded", loadFlipCard);