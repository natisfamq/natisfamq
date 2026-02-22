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

// LOGOWANIE DZIAŁAŃ ADMINA
function logAction(action, target) {
    db.ref('system_logs').push({
        admin: currentUser.nick,
        action: action,
        target: target,
        timestamp: new Date().toLocaleString()
    });
}

// OBLICZANIE KASY
function calculatePayout(data) {
    let total = 0;
    const v1 = parseInt(data.val1) || 0; // krzaki lub kille
    const v2 = parseInt(data.val2) || 0; // dmg
    
    if (data.type === "Paczki" || data.type === "Cenna") {
        total = 10000;
    } else if (data.type === "Grover") {
        total = v1 * 1000;
    } else if (data.type === "Capt") {
        total = 2500 + (v1 * 1000) + (v2 * 10);
    }
    return total.toLocaleString() + "$";
}

function generatePass() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('newUserPass').value = pass;
}

async function login() {
    const u = document.getElementById('userName').value;
    const p = document.getElementById('userPass').value;
    const cleanIP = currentUser.ip.replace(/\./g, '_');

    const banSnap = await db.ref('bannedIPs').once('value');
    if (banSnap.val() && banSnap.val()[cleanIP]) {
        document.getElementById('loginError').innerText = "IP ZBANOWANE.";
        return;
    }

    if (u === MASTER.nick && p === MASTER.pass) { setup(MASTER.nick, "Zarząd"); return; }
    
    db.ref('accounts').once('value', snap => {
        const accs = snap.val();
        let found = null;
        for(let id in accs) { if(accs[id].nick === u && accs[id].pass === p) found = accs[id]; }
        if(found) setup(found.nick, found.role);
        else document.getElementById('loginError').innerText = "Błędne dane.";
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
    db.ref().on('value', async snap => {
        const data = snap.val();
        const accs = data.accounts || {};
        const logs = data.logs || {};
        const bans = data.bannedIPs || {};
        
        const list = document.getElementById('adminUsersList');
        list.innerHTML = `<tr><td>${MASTER.nick}</td><td><span style="color:#444">[ PROTECTED ]</span></td><td>Zarząd</td></tr>`;
        
        for(let id in accs) {
            const u = accs[id];
            const ip = logs[u.nick] ? logs[u.nick].ip : "0.0.0.0";
            const cleanIP = ip.replace(/\./g, '_');
            const isBanned = bans[cleanIP] ? true : false;
            const displayIp = (u.role === "Zarząd") ? `<span style="color:#444">[ PROTECTED ]</span>` : `<span class="ip-blur">${ip}</span>`;

            list.innerHTML += `<tr>
                <td onclick="showHistory('${u.nick}')" style="cursor:pointer; text-decoration:underline;">${u.nick}</td>
                <td>${displayIp}</td>
                <td>
                    <button class="btn-ban ${isBanned ? 'unban-mode' : ''}" onclick="toggleIpBan('${ip}')">${isBanned ? 'UNBANUJ IP' : 'BANUJ IP'}</button>
                    <button onclick="deleteUser('${id}')" style="background:none; border:none; color:#333; cursor:pointer; margin-left:10px;">✕</button>
                </td>
            </tr>`;
        }

        const logCont = document.getElementById('systemLogsContainer');
        logCont.innerHTML = "";
        const sLogs = Object.values(data.system_logs || {}).reverse();
        sLogs.forEach(l => {
            logCont.innerHTML += `<div class="log-entry"><span class="log-time">[${l.timestamp}]</span> <span class="log-user">${l.admin}</span> <span class="log-action">${l.action}</span> <span class="log-target">${l.target}</span></div>`;
        });
    });

    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = reps ? "" : "<p style='color:#222; font-size:11px;'>Brak raportów.</p>";
        for(let id in reps) {
            const payout = calculatePayout(reps[id]);
            cont.innerHTML += `<div style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid #111; align-items:center;">
                <span style="font-size:12px;">${reps[id].user} - <b>${reps[id].type}</b></span>
                <div style="display:flex; gap:10px; align-items:center;">
                    <a href="${reps[id].link}" target="_blank" style="color:#444; font-size:10px; text-decoration:none;">[ LINK ]</a>
                    <span class="payout-badge">${payout}</span>
                    <button onclick="acceptReport('${id}')" style="color:#2ecc71; background:none; border:1px solid #2ecc71; padding:3px 8px; cursor:pointer; font-size:10px; border-radius:5px;">TAK</button>
                    <button onclick="rejectReport('${id}')" style="color:#ff4444; background:none; border:1px solid #ff4444; padding:3px 8px; cursor:pointer; font-size:10px; border-radius:5px;">NIE</button>
                </div>
            </div>`;
        }
    });
}

