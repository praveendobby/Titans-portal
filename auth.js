/* ==============================
   TITANS — ALL 15 TEAM MEMBERS
============================== */

const teamUsers = [
{
email: "praveenm.ad25@bitsathy.ac.in",
password: "1234",
role: "captain",
name: "Praveen M",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD280",
designation: "Captain",
department: "Artificial Intelligence & Data Science",
imgSrc: "img/praveen.png"
},

{
email: "tarunkumarr.ad25@bitsathy.ac.in",
password: "1234",
role: "vice captain",
name: "Tarun Kumar ",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD355",
designation: "Vice Captain",
department: "Artificial Intelligence & Data Science",
imgSrc: "img/tarun.jpg"
},

{
email: "thayatharsann.ad25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Thaya Tharsan N",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD362",
designation: "Member",
department: "Artificial Intelligence & Data Science",
imgSrc: "img/thaya.jpg"
},

{
email: "tariqanvar.ad25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Thariq Anvar R",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD342",
designation: "Member",
department: "Artificial Intelligence & Data Science",
imgSrc: "img/tariq.jpg"
},

{
email: "dhivyadharshinis.ad25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Dhivya Dharshini S",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD157",
designation: "Member",
department: "Artificial Intelligence & Data Science",
imgSrc: "img/divya.jpg"
},

{
email: "keshanthv.cs25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Keshanth V",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376251CS259",
designation: "Member",
department: "Computer Science Engineering",
imgSrc: "img/keshanth.jpg"
},

{
email: "vishnug.bt25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Vishnu G",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252BT371",
designation: "Member",
department: "Bio Technology",
imgSrc: "img/vishnu.jpg"
},

{
email: "subashreeb.bt25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Subashree B",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD234",
designation: "Member",
department: "Bio Technology",
imgSrc: "img/suba.jpg"
},


{
email: "akileshm.bt25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Akilesh M",
phone: "91",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD315",
designation: "Member",
department: "Bio Technology",
imgSrc: "img/akil.jpg"
},
{
email: "shivashanthm.mz25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Shiva Shanth M",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376251MZ150",
designation: "Member",
department: "Mechatronics",
imgSrc: "img/shiva.jpeg"
},

{
email: "muthamilselvanm.it25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Muthamil Selvan",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252IT248",
designation: "Member",
department: "Information Technology",
imgSrc: "img/muthu.jpg"
},

{
email: "member25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "mem12",
phone: "",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD311",
designation: "Member",
department: "Bio Technology",
imgSrc: ""
},
{
email: "member13.ad25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "mem13",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD213",
designation: "Member",
department: "Artificial Intelligence & Data Science",
imgSrc: ""
},

{
email: "member14.ad25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "mem14",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD219",
designation: "Member",
department: "Artificial Intelligence & Data Science",
imgSrc: ""
},

{
email: "member15.ad25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "mem15",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD209",
designation: "Member",
department: "Artificial Intelligence & Data Science",
imgSrc: ""
}
];


/* ==============================
   SAVE TEAM USERS
============================== */
/* ==============================
   USE CODE AS SOURCE (NO CONFLICT)
============================== */

const users = teamUsers; // ✅ direct source (no localStorage read)

/* ==============================
   OPTIONAL: store copy (not used for logic)
============================== */
localStorage.setItem("teamUsers", JSON.stringify(teamUsers));

/* ==============================
   EMAIL + PASSWORD LOGIN
============================== */
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("errorMessage");
  error.textContent = "";

  // Check against your team list first
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    error.textContent = "Invalid email or password.";
    setTimeout(() => (error.textContent = ""), 3000);
    return;
  }

  // Sign into Firebase Auth so REST calls work
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");

    const firebaseConfig = {
      apiKey: "AIzaSyCaInB1din3Z6iiGJZIG6J7b9U2ASnfgsY",
      authDomain: "titans-portal-8b124.firebaseapp.com",
      databaseURL: "https://titans-portal-8b124-default-rtdb.firebaseio.com",
      projectId: "titans-portal-8b124",
      storageBucket: "titans-portal-8b124.firebasestorage.app",
      messagingSenderId: "248684743938",
      appId: "1:248684743938:web:7500d46e42bf3a5205061b"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Try sign in, if fails create the account
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      await createUserWithEmailAndPassword(auth, email, password);
    }

    // Get token and save it
    const token = await auth.currentUser.getIdToken();
    localStorage.setItem("firebaseToken", token);

  } catch (e) {
    console.warn("Firebase auth failed, continuing anyway:", e.message);
  }

  // Save user and redirect
  localStorage.setItem("user", JSON.stringify(user));
  window.location.href = "dashboard.html";
}