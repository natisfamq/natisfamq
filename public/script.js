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
let isProcessing = false; // Blokada przed podwójnym kliknięciem

document.addEventListener('DOMContentLoaded', async () => {
    // 1. LOGOWANIE
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/api/login';
        });
    }

    // 2. SPRAWDZANIE SESJI
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        await fetchUserInfo();
        loadData();
    }

    // 3. OBSŁUGA ZAKŁADEK
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

    // 4. PRZEŁĄCZANIE PÓL FORMULARZA
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

    // 5. WYSYŁANIE RAPORTU
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isProcessing) return;

            const type = document.getElementById('contract-type').value;
            const imgur = document.getElementById('imgur-link').value;
            if (!imgur) return alert("Podaj link do dowodu!");

            isProcessing = true;
            let payout = 0, desc = "", krzaki = 0, kille = 0, dmg = 0;

            if (type === 'grover') {
                krzaki = parseInt(document.getElementById('krzaki-count').value) || 0;
                payout = krzaki * 1000;
                desc = `Grover (${krzaki} krzaków)`;
            } else if (type === 'capt') {
                kille = parseInt(document.getElementById('kille-count').value) || 0;
                dmg = parseInt(document.getElementById('dmg-count').value) || 0;
                payout = 2500 + (kille * 1000) + (dmg * 10);
                desc = `Capt (${kille} K / ${dmg} D)`;
            } else {
                payout = 10000;
                desc = type === 'paczki' ? "Paczki" : "Cenna";
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
                // Zapis do Firebase
                const reportsRef = ref(db, 'reports');
                const newReportRef = push(reportsRef);
                await set(newReportRef, reportData);

                // WYSYŁKA WEBHOOKA O NOWYM RAPORCIE (Twoje stare zachowanie)
                await fetch('/api/new-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reportData)
                });

                alert("Raport wysłany!");
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
                const adminBtn = document.querySelector('.tab-btn[data-tab="admin"]');
                if (adminBtn) adminBtn.remove();
            }
        }
    } catch (e) { console.error("UserInfo Error:", e); }
}

async function loadData() {
    // Ładowanie listy członków
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
    } catch (e) { console.error("Members Error:", e); }

    // Statystyki i lista Admina (Firebase Live)
    const adminList = document.getElementById('admin-list');
    if (adminList) {
        onValue(ref(db, 'reports'), (snapshot) => {
            const data = snapshot.val();
            adminList.innerHTML = '';
            currentAdminReports = [];
            if (!data) return;

            Object.keys(data).forEach(key => {
                const r = data[key];
                r.id = key;
                currentAdminReports.push(r);
                const card = document.createElement('div');
                card.className = 'admin-report-card';
                card.innerHTML = `
                    <div style="flex-grow:1">
                        <strong>${r.username}</strong> - ${r.type}<br>
                        <small>${r.payout}$ | ${r.date}</small>
                    </div>
                    <div>
                        <a href="${r.imgur}" target="_blank" class="btn-submit" style="padding:5px 10px; text-decoration:none; font-size:0.7rem">IMGUR</a>
                        <button class="v-btn" data-id="${key}" style="background:#2ecc71; border:none; color:white; padding:5px 10px; cursor:pointer; margin-left:5px">V</button>
                        <button class="x-btn" data-id="${key}" style="background:#e74c3c; border:none; color:white; padding:5px 10px; cursor:pointer; margin-left:5px">X</button>
                    </div>`;
                
                card.querySelector('.v-btn').onclick = () => handleAdminAction(key, 'accept');
                card.querySelector('.x-btn').onclick = () => handleAdminAction(key, 'reject');
                adminList.appendChild(card);
            });
        });
    }
}

async function handleAdminAction(id, action) {
    if (isProcessing) return;
    
    const report = currentAdminReports.find(r => r.id === id);
    if (!report) return;

    isProcessing = true;
    const endpoint = action === 'accept' ? '/api/send-webhook' : '/api/reject-webhook';
    
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });

        if (res.ok) {
            // Usuwamy z Firebase tylko jeśli webhook przeszedł
            await remove(ref(db, `reports/${id}`));
        } else {
            alert("Błąd Webhooka!");
        }
    } catch (err) {
        console.error("Admin Action Error:", err);
    } finally {
        isProcessing = false;
    }
}