async function toggleIpBan(ip) {
    if (ip === "0.0.0.0" || ip === "OFFLINE") return;
    const cleanIP = ip.replace(/\./g, '_');
    const snap = await db.ref(`bannedIPs/${cleanIP}`).once('value');
    if (snap.exists()) {
        await db.ref(`bannedIPs/${cleanIP}`).remove();
        logAction("ODBANOWAŁ IP", ip);
    } else {
        await db.ref(`bannedIPs/${cleanIP}`).set({ at: new Date().toLocaleString() });
        logAction("ZBANOWAŁ IP", ip);
    }
}

function createUser() {
    const n = document.getElementById('newUserName').value;
    const p = document.getElementById('newUserPass').value;
    const r = document.getElementById('newUserRole').value;
    if(!n || !p) return;
    db.ref('accounts').push({ nick: n, pass: p, role: r }).then(() => {
        logAction("DODAŁ KONTO", n);
        document.getElementById('newUserName').value = "";
        document.getElementById('newUserPass').value = "";
    });
}

async function deleteUser(id) {
    const snap = await db.ref(`accounts/${id}`).once('value');
    const name = snap.val().nick;
    if (confirm("Usunąć konto " + name + "?")) {
        logAction("USUNĄŁ KONTO", name);
        await db.ref(`accounts/${id}`).remove();
    }
}

function toggleExtraFields() {
    const type = document.getElementById('reportType').value;
    document.getElementById('groverPlants').style.display = (type === 'Grover') ? 'block' : 'none';
    document.getElementById('captKills').style.display = (type === 'Capt') ? 'block' : 'none';
    document.getElementById('captDmg').style.display = (type === 'Capt') ? 'block' : 'none';
}

function sendReport() {
    let link = document.getElementById('reportLink').value.trim();
    if(!link) return alert("Podaj link!");
    if (!link.startsWith('http://') && !link.startsWith('https://')) link = 'https://' + link;

    const data = {
        user: currentUser.nick,
        type: document.getElementById('reportType').value,
        link: link,
        timestamp: new Date().toLocaleString()
    };
    if(data.type === 'Grover') data.val1 = document.getElementById('groverPlants').value;
    if(data.type === 'Capt') {
        data.val1 = document.getElementById('captKills').value;
        data.val2 = document.getElementById('captDmg').value;
    }
    db.ref('reports').push(data).then(() => {
        alert("Wysłano!");
        document.getElementById('reportLink').value = "";
    });
}

async function acceptReport(id) {
    const snap = await db.ref(`reports/${id}`).once('value');
    const data = snap.val();
    await db.ref('archive').push({ ...data, payout: calculatePayout(data), status: "ZAAKCEPTOWANO", decider: currentUser.nick, decisionAt: new Date().toLocaleString() });
    await db.ref(`reports/${id}`).remove();
}

async function rejectReport(id) {
    const snap = await db.ref(`reports/${id}`).once('value');
    const data = snap.val();
    await db.ref('archive').push({ ...data, payout: "0$", status: "ODRZUCONO", decider: currentUser.nick, decisionAt: new Date().toLocaleString() });
    await db.ref(`reports/${id}`).remove();
}

async function showHistory(nick) {
    const snap = await db.ref('archive').once('value');
    const body = document.getElementById('historyBody');
    body.innerHTML = "";
    let found = false;
    for (let id in snap.val()) {
        if (snap.val()[id].user === nick) {
            found = true;
            const item = snap.val()[id];
            const color = item.status === "ZAAKCEPTOWANO" ? "#2ecc71" : "#ff4444";
            body.innerHTML += `<div style="font-size:11px; padding:10px; border-bottom:1px solid #111; border-left: 3px solid ${color}; margin-bottom: 5px; background: rgba(255,255,255,0.02);">
                <b style="color:#fff">${item.type}</b> <span style="color:${color}; float:right;">${item.payout}</span><br>
                <span style="color:#444">${item.timestamp}</span><br>
                <a href="${item.link}" target="_blank" style="color:cyan; font-size:10px;">[ ZOBACZ DOWÓD ]</a>
            </div>`;
        }
    }
    if(!found) body.innerHTML = "<p style='color:#333'>Brak historii.</p>";
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }

function renderPublic() {
    db.ref('accounts').on('value', snap => {
        const list = document.getElementById('publicUserList');
        list.innerHTML = `<tr><td>${MASTER.nick}</td><td style="text-align:right; color:green; font-weight:bold;">Zarząd</td></tr>`;
        for(let id in snap.val()) {
            const u = snap.val()[id];
            list.innerHTML += `<tr><td>${u.nick}</td><td style="text-align:right; color:${u.role === 'Zarząd' ? 'green' : '#444'}">${u.role}</td></tr>`;
        }
    });
}