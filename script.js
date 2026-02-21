const firebaseConfig = {
  apiKey: "AIzaSyDyTpY2vGcvM8Sz6B1TCdDeNUObQ6yZF4o",
  authDomain: "natis-add35.firebaseapp.com",
  databaseURL: "https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "natis-add35",
  storageBucket: "natis-add35.firebasestorage.app",
  messagingSenderId: "383875422865",
  appId: "1:383875422865:web:c142a191607606e01a28d0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const MASTER = { nick: "Szef", pass: "SZEF2026" };
let currentUser = { nick: "", ip: "0.0.0.0", role: "USER" };

fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => currentUser.ip = data.ip);

async function login() {
    const u = document.getElementById('userName').value;
    const p = document.getElementById('userPass').value;
    
    if(u === MASTER.nick && p === MASTER.pass) {
        setup(MASTER.nick, "ADMIN");
        return;
    }

    db.ref('accounts').once('value', snap => {
        const accs = snap.val();
        let found = null;
        for(let id in accs) {
            if(accs[id].nick === u && accs[id].pass === p) { found = accs[id]; break; }
        }
        if(found) setup(found.nick, found.role);
        else alert("Błędne dane");
    });
}

function setup(nick, role) {
    currentUser.nick = nick; currentUser.role = role;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    if(role === "ADMIN") document.getElementById('adminTab').style.display = 'block';
    
    db.ref('logs/' + nick).set({ ip: currentUser.ip, role: role, last: new Date().toLocaleString() });
    switchTab('tab-aktywnosc');
}

function renderAdmin() {
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = "";
        for(let nick in logs) {
            // ADMIN WIDZI IP TYLKO MEMBERÓW (USER)
            const isUser = logs[nick].role === "USER";
            const ipDisplay = isUser ? `<span class="ip-blur">${logs[nick].ip}</span>` : `<span class="protected">PROTECTED</span>`;
            const btn = isUser ? `<button onclick="db.ref('bans/${logs[nick].ip.replace(/\./g, '_')}').set(true)">BAN</button>` : '';

            list.innerHTML += `<tr><td>${nick}</td><td>${ipDisplay}</td><td>${btn}</td></tr>`;
        }
    });

    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = "";
        for(let id in reps) {
            cont.innerHTML += `<div class="glass-card" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${reps[id].user}: ${reps[id].type}</span>
                <button onclick="db.ref('reports/${id}').remove()">USUŃ</button>
            </div>`;
        }
    });
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'tab-admin') renderAdmin();
    if(id === 'tab-pracownicy') renderPublic();
}

function sendReport() {
    const link = document.getElementById('reportLink').value;
    if(!link.includes("imgur.com")) return alert("Tylko Imgur!");
    db.ref('reports').push({ user: currentUser.nick, type: document.getElementById('reportType').value, link: link });
    alert("Wysłano");
}

function createUser() {
    const n = document.getElementById('newUserName').value;
    const p = document.getElementById('newUserPass').value;
    const r = document.getElementById('newUserRole').value;
    db.ref('accounts').push({ nick: n, pass: p, role: r });
    alert("Konto utworzone");
}

function renderPublic() {
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('publicUserList');
        list.innerHTML = "";
        for(let nick in logs) {
            list.innerHTML += `<tr><td>${nick}</td><td>${logs[nick].last}</td></tr>`;
        }
    });
}