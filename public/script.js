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

document.addEventListener('DOMContentLoaded', async () => {
    // LOGOWANIE
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/api/login';
        });
    }

    // SESJA
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        const ls = document.getElementById('login-screen');
        const ma = document.getElementById('main-app');
        if (ls) ls.style.display = 'none';
        if (ma) ma.style.display = 'block';
        await fetchUserInfo();
        loadData();
    }

    // TABS
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.style.display = 'block';
        });
    });

    // FORM FIELDS
    const contractSelect = document.getElementById('contract-type');
    if (contractSelect) {
        contractSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const groverFields = document.getElementById('grover-fields');
            const captFields = document.getElementById('capt-fields');
            if (groverFields) groverFields.style.display = val === 'grover' ? 'block' : 'none';
            if (captFields) captFields.style.display = val === 'capt' ? 'block' : 'none';
        });
    }

    // SEND REPORT
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isProcessing) return;

            const imgur = document.getElementById('imgur-link').value;
            if (!imgur) return alert("Podaj link do dowodu!");

            isProcessing = true;
            const type = document.getElementById('contract-type').value;
            let payout = 10000;
            let desc = type.charAt(0).toUpperCase() + type.slice(1);

            if (type === 'grover') {
                const count = parseInt(document.getElementById('krzaki-count').value) || 0;
                payout = count * 1000;
                desc = `Grover (${count} krzaków)`;
            } else if (type === 'capt') {
                const k = parseInt(document.getElementById('kille-count').value) || 0;
                const d = parseInt(document.getElementById('dmg-count').value) || 0;
                payout = 2500 + (k * 1000) + (d * 10);
                desc = `Capt (${k}K / ${d}D)`;
            }

            const reportData = {
                username: currentUser ? currentUser.username : "Nieznany",
                type: desc,
                payout: payout,
                imgur: imgur,
                date: new Date().toLocaleString('pl-PL'),
                timestamp: Date.now()
            };

            try {
                await set(push(ref(db, 'reports')), reportData);
                await fetch('/api/new-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reportData)
                });
                alert("Wysłano raport!");
                reportForm.reset();
                loadData();
            } catch (err) {
                alert("Błąd: " + err.message);
            } finally {
                isProcessing = false;
            }
        });
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
                const ab = document.querySelector('.tab-btn[data-tab="admin"]');
                if (ab) ab.remove();
            }
        }
    } catch (e) { console.error(e); }
}

async function loadData() {
    // MEMBERS
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
                        <span class="member-rank">${user.rankName || ''}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }

    // WEEKLY STATS & ADMIN LIST (Live from Firebase)
    onValue(ref(db, 'reports'), (snap) => {
        const data = snap.val();
        let weeklyCount = 0;
        let lastDate = "Brak danych";
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        if (data) {
            // Filtrowanie raportów zalogowanego użytkownika
            const myReports = Object.values(data).filter(r => r.username === currentUser?.username);
            
            // Liczenie tych z ostatniego tygodnia
            weeklyCount = myReports.filter(r => r.timestamp > weekAgo).length;
            
            // Pobranie daty ostatniego raportu
            if (myReports.length > 0) {
                // Sortujemy po timestampie, żeby mieć pewność, że bierzemy najnowszy
                myReports.sort((a, b) => b.timestamp - a.timestamp);
                lastDate = myReports[0].date;
            }
        }

        // Wpisywanie statystyk do panelu
        if (document.getElementById('reports-count')) document.getElementById('reports-count').innerText = weeklyCount;
        if (document.getElementById('last-act-text')) document.getElementById('last-act-text').innerText = lastDate;

        // ADMIN LIST
        const adminList = document.getElementById('admin-list');
        if (adminList) {
            adminList.innerHTML = '';
            currentAdminReports = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    const r = data[key];
                    r.id = key;
                    currentAdminReports.push(r);
                    const card = document.createElement('div');
                    card.className = 'admin-report-card';
                    card.innerHTML = `
                        <div style="flex-grow:1"><strong>${r.username}</strong> - ${r.type}<br><small>${r.payout}$ | ${r.date}</small></div>
                        <div>
                            <button class="v-btn" style="background:#2ecc71; border:none; color:white; padding:5px 10px; cursor:pointer">V</button>
                            <button class="x-btn" style="background:#e74c3c; border:none; color:white; padding:5px 10px; cursor:pointer; margin-left:5px">X</button>
                        </div>`;
                    card.querySelector('.v-btn').onclick = () => handleAdminAction(key, 'accept');
                    card.querySelector('.x-btn').onclick = () => handleAdminAction(key, 'reject');
                    adminList.appendChild(card);
                });
            }
        }
    });
}

async function handleAdminAction(id, action) {
    if (isProcessing) return;
    const report = currentAdminReports.find(r => r.id === id);
    if (!report) return;

    isProcessing = true;
    try {
        const endpoint = action === 'accept' ? '/api/send-webhook' : '/api/reject-webhook';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        if (res.ok) await remove(ref(db, `reports/${id}`));
    } catch (e) { console.error(e); }
    finally { isProcessing = false; }
}