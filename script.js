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

// LOGOWANIE DZIAŁAŃ
function logAction(action, target) {
    db.ref('system_logs').push({
        admin: currentUser.nick,
        action: action,
        target: target,
        timestamp: new Date().toLocaleString()
    });
}

// GENERATOR HASŁA (KOSTKA)
function generatePass() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('newUserPass').value = pass;
}

// LOGOWANIE Z BLOKADĄ IP
async function login() {
    const u = document.getElementById('userName').value;
    const p = document.getElementById('userPass').value;
    const cleanIP = currentUser.ip.replace(/\./g, '_');

    const banSnap = await db.ref('bannedIPs').once('value');
    if (banSnap.val() && banSnap.val()[cleanIP]) {
        alert("TWOJE IP JEST ZBANOWANE.");
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

// PANEL ADMINA
function renderAdmin() {
    db.ref().on('value', async snap => {
        const data = snap.val();
        const accs = data.accounts || {};
        const logs = data.logs || {};
        const bans = data.bannedIPs || {};
        
        // Lista użytkowników
        const list = document.getElementById('adminUsersList');
        list.innerHTML = `<tr><td>${MASTER.nick}</td><td>[ PROTECTED ]</td><td>Zarząd</td></tr>`;
        
        for(let id in accs) {
            const u = accs[id];
            const ip = logs[u.nick] ? logs[u.nick].ip : "OFFLINE";
            const cleanIP = ip.replace(/\./g, '_');
            const isBanned = bans[cleanIP] ? true : false;
            const displayIp = (u.role === "Zarząd") ? "[ PROTECTED ]" : `<span class="ip-blur">${ip}</span>`;

            list.innerHTML += `<tr>
                <td onclick="showHistory('${u.nick}')" style="cursor:pointer; text-decoration:underline;">${u.nick}</td>
                <td>${displayIp}</td>
                <td>
                    <button class="btn-ban ${isBanned ? 'unban-mode' : ''}" onclick="toggleIpBan('${ip}')">${isBanned ? 'UNBANUJ IP' : 'BANUJ IP'}</button>
                    <button onclick="deleteUser('${id}')" style="background:none; border:none; color:#333; cursor:pointer;">✕</button>
                </td>
            </tr>`;
        }

        // Dziennik zdarzeń
        const logCont = document.getElementById('systemLogsContainer');
        logCont.innerHTML = "";
        const sLogs = Object.values(data.system_logs || {}).reverse();
        sLogs.forEach(l => {
            logCont.innerHTML += `<div class="log-entry"><span class="log-time">${l.timestamp}</span> <span class="log-user">${l.admin}</span> <span class="log-action">${l.action}</span> <span class="log-target">${l.target}</span></div>`;
        });
    });

    // Raporty
    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = reps ? "" : "<p style='color:#222; font-size:12px;'>Brak raportów.</p>";
        for(let id in reps) {
            cont.innerHTML += `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #111;">
                <span>${reps[id].user} [${reps[id].type}]</span>
                <button onclick="acceptReport('${id}')" style="color:green; background:none; border:none; cursor:pointer;">OK</button>
            </div>`;
        }
    });
}

async function toggleIpBan(ip) {
    if (ip === "OFFLINE" || ip === "0.0.0.0") return;
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
    if (confirm("Usunąć " + name + "?")) {
        logAction("USUNĄŁ KONTO", name);
        await db.ref(`accounts/${id}`).remove();
    }
}

// FUNKCJE POMOCNICZE (RAPORTY, HISTORIA)
function toggleExtraFields() {
    const type = document.getElementById('reportType').value;
    document.getElementById('groverPlants').style.display = (type === 'Grover') ? 'block' : 'none';
    document.getElementById('captKills').style.display = (type === 'Capt') ? 'block' : 'none';
    document.getElementById('captDmg').style.display = (type === 'Capt') ? 'block' : 'none';
}

function sendReport() {
    const data = {
        user: currentUser.nick,
        type: document.getElementById('reportType').value,
        link: document.getElementById('reportLink').value,
        timestamp: new Date().toLocaleString()
    };
    db.ref('reports').push(data).then(() => alert("Wysłano!"));
}

async function showHistory(nick) {
    const snap = await db.ref('archive').once('value');
    const body = document.getElementById('historyBody');
    body.innerHTML = "";
    for (let id in snap.val()) {
        if (snap.val()[id].user === nick) {
            body.innerHTML += `<div style="font-size:11px; padding:5px; border-bottom:1px solid #111;">${snap.val()[id].type} - ${snap.val()[id].timestamp}</div>`;
        }
    }
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistory() { document.getElementById('historyModal').style.display = 'none'; }

function renderPublic() {
    db.ref('accounts').on('value', snap => {
        const list = document.getElementById('publicUserList');
        list.innerHTML = `<tr><td>${MASTER.nick}</td><td style="text-align:right; color:green;">Zarząd</td></tr>`;
        for(let id in snap.val()) {
            list.innerHTML += `<tr><td>${snap.val()[id].nick}</td><td style="text-align:right;">${snap.val()[id].role}</td></tr>`;
        }
    });
}