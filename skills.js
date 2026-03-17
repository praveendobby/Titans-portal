const teamSkills = {
  "praveenm.ad25@bitsathy.ac.in": {
    primary: ["Machine Learning", "Python"],
    secondary: ["Data Analysis", "SQL"],
    special: "Team Leadership",
    bars: [{ name:"Python", pct:85, color:"#8b5cf6" },
           { name:"ML", pct:75, color:"#10b981" },
           { name:"Leadership", pct:95, color:"#f59e0b" }]
  },
  "tarunkumarr.ad25@bitsathy.ac.in": {
    primary: ["React", "JavaScript"],
    secondary: ["Firebase", "CSS"],
    special: "UI Design",
    bars: [{ name:"React", pct:80, color:"#8b5cf6" },
           { name:"JS", pct:85, color:"#10b981" },
           { name:"Design", pct:70, color:"#f59e0b" }]
  },
  "thayatharsann.ad25@bitsathy.ac.in": {
    primary: ["Python", "Data Science"],
    secondary: ["Pandas", "NumPy"],
    special: "Data Visualization",
    bars: [{ name:"Python", pct:80, color:"#8b5cf6" },
           { name:"Data Science", pct:75, color:"#10b981" }]
  },
  "tariqanvar.ad25@bitsathy.ac.in": {
    primary: ["Python", "AI"],
    secondary: ["OpenCV", "TensorFlow"],
    special: "Computer Vision",
    bars: [{ name:"Python", pct:78, color:"#8b5cf6" },
           { name:"AI", pct:72, color:"#10b981" }]
  },
  "dhivyadharshinis.ad25@bitsathy.ac.in": {
    primary: ["UI/UX", "Figma"],
    secondary: ["HTML", "CSS"],
    special: "Prototyping",
    bars: [{ name:"Figma", pct:85, color:"#8b5cf6" },
           { name:"UI/UX", pct:80, color:"#10b981" }]
  },
  "keshanthv.cs25@bitsathy.ac.in": {
    primary: ["C++", "DSA"],
    secondary: ["Python", "Java"],
    special: "Problem Solving",
    bars: [{ name:"C++", pct:88, color:"#8b5cf6" },
           { name:"DSA", pct:85, color:"#10b981" }]
  },
  "vishnug.bt25@bitsathy.ac.in": {
    primary: ["Bioinformatics", "Research"],
    secondary: ["Python", "Lab Analysis"],
    special: "Bio Data Analysis",
    bars: [{ name:"Research", pct:80, color:"#8b5cf6" },
           { name:"Python", pct:65, color:"#10b981" }]
  },
  "subhashreeb.bt25@bitsathy.ac.in": {
    primary: ["Research", "Documentation"],
    secondary: ["Data Collection", "Reporting"],
    special: "Technical Writing",
    bars: [{ name:"Research", pct:82, color:"#8b5cf6" },
           { name:"Docs", pct:78, color:"#10b981" }]
  },
  "anafasadana.bt25@bitsathy.ac.in": {
    primary: ["Biology", "Lab Work"],
    secondary: ["Research", "Python"],
    special: "Experimental Design",
    bars: [{ name:"Biology", pct:80, color:"#8b5cf6" }]
  },
  "akileshm25@bitsathy.ac.in": {
    primary: ["Machine Learning", "Python"],
    secondary: ["Data Analysis", "R"],
    special: "Predictive Modeling",
    bars: [{ name:"ML", pct:75, color:"#8b5cf6" },
           { name:"Python", pct:78, color:"#10b981" }]
  },
  "shivashanthm.mz25@bitsathy.ac.in": {
    primary: ["Mechatronics", "Arduino"],
    secondary: ["CAD", "Robotics"],
    special: "Hardware Integration",
    bars: [{ name:"Arduino", pct:82, color:"#8b5cf6" },
           { name:"Robotics", pct:75, color:"#10b981" }]
  },
  "muthamilselvan.it25@bitsathy.ac.in": {
    primary: ["Web Dev", "Node.js"],
    secondary: ["React", "MongoDB"],
    special: "Full Stack Dev",
    bars: [{ name:"Node.js", pct:80, color:"#8b5cf6" },
           { name:"React", pct:75, color:"#10b981" }]
  }
};

function loadFlipCard() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;
  const skills = teamSkills[user.email];

  document.getElementById("flipFrontName").textContent = user.name || "";
  document.getElementById("flipFrontRole").textContent = (user.designation || "").toUpperCase();
  document.getElementById("flipFrontDept").textContent = user.department || "";
  document.getElementById("flipBackName").textContent = user.name || "";

  if (skills) {
    document.getElementById("flipPrimary").innerHTML =
      skills.primary.map(s => `<span class="skill-tag-p">${s}</span>`).join("");
    document.getElementById("flipSecondary").innerHTML =
      skills.secondary.map(s => `<span class="skill-tag-s">${s}</span>`).join("");
    document.getElementById("flipSpecial").innerHTML =
      `<span class="skill-tag-sp">${skills.special}</span>`;
    document.getElementById("flipBars").innerHTML = skills.bars.map(b => `
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:3px">
        <span>${b.name}</span><span>${b.pct}%</span>
      </div>
      <div class="skill-bar-bg">
        <div class="skill-bar-fill" style="width:${b.pct}%;background:${b.color}"></div>
      </div>`).join("");
  } else {
    document.getElementById("flipPrimary").innerHTML = `<span class="skill-tag-p">Add skills</span>`;
    document.getElementById("flipSecondary").innerHTML = `<span class="skill-tag-s">Add skills</span>`;
    document.getElementById("flipSpecial").innerHTML = `<span class="skill-tag-sp">Add skill</span>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFlipCard);