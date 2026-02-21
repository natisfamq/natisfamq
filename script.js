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
    const userInp = document.getElementById('userName').value;
    const passInp = document.getElementById('userPass').value;
    
    if (userInp === MASTER.nick && passInp === MASTER.pass) {
        setupSession(MASTER.nick, "ADMIN");
        return;
    }

    db.ref('accounts').once('value', snapshot => {
        const accounts = snapshot.val();
        let found = null;
        for(let id in accounts) {
            if(accounts[id].nick === userInp && accounts[id].pass === passInp) {
                found = accounts[id];
                break;
            }
        }
        if(found) setupSession(found.nick, found.role);
        else alert("ACCESS DENIED");
    });
}

function setupSession(nick, role) {
    currentUser.nick = nick;
    currentUser.role = role;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPanel').style.display = 'block';
    if(role === "ADMIN") document.getElementById('adminTab').style.display = 'block';
    
    db.ref('logs/' + nick).set({ 
        ip: currentUser.ip, 
        role: role, // Zapisujemy rolę, by wiedzieć kogo IP ukryć
        last: new Date().toLocaleString() 
    });
    switchTab('tab-aktywnosc');
}

function renderAdmin() {
    // Sekcja Bezpieczeństwa - UKRYWANIE IP ADMINÓW
    db.ref('logs').on('value', snap => {
        const logs = snap.val();
        const list = document.getElementById('adminUsersList');
        list.innerHTML = "";
        for(let nick in logs) {
            const isOtherAdmin = (logs[nick].role === 'ADMIN' || nick === MASTER.nick);
            // Jeśli to Admin, wyświetl "HIDDEN", jeśli Member, wyświetl IP
            const displayIp = isOtherAdmin ? '<span class="admin-only-text">PROTECTED</span>' : `<span class="ip-blur">${logs[nick].ip}</span>`;
            const actionBtn = isOtherAdmin ? '' : `<button onclick="db.ref('bans/${logs[nick].ip.replace(/\./g, '_')}').set(true)">BAN</button>`;

            list.innerHTML += `
                <tr>
                    <td>${nick}</td>
                    <td>${displayIp}</td>
                    <td>${actionBtn}</td>
                </tr>`;
        }
    });
    
    // Reszta renderowania (raporty) pozostaje jak wcześniej
    db.ref('reports').on('value', snap => {
        const reps = snap.val();
        const cont = document.getElementById('adminReportsContainer');
        cont.innerHTML = "";
        for(let id in reps) {
            cont.innerHTML += `<div class="glass-card" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${reps[id].user}</span>
                <button onclick="db.ref('reports/${id}').remove()">DELETE</button>
            </div>`;
        }
    });
}

// Funkcje pomocnicze (switchTab, createUser, sendReport) pozostają bez zmian
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    if(id === 'tab-admin') renderAdmin();
    if(id === 'tab-pracownicy') renderPublic();
}

function createUser() {
    const nick = document.getElementById('newUserName').value;
    const pass = document.getElementById('newUserPass').value;
    const role = document.getElementById('newUserRole').value;
    db.ref('accounts').push({ nick, pass, role });
    alert("ACCOUNT CREATED");
}

function sendReport() {
    const link = document.getElementById('reportLink').value;
    if(!link.includes("imgur.com")) return alert("IMGUR ONLY");
    db.ref('reports').push({ user: currentUser.nick, type: document.getElementById('reportType').value, link: link });
    alert("DATA SENT");
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