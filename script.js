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

// Zaktualizowane dane Master Admina
const MASTER = { nick: "rex", pass: "Rex321" };
let currentUser = { nick: "", ip: "0.0.0.0", role: "USER" };

fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => currentUser.ip = data.ip);

async function login() {
    const u = document.getElementById('userName').value;
    const p = document.getElementById('userPass').value;
    if (u === MASTER.nick && p === MASTER.pass) { setup(MASTER.nick, "ADMIN"); return; }
    db.ref('accounts').once('value', snapshot => {
        const accs = snapshot.val();
        let found = null;
        for(let id in accs) { if(accs[id].nick === u && accs[id].pass === p) { found = accs[id]; break; } }
        if(found) setup(found.nick, found.role);
        else alert("Błąd logowania");
    });
}

function setup(nick, role) {
    currentUser.nick = nick; currentUser.role = role;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    if(role === "ADMIN") document.getElementById('adminTab').style.display = 'inline';
    db.ref('logs/' + nick).set({ ip: currentUser.ip, role: role, last: new Date().toLocaleString() });
    switchTab('tab-aktywnosc');
}

function renderAdmin() {
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = "";
        for(let nick in logs) {
            const isMember = logs[nick].role === "USER";
            const ipField = isMember ? `<span class="ip-blur">${logs[nick].ip}</span>` : `<span style="color:#222">[ PROTECTED ]</span>`;
            list.innerHTML += `<tr>
                <td class="clickable-nick" onclick="showHistory('${nick}')">${nick}</td>
                <td>${ipField}</td>
                <td><button onclick="deleteUser('${nick}')" style="background:none; border:1px solid #222; color:#444; cursor:pointer; font-size:10px;">USUŃ</button></td>
            </tr>`;
        }
    });

    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = "";
        if(!reps) { cont.innerHTML = "<p style='color:#222'>Brak oczekujących raportów.</p>"; return; }
        
        for(let id in reps) {
            cont.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #111;">
                <span style="font-size:12px;">${reps[id].user} // ${reps[id].type}</span>
                <div>
                    <a href="${reps[id].link}" target="_blank" style="color:#444; font-size:11px; margin-right:10px;">[ LINK ]</a>
                    <button onclick="acceptReport('${id}')" style="background:none; border:1px solid #2ecc71; color:#2ecc71; cursor:pointer; font-size:10px;">AKCEPTUJ</button>
                    <button onclick="db.ref('reports/${id}').remove()" style="background:none; border:1px solid #ff4444; color:#ff4444; cursor:pointer; font-size:10px; margin-left:5px;">ODRZUĆ</button>
                </div>
            </div>`;
        }
    });
}

async function acceptReport(id) {
    const snap = await db.ref(`reports/${id}`).once('value');
    const data = snap.val();
    await db.ref('archive').push({
        ...data,
        acceptedBy: currentUser.nick,
        acceptedAt: new Date().toLocaleString()
    });
    await db.ref(`reports/${id}`).remove();
}

async function showHistory(nick) {
    const snap = await db.ref('archive').once('value');
    const all = snap.val();
    const body = document.getElementById('historyBody');
    document.getElementById('historyTitle').innerText = `Historia: ${nick}`;
    body.innerHTML = "";
    let count = 0;
    for (let id in all) {
        if (all[id].user === nick) {
            count++;
            body.innerHTML += `
                <div class="history-item">
                    <b>Czynność:</b> ${all[id].type}<br>
                    <b>Dowód:</b> <a href="${all[id].link}" target="_blank" style="color:#888">${all[id].link}</a><br>
                    <span>Zaakceptowane przez: ${all[id].acceptedBy} o ${all[id].acceptedAt}</span>
                </div>`;
        }
    }
    if (count === 0) body.innerHTML = "<p style='color:#333'>Brak archiwalnych raportów.</p>";
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }

async function deleteUser(n) {
    if (confirm(`USUŃ ${n}?`)) {
        const snap = await db.ref('accounts').once('value');
        const accs = snap.val();
        for (let id in accs) { if (accs[id].nick === n) await db.ref(`accounts/${id}`).remove(); }
        await db.ref(`logs/${n}`).remove();
    }
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'tab-admin') renderAdmin();
    if(id === 'tab-pracownicy') renderPublic();
}

function sendReport() {
    const l = document.getElementById('reportLink').value;
    if(!l.includes("imgur.com")) return alert("Link Imgur!");
    db.ref('reports').push({ 
        user: currentUser.nick, 
        type: document.getElementById('reportType').value, 
        link: l,
        timestamp: Date.now()
    });
    alert("Wysłano raport.");
    document.getElementById('reportLink').value = "";
}

function createUser() {
    const n = document.getElementById('newUserName').value;
    const p = document.getElementById('newUserPass').value;
    const r = document.getElementById('newUserRole').value;
    db.ref('accounts').push({ nick: n, pass: p, role: r });
    alert("Konto utworzone.");
}

function renderPublic() {
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('publicUserList');
        list.innerHTML = "";
        for(let nick in logs) {
            list.innerHTML += `<tr><td>${nick}</td><td style="color:#222; font-size:10px;">${logs[nick].last}</td></tr>`;
        }
    });
}