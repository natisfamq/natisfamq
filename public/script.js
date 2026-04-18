import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyTpY2vGcvM8Sz5B1TCdDeNUObQ6yZF4o",
    authDomain: "natis-add35.firebaseapp.com",
    databaseURL: "https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "natis-add35",
    storageBucket: "natis-add35.firebasestorage.app",
    messagingSenderId: "303875422065",
    appId: "1:303875422065:web:c142a191607606e01a28d0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentUser = null;

function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => {
        t.classList.add('fade-out');
        setTimeout(() => t.remove(), 350);
    }, 4000);
}

// Funkcja przełączania ekranów
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sprawdź czy użytkownik jest zalogowany przez API (pewniejsze niż cookie)
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            currentUser = await res.json();
            updateUIWithUser();
            showApp();
            loadMembers();
        } else {
            // Jeśli nie zalogowany, upewnij się że widzi ekran logowania
            document.getElementById('login-screen').style.display = 'flex';
        }
    } catch (e) {
        console.error("Błąd autoryzacji:", e);
    }

    // Obsługa zakładek
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if(target) target.style.display = 'block';
        };
    });

    // Przycisk logowania
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = () => {
            window.location.href = '/api/login';
        };
    }

    // Formularz raportów
    const contractSelect = document.getElementById('contract-type');
    if (contractSelect) {
        contractSelect.onchange = (e) => {
            document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
            document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
        };
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.onsubmit = async (e) => {
            e.preventDefault();
            const imgur = document.getElementById('imgur-link').value;
            if (!imgur) return showToast("Podaj link do dowodu!", "error");

            const reportData = {
                username: currentUser ? currentUser.username : "Nieznany",
                type: document.getElementById('contract-type').value,
                imgur: imgur,
                timestamp: Date.now(),
                date: new Date().toLocaleString('pl-PL')
            };

            try {
                await set(push(ref(db, 'reports')), reportData);
                showToast("Raport wysłany pomyślnie!");
                e.target.reset();
            } catch (err) {
                showToast("Błąd wysyłania!", "error");
            }
        };
    }
});

function updateUIWithUser() {
    if (!currentUser) return;
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');
    const roleEl = document.getElementById('user-role-text');

    if(nameEl) nameEl.innerText = currentUser.username;
    if(avatarEl) avatarEl.src = currentUser.avatar || 'logo.jpg';
    if(roleEl) roleEl.innerText = `Ranga: ${currentUser.roleName || '-'}`;
}

async function loadMembers() {
    try {
        const res = await fetch('/api/members');
        if (res.ok) {
            const m = await res.json();
            const list = document.getElementById('members-list');
            if(list) {
                list.innerHTML = m.map(u => `
                    <div class="member-item">
                        <img src="${u.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
                        <div class="member-info">
                            <span class="member-name">${u.displayName}</span>
                            <span class="member-rank">${u.rankName || 'Członek'}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Błąd ładowania członków", e);
    }
}