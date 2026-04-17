import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// TWOJA KONFIGURACJA FIREBASE
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

document.addEventListener('DOMContentLoaded', async () => {
    // NAPRAWA LOGOWANIA - TO ROZWIĄZUJE TWÓJ PROBLEM
    document.addEventListener('DOMContentLoaded', async () => {
    // TO NAPRAWIA LOGOWANIE:
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log("Przekierowuję do logowania...");
            window.location.href = '/api/login';
        });
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        await fetchUserInfo();
        loadData();
    }

    // OBSŁUGA ZAKŁADEK
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

    // POKAZYWANIE PÓL (GROVER/CAPT)
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

    // WYSYŁANIE RAPORTU
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('contract-type').value;
            const imgur = document.getElementById('imgur-link').value;
            
            if (!imgur) return alert("Podaj link do dowodu!");

            let payout = 0;
            let desc = "";
            let krzaki = 0;
            let kille = 0;
            let dmg = 0;

            if (type === 'grover') {
                krzaki = parseInt(document.getElementById('krzaki-count').value) || 0;
                payout = krzaki * 1000;
                desc = `Grover (${krzaki} krzaków)`;
            } else if (type === 'capt') {
                kille = parseInt(document.getElementById('kille-count').value) || 0;
                dmg = parseInt(document.getElementById('dmg-count').value) || 0;
                payout = 2500 + (kille * 1000) + (dmg * 10);
                desc = `Capt (${kille} K / ${dmg} D)`;
            } else if (type === 'paczki' || type === 'cenna') {
                payout = 10000;
                desc = type.charAt(0).toUpperCase() + type.slice(1);
            }

            const reportData = {
                username: currentUser ? currentUser.username : "Nieznany",
                type: desc,
                payout: payout,
                imgur: imgur,
                date: new Date().toLocaleString('pl-PL'),
                timestamp: Date.now(),
                krzaki: krzaki,
                kille: kille
            };

            // Zapis lokalny dla Twoich statystyk
            let userReports = JSON.parse(localStorage.getItem('user_reports') || '[]');
            userReports.unshift(reportData);
            localStorage.setItem('user_reports', JSON.stringify(userReports));

            // Zapis do Firebase dla Admina
            try {
                const reportsRef = ref(db, 'reports');
                const newReportRef = push(reportsRef);
                await set(newReportRef, reportData);
                
                alert("Raport wysłany do Firebase!");
                reportForm.reset();
                loadData();
            } catch (err) {
                console.error(err);
                alert("Błąd zapisu do Firebase!");
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
                const adminBtn = document.querySelector('.tab-btn[data-tab="admin"]');
                if (adminBtn) adminBtn.remove();
            }
        }
    } catch (e) { console.error(e); }
}

async function loadData() {
    // Ładowanie członków (FIX rang)
    try {
        const res = await fetch('/api/members');
        const members = await res.json();
        const list = document.getElementById('members-list');
        if (list && Array.isArray(members)) {
            list.innerHTML = members.map(m => `
                <div class="member-item">
                    <img src="${m.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
                    <div class="member-info">
                        <span class="member-name">${m.displayName}</span>
                        <span class="member-rank">${m.rankName || ''}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }

    // Statystyki profilu
    let userReports = JSON.parse(localStorage.getItem('user_reports') || '[]');
    let tKrzaki = 0, tKille = 0, tPayout = 0;
    userReports.forEach(r => {
        tKrzaki += (r.krzaki || 0);
        tKille += (r.kille || 0);
        tPayout += (r.payout || 0);
    });

    if (document.getElementById('total-krzaki')) document.getElementById('total-krzaki').innerText = tKrzaki;
    if (document.getElementById('total-kille')) document.getElementById('total-kille').innerText = tKille;
    if (document.getElementById('total-payout')) document.getElementById('total-payout').innerText = `${tPayout}$`;

    // Lista Admina z Firebase
    const adminList = document.getElementById('admin-list');
    if (adminList) {
        onValue(ref(db, 'reports'), (snapshot) => {
            const data = snapshot.val();
            adminList.innerHTML = '';
            currentAdminReports = [];
            if (!data) return adminList.innerHTML = '<p>Brak raportów.</p>';

            Object.keys(data).forEach(key => {
                const r = data[key];
                r.firebaseId = key;
                currentAdminReports.push(r);
                const card = document.createElement('div');
                card.className = 'admin-report-card';
                card.innerHTML = `
                    <div style="flex-grow:1"><strong>${r.username}</strong> - ${r.type}<br><small>${r.payout}$ | ${r.date}</small></div>
                    <div>
                        <button class="v-btn" style="background:#2ecc71; border:none; color:white; padding:5px; cursor:pointer">V</button>
                        <button class="x-btn" style="background:#e74c3c; border:none; color:white; padding:5px; cursor:pointer">X</button>
                    </div>`;
                card.querySelector('.v-btn').onclick = () => processReport(key, 'accept');
                card.querySelector('.x-btn').onclick = () => processReport(key, 'reject');
                adminList.appendChild(card);
            });
        });
    }
}

async function processReport(id, action) {
    const r = currentAdminReports.find(rep => rep.firebaseId === id);
    const endpoint = action === 'accept' ? '/api/send-webhook' : '/api/reject-webhook';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    if (res.ok) await remove(ref(db, `reports/${id}`));
}