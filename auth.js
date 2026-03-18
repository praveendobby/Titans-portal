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
email: "subhashreeb.bt25@bitsathy.ac.in",
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
email: "anafasadana.bt25@bitsathy.ac.in",
password: "1234",
role: "member",
name: "Anafasadan A",
phone: "916369990709",
team: "TITANS",
groupId: "A#100260",
regNo: "7376252AD311",
designation: "Member",
department: "Bio Technology",
imgSrc: "img/anafa.png"
},

{
email: "akileshm25@bitsathy.ac.in",
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
email: "muthamilselvan.it25@bitsathy.ac.in",
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

if (!localStorage.getItem("teamUsers")) {
  localStorage.setItem("teamUsers", JSON.stringify(teamUsers));
}

const users = JSON.parse(localStorage.getItem("teamUsers"));


/* ==============================
   EMAIL + PASSWORD LOGIN
============================== */

function login() {

const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value.trim();
const error = document.getElementById("errorMessage");

error.textContent = "";

const user = users.find(u => u.email === email && u.password === password);

if (user) {

localStorage.setItem("user", JSON.stringify(user));
window.location.href = "dashboard.html";

} else {

error.textContent = "Invalid email or password.";

setTimeout(() => {
error.textContent = "";
}, 3000);

}

}


/* ==============================
   GOOGLE LOGIN
============================== */

function handleCredentialResponse(response) {

const userData = parseJwt(response.credential);
const email = userData.email;
const error = document.getElementById("errorMessage");

error.textContent = "";

const user = users.find(u => u.email === email);

if (user) {

localStorage.setItem("user", JSON.stringify(user));
window.location.href = "dashboard.html";

} else {

error.textContent = "Access denied. Only TITANS members can login.";

setTimeout(() => {
error.textContent = "";
}, 4000);

}

}


/* ==============================
   DECODE GOOGLE JWT
============================== */

function parseJwt(token) {

const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');

return JSON.parse(
decodeURIComponent(
atob(base64)
.split('')
.map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
.join('')
)
);
function uploadProfilePhoto(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const base64Image = e.target.result;

    // SAVE permanently
    localStorage.setItem("profilePhoto", base64Image);

    // SHOW instantly
    document.getElementById("profPhoto").style.backgroundImage = `url(${base64Image})`;
    document.getElementById("topbarAvatar").style.backgroundImage = `url(${base64Image})`;
  };

  reader.readAsDataURL(file);
}
}