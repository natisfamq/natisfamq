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
        setupSession(MASTER.nick, "ADMIN");
        return;
    }

    db.ref('accounts').once('value', snap => {
        const accs = snap.val();
        let found = null;
        for(let id in accs) {
            if(accs[id].nick === u && accs[id].pass === p) { found = accs[id]; break; }
        }
        if(found) setupSession(found.nick, found.role);
        else alert("AUTH_FAILED: Błędne poświadczenia");
    });
}

function setupSession(nick, role) {
    currentUser.nick = nick; currentUser.role = role;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    if(role === "ADMIN") document.getElementById('adminTab').style.display = 'block';
    
    db.ref('logs/' + nick).set({ 
        ip: currentUser.ip, 
        role: role, 
        last: new Date().toLocaleString() 
    });
    switchTab('tab-aktywnosc');
}

function renderAdmin() {
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = "";
        for(let nick in logs) {
            // ADMIN widzi IP tylko jeśli rola to USER
            const isUser = logs[nick].role === "USER";
            const ipData = isUser ? `<span class="ip-blur">${logs[nick].ip}</span>` : `<span class="protected-text">PROTECTED_ADMIN</span>`;
            const banBtn = isUser ? `<button onclick="db.ref('bans/${logs[nick].ip.replace(/\./g, '_')}').set(true)" style="background:none; border:1px solid #444; color:#fff; cursor:pointer; font-size:10px;">BAN</button>` : '';

            list.innerHTML += `<tr><td>${nick}</td><td>${ipData}</td><td>${banBtn}</td></tr>`;
        }
    });

    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = "";
        for(let id in reps) {
            cont.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid rgba(255,255,255,0.02);">
                <span style="font-size:13px;">${reps[id].user} // ${reps[id].type}</span>
                <button onclick="db.ref('reports/${id}').remove()" style="background:none; border:none; color:#777; cursor:pointer;">Usuń</button>
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
    const l = document.getElementById('reportLink').value;
    if(!l.includes("imgur.com")) return alert("ERROR: Nieprawidłowy format linku");
    db.ref('reports').push({ user: currentUser.nick, type: document.getElementById('reportType').value, link: l });
    alert("SYSTEM: Dane zostały przesłane");
}

function createUser() {
    const n = document.getElementById('newUserName').value;
    const p = document.getElementById('newUserPass').value;
    const r = document.getElementById('newUserRole').value;
    if(!n || !p) return;
    db.ref('accounts').push({ nick: n, pass: p, role: r });
    alert("SYSTEM: Konto utworzone pomyślnie");
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