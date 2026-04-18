import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
let currentAdminReports = [];
let isProcessing = false;

// Funkcja do ładnych powiadomień
function showToast(message, type = 'default') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. LOGOWANIE
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = () => { window.location.href = '/api/login'; };
    }

    // 2. SESJA
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        await fetchUserInfo();
        loadData();
    }

    // 3. ZAKŁADKI (Z animacją pojawiania)
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => {
                c.style.display = 'none';
                c.classList.remove('fade-in');
            });
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            target.style.display = 'block';
            // Wymuszenie reflow dla restartu animacji CSS
            void target.offsetWidth; 
            target.classList.add('fade-in');
        };
    });

    // 4. PRZEŁĄCZANIE PÓL FORMULARZA
    const contractSelect = document.getElementById('contract-type');
    if (contractSelect) {
        contractSelect.onchange = (e) => {
            const val = e.target.value;
            const grover = document.getElementById('grover-fields');
            const capt = document.getElementById('capt-fields');
            
            grover.style.display = val === 'grover' ? 'block' : 'none';
            capt.style.display = val === 'capt' ? 'block' : 'none';
        };
    }

    // 5. WYSYŁANIE RAPORTU
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.onsubmit = async (e) => {
            e.preventDefault();
            if (isProcessing) return;

            const imgur = document.getElementById('imgur-link').value;
            if (!imgur) return showToast("Podaj link do dowodu!", "error");

            isProcessing = true;
            const type = document.getElementById('contract-type').value;
            let desc = type.charAt(0).toUpperCase() + type.slice(1);
            let payout = 10000;

            if (type === 'grover') {
                const count = parseInt(document.getElementById('krzaki-count').value) || 0;
                desc = `Grover (${count} krzaków)`;
                payout = count * 1000;
            } else if (type === 'capt') {
                const k = parseInt(document.getElementById('kille-count').value) || 0;
                const d = parseInt(document.getElementById('dmg-count').value) || 0;
                desc = `Capt (${k}K / ${d}D)`;
                payout = 2500 + (k * 1000) + (d * 10);
            }

            const reportData = {
                username: currentUser?.username || "Nieznany",
                type: desc,
                payout: payout,
                imgur: imgur,
                timestamp: Date.now(),
                date: new Date().toLocaleString('pl-PL')
            };

            try {
                await set(push(ref(db, 'reports')), reportData);
                await fetch('/api/new-report', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(reportData)
                });
                showToast("Raport został pomyślnie wysłany!", "success");
                reportForm.reset();
                document.getElementById('grover-fields').style.display = 'none';
                document.getElementById('capt-fields').style.display = 'none';
            } catch (err) {
                showToast("Wystąpił błąd podczas wysyłania: " + err.message, "error");
            } finally {
                isProcessing = false;
            }
        };
    }
});

async function fetchUserInfo() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('user-name').innerText = currentUser.username;
            document.getElementById('user-avatar').src = currentUser.avatar || 'logo.jpg';
            document.getElementById('user-role-text').innerText = `Ranga: ${currentUser.roleName || '-'}`;
            if (currentUser.roleLevel < 11) {
                const adminTab = document.querySelector('.tab-btn[data-tab="admin"]');
                if (adminTab) adminTab.remove();
            }
        }
    } catch (e) { console.error("UserInfo Error:", e); }
}

async function loadData() {
    // Ładowanie członków
    try {
        const res = await fetch('/api/members');
        const m = await res.json();
        const list = document.getElementById('members-list');
        if (list && Array.isArray(m)) {
            list.innerHTML = m.map(user => `
                <div class="member-item">
                    <img src="${user.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
                    <div class="member-info">
                        <span class="member-name">${user.displayName}</span>
                        <span class="member-rank">${user.rankName || 'Członek'}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }

    // Live statystyki z bazy
    onValue(ref(db, 'reports'), (snap) => {
        const data = snap.val();
        let weeklyCount = 0;
        let lastDate = "Brak danych";
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        if (data) {
            const myReports = Object.values(data).filter(r => r.username === currentUser?.username);
            weeklyCount = myReports.filter(r => r.timestamp > weekAgo).length;
            if (myReports.length > 0) {
                myReports.sort((a, b) => b.timestamp - a.timestamp);
                lastDate = myReports[0].date;
            }
        }

        const countEl = document.getElementById('reports-count');
        const lastEl = document.getElementById('last-act-text');
        if (countEl) countEl.innerText = weeklyCount;
        if (lastEl) lastEl.innerText = lastDate;
    });
}