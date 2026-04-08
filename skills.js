/* ==============================
   TITANS — SKILLS DATA
============================== */

const teamSkills = {
  "praveenm.ad25@bitsathy.ac.in": {
    primary:   ["Natural Language Processing", "IOT & Sensor Integration"],
    secondary: ["Cloud Computing", "Cyber Security & Cryptography"],
    special:   ["Generative AI (Gen AI)", "User Experience (UI/UX) Design"]
  },
  "tarunkumarr.ad25@bitsathy.ac.in": {
    primary:   ["Agentic AI & LLM Optimization", "Cloud Computing"],
    secondary: ["Blockchain Technology", "DevOps & IT Infra"],
    special:   ["Generative AI (Gen AI)", "User Experience (UI/UX) Design"]
  },
  "thayatharsann.ad25@bitsathy.ac.in": {
    primary:   ["Big Data Analytics and Machine learning", "devOps and IT Infra"],
    secondary: ["Agentic AI", "LLM optimization"],
    special:   ["Prompt engineering", "Report Writing"]
  },
  "tariqanvar.ad25@bitsathy.ac.in": {
    primary:   ["Full-Stack Software Development", "Cloud Computing"],
    secondary: ["DevOps and IT Infra", "Agentic Ai"],
    special:   ["Product thinking", "Creativity"]
  },
  "dhivyadharshinis.ad25@bitsathy.ac.in": {
    primary:   ["Bio Informatics", "Data Analytics"],
    secondary: ["Edge AI", "Robot System Integration"],
    special:   ["Generative AI (GEN AI)", "Prompt Engineering"]
  },
  "keshanthv.cs25@bitsathy.ac.in": {
    primary:   ["C++", "DSA"],
    secondary: ["Python", "Java"],
    special:   ["Problem Solving"]
  },
  "vishnug.bt25@bitsathy.ac.in": {
    primary:   ["Bio-Process Engineering", "Digital Signal Processing"],
    secondary: ["Cyber Security and Cryptography", "Molecular Biology and Genetic Engineering"],
    special:   ["Report writing", "Research methodology"]
  },
  "subhashreeb.bt25@bitsathy.ac.in": {
    primary:   ["Bio-Process Engineering", "Full-Stack Software Development"],
    secondary: ["Molecular Biology and Genetic Engineering", "Agentic AI & LLM Optimization"],
    special:   ["Report writing", "Research methodology"]
  },
  "rubikas.ad25@bitsathy.ac.in": {
    primary:   ["Cloud Computing", " Fullstack software development"],
    secondary: [" Cyber security and Cryptography", " DevOps and IT Infra"],
    special:   [" Generative AI(Gen AI)", "User Experince (UI/UX) Design"]
  },
  "akileshm.bt25@bitsathy.ac.in": {
    primary:   ["Agentic AI & LLM Optimization", "Microbial and Plant Bioprospecting"],
    secondary: ["Additive Manufacturing (3D Printing)", "Bioinformatics and Data Analytic"],
    special:   [" Augmented Reality (AR) & Virtual Reality (VR) Development", "Research methodology"]
  },
  "shivashanthm.mz25@bitsathy.ac.in": {
    primary:   ["Mechatronics", "Arduino"],
    secondary: ["CAD", "Robotics"],
    special:   ["Hardware Integration"]
  },
  "muthamilselvan.it25@bitsathy.ac.in": {
    primary:   ["Web Dev", "Node.js"],
    secondary: ["React", "MongoDB"],
    special:   ["Full Stack Dev"]
  },
  "roshinim.it25@bitsathy.ac.in": {
    primary:   ["Edge AI", "Agentic AI & LLM Optimization"],
    secondary: ["Full-stack Software Development", "Cloud Computing"],
    special:   [" Prompt Engineering",]
  },
  "member14.ad25@bitsathy.ac.in": {
    primary:   ["Edge AI", "Agentic AI & LLM Optimization"],
    secondary: ["Full-stack Software Development", "Cloud Computing"],
    special:   [" Prompt Engineering",]
  },
  "member15.ad25@bitsathy.ac.in": {
    primary:   ["Python", "NLP"],
    secondary: ["ML", "Data Science"],
    special:   ["Natural Language Processing"]
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

  // --- SYNC STATS FROM PROFILE ---
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

  // hide bars section since bars are removed
  if (flipBars) flipBars.style.display = "none";

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
      // handles both array and string formats safely
      const specialArr = Array.isArray(skills.special)
        ? skills.special
        : [skills.special];
      flipSpecial.innerHTML = specialArr
        .map(s => `<span class="tag-sp">★ ${s}</span>`).join("");
    }
  } else {
    if (flipPrimary)   flipPrimary.innerHTML   = `<span class="tag-p">Not set</span>`;
    if (flipSecondary) flipSecondary.innerHTML = `<span class="tag-s">Not set</span>`;
    if (flipSpecial)   flipSpecial.innerHTML   = `<span class="tag-sp">★ Not set</span>`;
  }
}


/* ==============================
   INIT
============================== */

document.addEventListener("DOMContentLoaded", loadFlipCard);