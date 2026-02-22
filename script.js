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

const MASTER = { nick: "rex", pass: "Rex321" };
let currentUser = { nick: "", ip: "0.0.0.0", role: "Członek" };

fetch('https://api.ipify.org?format=json').then(res => res.json()).then(d => currentUser.ip = d.ip);

function toggleExtraFields() {
    const type = document.getElementById('reportType').value;
    document.getElementById('groverPlants').style.display = (type === 'Grover') ? 'block' : 'none';
    document.getElementById('captKills').style.display = (type === 'Capt') ? 'block' : 'none';
    document.getElementById('captDmg').style.display = (type === 'Capt') ? 'block' : 'none';
}

function calculatePayout(data) {
    let total = 0;
    const v1 = parseInt(data.val1) || 0;
    const v2 = parseInt(data.val2) || 0;
    if (data.type === "Paczki") total = 10000;
    else if (data.type === "Cenna") total = 10000;
    else if (data.type === "Grover") total = v1 * 1000;
    else if (data.type === "Capt") total = 2500 + (v1 * 1000) + (v2 * 10);
    return total.toLocaleString() + "$";
}

async function login() {
    const u = document.getElementById('userName').value;
    const p = document.getElementById('userPass').value;
    if (u === MASTER.nick && p === MASTER.pass) { setup(MASTER.nick, "Zarząd"); return; }
    db.ref('accounts').once('value', snap => {
        const accs = snap.val();
        let found = null;
        for(let id in accs) { if(accs[id].nick === u && accs[id].pass === p) found = accs[id]; }
        if(found) setup(found.nick, found.role);
        else document.getElementById('loginError').innerText = "Błąd autoryzacji.";
    });
}

function setup(n, r) {
    currentUser.nick = n; currentUser.role = r;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    if(r === "Zarząd") document.getElementById('adminTab').style.display = 'inline';
    db.ref('logs/' + n).set({ ip: currentUser.ip, role: r, last: new Date().toLocaleString() });
    switchTab('tab-aktywnosc');
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'tab-admin') renderAdmin();
    if(id === 'tab-pracownicy') renderPublic();
}

function renderAdmin() {
    db.ref('accounts').on('value', async snap => {
        const accs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = `<tr><td onclick="showHistory('${MASTER.nick}')" style="cursor:pointer; text-decoration:underline;">${MASTER.nick}</td><td>[ PROT ]</td><td>Zarząd</td></tr>`;
        const logsSnap = await db.ref('logs').once('value');
        const logs = logsSnap.val() || {};
        for(let id in accs) {
            const nick = accs[id].nick;
            const ip = logs[nick] ? logs[nick].ip : "OFFLINE";
            list.innerHTML += `<tr>
                <td onclick="showHistory('${nick}')" style="cursor:pointer; text-decoration:underline;">${nick}</td>
                <td><span class="ip-blur">${ip}</span></td>
                <td><button onclick="deleteUser('${nick}')" style="background:none; border:1px solid #311; color:#533; border-radius:5px; cursor:pointer; padding:2px 5px;">USUŃ</button></td>
            </tr>`;
        }
    });

    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = "";
        if(!reps) return cont.innerHTML = "<p style='color:#222; font-size:12px;'>Brak oczekujących raportów.</p>";
        for(let id in reps) {
            const payout = calculatePayout(reps[id]);
            cont.innerHTML += `<div style="padding:15px 0; border-bottom:1px solid #111; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:13px;">${reps[id].user} // <b>${reps[id].type}</b></div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <a href="${reps[id].link}" target="_blank" style="color:#444; font-size:10px;">[ LINK ]</a>
                    <span class="payout-badge">${payout}</span>
                    <button onclick="acceptReport('${id}')" style="background:none; border:1px solid #2ecc71; color:#2ecc71; border-radius:5px; cursor:pointer; padding:3px 8px;">TAK</button>
                    <button onclick="rejectReport('${id}')" style="background:none; border:1px solid #ff4444; color:#ff4444; border-radius:5px; cursor:pointer; padding:3px 8px;">NIE</button>
                </div>
            </div>`;
        }
    });
}

