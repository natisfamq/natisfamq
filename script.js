// Konfiguracja Twojego Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDyTpY2vGcvM8Sz6B1TCdDeNUObQ6yZF4o",
  authDomain: "natis-add35.firebaseapp.com",
  databaseURL: "https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "natis-add35",
  storageBucket: "natis-add35.firebasestorage.app",
  messagingSenderId: "383875422865",
  appId: "1:383875422865:web:c142a191607606e01a28d0"
};

// Start Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const MASTER = { nick: "Szef", pass: "SZEF2026" };
let currentUser = { nick: "", ip: "0.0.0.0", role: "USER" };

// Pobierz IP użytkownika przy starcie
fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => currentUser.ip = data.ip)
    .catch(() => currentUser.ip = "Unknown");

async function login() {
    const userInp = document.getElementById('userName').value;
    const passInp = document.getElementById('userPass').value;
    const errDisplay = document.getElementById('loginError');

    if(!userInp || !passInp) return alert("Wpisz nick i hasło!");

    try {
        // 1. Sprawdź BAN IP
        const safeIp = currentUser.ip.replace(/\./g, '_');
        const banSnap = await db.ref('bans/' + safeIp).once('value');
        if(banSnap.exists()) {
            errDisplay.innerText = "TWOJE IP JEST ZBANOWANE!";
            return;
        }

        // 2. Logika Szefa (Mastera)
        if (userInp === MASTER.nick && passInp === MASTER.pass) {
            setupApp(MASTER.nick, "ADMIN");
            return;
        }

        // 3. Logika bazy danych (Użytkownicy)
        db.ref('accounts').once('value', snapshot => {
            const accounts = snapshot.val();
            let found = null;
            if(accounts) {
                for(let id in accounts) {
                    if(accounts[id].nick === userInp && accounts[id].pass === passInp) {
                        found = accounts[id];
                        break;
                    }
                }
            }

            if(found) {
                setupApp(found.nick, found.role);
            } else {
                errDisplay.innerText = "Błędny nick lub hasło!";
            }
        });

    } catch (e) {
        console.error(e);
        alert("Błąd połączenia z bazą!");
    }
}

function setupApp(nick, role) {
    currentUser.nick = nick;
    currentUser.role = role;
    
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    
    if(role === "ADMIN") {
        document.getElementById('adminTab').style.display = 'block';
    }

    // Zapisz log aktywności
    db.ref('logs/' + nick).set({
        ip: currentUser.ip,
        last: new Date().toLocaleString()
    });

    switchTab('tab-aktywnosc');
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'tab-admin') renderAdmin();
    if(id === 'tab-pracownicy') renderPublic();
}

function sendReport() {
    const link = document.getElementById('reportLink').value;
    if(!link.toLowerCase().includes("imgur.com")) return alert("Akceptujemy tylko linki z imgur.com!");

    db.ref('reports').push({
        user: currentUser.nick,
        type: document.getElementById('reportType').value,
        link: link
    });

    alert("Raport wysłany!");
    document.getElementById('reportLink').value = "";
}

function createUser() {
    const nick = document.getElementById('newUserName').value;
    const pass = document.getElementById('newUserPass').value;
    const role = document.getElementById('newUserRole').value;

    if(!nick || !pass) return alert("Podaj nick i hasło!");

    db.ref('accounts').push({ nick, pass, role });
    alert("Konto stworzone w chmurze!");
    
    document.getElementById('newUserName').value = "";
    document.getElementById('newUserPass').value = "";
}

function renderAdmin() {
    // Raporty
    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const container = document.getElementById('adminReportsContainer');
        container.innerHTML = reps ? "" : "Brak raportów.";
        for(let id in reps) {
            container.innerHTML += `
                <div class="glass-card" style="margin-bottom:10px; display:flex; justify-content:space-between;">
                    <span>${reps[id].user}: ${reps[id].type}</span>
                    <div>
                        <a href="${reps[id].link}" target="_blank" style="color:#f39c12; margin-right:10px;">LINK</a>
                        <button onclick="db.ref('reports/${id}').remove()" style="cursor:pointer;">USUŃ</button>
                    </div>
                </div>`;
        }
    });

    // Konta i IP
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = "";
        for(let nick in logs) {
            const ip = logs[nick].ip;
            list.innerHTML += `
                <tr>
                    <td>${nick}</td>
                    <td><span class="ip-blur">${ip}</span></td>
                    <td><button onclick="db.ref('bans/${ip.replace(/\./g, '_')}').set(true)">BAN IP</button></td>
                </tr>`;
        }
    });
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