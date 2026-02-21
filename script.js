// Konfiguracja Firebase na podstawie Twojego zdjęcia
const firebaseConfig = {
  apiKey: "AIzaSyDyTpY2vGcvM8Sz6B1TCdDeNUObQ6yZF4o",
  authDomain: "natis-add35.firebaseapp.com",
  databaseURL: "https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "natis-add35",
  storageBucket: "natis-add35.firebasestorage.app",
  messagingSenderId: "383875422865",
  appId: "1:383875422865:web:c142a191607606e01a28d0"
};

// Inicjalizacja bibliotek
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Dane stałe
const MASTER = { nick: "Szef", pass: "SZEF2026" };
let currentUser = { nick: "", ip: "0.0.0.0", role: "USER" };

// Pobieranie adresu IP przy starcie
fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => currentUser.ip = data.ip)
    .catch(() => currentUser.ip = "Nieznane");

// --- LOGOWANIE ---
async function login() {
    const userInp = document.getElementById('userName').value;
    const passInp = document.getElementById('userPass').value;
    const err = document.getElementById('loginError');

    // Sprawdzenie blokady IP
    const safeIp = currentUser.ip.replace(/\./g, '_');
    const banCheck = await db.ref('bans/' + safeIp).once('value');
    if (banCheck.exists()) {
        err.innerText = "TWOJE IP JEST ZBANOWANE!";
        return;
    }

    // Logowanie konta MASTER
    if (userInp === MASTER.nick && passInp === MASTER.pass) {
        setupSession(MASTER.nick, "ADMIN");
        return;
    }

    // Sprawdzanie kont w bazie danych
    db.ref('accounts').once('value', snapshot => {
        const accounts = snapshot.val();
        let found = null;
        for (let id in accounts) {
            if (accounts[id].nick === userInp && accounts[id].pass === passInp) {
                found = accounts[id];
                break;
            }
        }

        if (found) {
            setupSession(found.nick, found.role);
        } else {
            err.innerText = "Błędne dane lub konto nie istnieje!";
        }
    });
}

function setupSession(nick, role) {
    currentUser.nick = nick;
    currentUser.role = role;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    
    if (role === "ADMIN") {
        document.getElementById('adminTab').style.display = 'block';
    }

    // Zapisz log logowania w chmurze
    db.ref('logs/' + nick).set({
        ip: currentUser.ip,
        last: new Date().toLocaleString()
    });

    switchTab('tab-aktywnosc');
}

// --- NAWIGACJA ---
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    
    if (id === 'tab-admin') renderAdmin();
    if (id === 'tab-pracownicy') renderPublic();
}

// --- SYSTEM RAPORTÓW ---
function sendReport() {
    const link = document.getElementById('reportLink').value;
    const type = document.getElementById('reportType').value;

    if (!link.toLowerCase().includes("imgur.com")) {
        return alert("BŁĄD: Raport musi zawierać link z serwisu imgur.com!");
    }

    db.ref('reports').push({
        user: currentUser.nick,
        type: type,
        link: link,
        date: new Date().toLocaleString()
    });

    alert("Raport wysłany pomyślnie!");
    document.getElementById('reportLink').value = "";
}

// --- PANEL ADMINA (ZARZĄDZANIE) ---
function renderAdmin() {
    // Odczyt raportów (na żywo)
    db.ref('reports').on('value', snap => {
        const reports = snap.val();
        const container = document.getElementById('adminReportsContainer');
        container.innerHTML = reports ? "" : "<p>Brak oczekujących raportów.</p>";
        
        for (let id in reports) {
            container.innerHTML += `
                <div class="glass-card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span><b>${reports[id].user}</b>: ${reports[id].type}</span>
                    <div>
                        <a href="${reports[id].link}" target="_blank" style="color:#f39c12; margin-right:15px; text-decoration:none; font-weight:bold;">IMGUR</a>
                        <button onclick="db.ref('reports/${id}').remove()" style="background:#2ecc71; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">WYPŁAĆ</button>
                    </div>
                </div>`;
        }
    });

    // Lista użytkowników i IP (z blurem)
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = "";
        
        for (let nick in logs) {
            const ip = logs[nick].ip;
            list.innerHTML += `
                <tr>
                    <td>${nick}</td>
                    <td><span class="ip-blur" tabindex="0">${ip}</span></td>
                    <td>
                        <button onclick="banUser('${ip}')" style="background:#ff4757; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-right:5px;">BAN IP</button>
                        <button onclick="deleteAccount('${nick}')" style="background:rgba(255,255,255,0.1); color:white; border:1px solid red; padding:5px 10px; border-radius:5px; cursor:pointer;">USUŃ</button>
                    </td>
                </tr>`;
        }
    });
}

function createUser() {
    const nick = document.getElementById('newUserName').value;
    const pass = document.getElementById('newUserPass').value;
    const role = document.getElementById('newUserRole').value;

    if (!nick || !pass) return alert("Podaj nick i hasło!");

    db.ref('accounts').push({ nick, pass, role });
    alert("Konto utworzone w bazie danych!");
    document.getElementById('newUserName').value = "";
    document.getElementById('newUserPass').value = "";
}

function banUser(ip) {
    if (ip === currentUser.ip) return alert("Nie możesz zbanować własnego IP!");
    const safeIp = ip.replace(/\./g, '_');
    db.ref('bans/' + safeIp).set(true);
    alert("Adres IP został zablokowany!");
}

async function deleteAccount(nick) {
    if (nick === MASTER.nick) return alert("Nie można usunąć konta Szefa!");
    if (confirm("Czy na pewno chcesz usunąć konto " + nick + "?")) {
        // Usuń z kont
        const snap = await db.ref('accounts').once('value');
        const accounts = snap.val();
        for (let id in accounts) {
            if (accounts[id].nick === nick) {
                db.ref('accounts/' + id).remove();
            }
        }
        // Usuń z logów
        db.ref('logs/' + nick).remove();
        alert("Konto usunięte.");
    }
}

// --- LISTA PUBLICZNA ---
function renderPublic() {
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('publicUserList');
        list.innerHTML = "";
        for (let nick in logs) {
            list.innerHTML += `
                <tr>
                    <td>${nick}</td>
                    <td>Aktywny</td>
                    <td>${logs[nick].last}</td>
                </tr>`;
        }
    });
}