function sendReport() {
    const type = document.getElementById('reportType').value;
    const link = document.getElementById('reportLink').value;
    if(!link.includes("imgur.com")) return alert("Wymagany link Imgur!");
    const data = { user: currentUser.nick, type: type, link: link, timestamp: new Date().toLocaleString() };
    if(type === 'Grover') data.val1 = document.getElementById('groverPlants').value;
    if(type === 'Capt') { data.val1 = document.getElementById('captKills').value; data.val2 = document.getElementById('captDmg').value; }
    db.ref('reports').push(data).then(() => { alert("Wysłano!"); document.getElementById('reportLink').value = ""; });
}

async function acceptReport(id) {
    const snap = await db.ref(`reports/${id}`).once('value');
    const data = snap.val();
    await db.ref('archive').push({ ...data, payout: calculatePayout(data), status: "ZAAKCEPTOWANO", acceptedBy: currentUser.nick, decisionAt: new Date().toLocaleString() });
    await db.ref(`reports/${id}`).remove();
}

async function rejectReport(id) {
    const snap = await db.ref(`reports/${id}`).once('value');
    const data = snap.val();
    await db.ref('archive').push({ ...data, payout: "0$", status: "ODRZUCONO", acceptedBy: currentUser.nick, decisionAt: new Date().toLocaleString() });
    await db.ref(`reports/${id}`).remove();
}

async function showHistory(nick) {
    const snap = await db.ref('archive').once('value');
    const all = snap.val();
    const body = document.getElementById('historyBody');
    document.getElementById('historyTitle').innerText = "Archiwum: " + nick;
    body.innerHTML = "";
    let found = false;
    for (let id in all) {
        if (all[id].user === nick) {
            found = true;
            const s = all[id];
            const color = s.status === "ZAAKCEPTOWANO" ? "#2ecc71" : "#ff4444";
            body.innerHTML += `<div class="history-item" style="border-left: 3px solid ${color}">
                <span style="font-weight:bold; text-transform:uppercase; font-size:10px; color:${color}">${s.status}</span>
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; margin-top:5px;">
                    <b>${s.type}</b> <span style="color:#2ecc71">${s.payout}</span>
                </div>
                <div style="color:#444; font-size:10px; line-height:1.4;">
                    Wysłano: ${s.timestamp}<br>
                    Decyzja: ${s.decisionAt}<br>
                    Sprawdził: ${s.acceptedBy}<br>
                    <a href="${s.link}" target="_blank" style="color:#666; text-decoration:none; font-weight:bold;">[ DOWÓD ]</a>
                </div>
            </div>`;
        }
    }
    if(!found) body.innerHTML = "<p style='color:#222; text-align:center;'>Brak danych historycznych.</p>";
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }

function createUser() {
    const n = document.getElementById('newUserName').value;
    const p = document.getElementById('newUserPass').value;
    const r = document.getElementById('newUserRole').value;
    if(!n || !p) return alert("Brak danych!");
    db.ref('accounts').push({ nick: n, pass: p, role: r }).then(() => alert("Konto utworzone!"));
}

async function deleteUser(n) {
    if (confirm(`Usunąć ${n}?`)) {
        const snap = await db.ref('accounts').once('value');
        const accs = snap.val();
        for (let id in accs) { if (accs[id].nick === n) await db.ref(`accounts/${id}`).remove(); }
        await db.ref(`logs/${n}`).remove();
    }
}

function renderPublic() {
    db.ref('accounts').on('value', snap => {
        const accs = snap.val();
        const list = document.getElementById('publicUserList');
        list.innerHTML = `<tr><td style="padding: 10px 0;">${MASTER.nick}</td><td style="text-align: right; color:#2ecc71; font-weight: bold; font-size:11px;">Zarząd</td></tr>`;
        for(let id in accs) { 
            const roleColor = accs[id].role === "Zarząd" ? "#2ecc71" : "#333";
            list.innerHTML += `<tr>
                <td style="padding: 10px 0;">${accs[id].nick}</td>
                <td style="text-align: right; color:${roleColor}; font-size:11px;">${accs[id].role}</td>
            </tr>`; 
        }
    });
}