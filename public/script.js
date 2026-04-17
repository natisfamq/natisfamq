// Importy Firebase z CDN (nie musisz nic instalować przez npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Twoja konfiguracja Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDyTpY2vGcvM8Sz5B1TCdDeNUObQ6yZF4o",
    authDomain: "natis-add35.firebaseapp.com",
    databaseURL: "https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "natis-add35",
    storageBucket: "natis-add35.firebasestorage.app",
    messagingSenderId: "303875422065",
    appId: "1:303875422065:web:c142a191607606e01a28d0"
};

// Inicjalizacja
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentUser = null;
let currentAdminReports = [];

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        await fetchUserInfo();
        loadData();
    }

    // Obsługa zakładek
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

    // Przełączanie pól Grover/Capt
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

    // WYSYŁANIE RAPORTU DO FIREBASE
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

            if (type === 'grover') {
                krzaki = parseInt(document.getElementById('krzaki-count').value) || 0;
                payout = krzaki * 200;
                desc = `Grover (${krzaki} krzaków)`;
            } else if (type === 'capt') {
                kille = parseInt(document.getElementById('kille-count').value) || 0;
                const dmg = parseInt(document.getElementById('dmg-count').value) || 0;
                payout = (kille * 1000) + (dmg * 1);
                desc = `Capt (${kille} K / ${dmg} D)`;
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

            // ZAPIS LOKALNY (dla Twojego panelu)
            let userReports = JSON.parse(localStorage.getItem('user_reports') || '[]');
            userReports.unshift(reportData);
            localStorage.setItem('user_reports', JSON.stringify(userReports));

            // ZAPIS DO FIREBASE (dla Admina)
            try {
                const reportsRef = ref(db, 'reports');
                const newReportRef = push(reportsRef);
                await set(newReportRef, reportData);
                
                alert("Raport wysłany do Firebase!");
                reportForm.reset();
                loadData();
            } catch (err) {
                console.error(err);
                alert("Błąd zapisu w Firebase: " + err.message);
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
    } catch (e) { console.error("Błąd pobierania użytkownika", e); }
}

async function loadData() {
    // 1. CZŁONKOWIE (Z FIXEM NA RANGI)
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
    } catch (e) { console.error("Błąd członków", e); }

    // 2. PRYWATNE STATYSTYKI
    let userReports = JSON.parse(localStorage.getItem('user_reports') || '[]');
    let totalKrzaki = 0, totalKille = 0, totalPayout = 0;

    userReports.forEach(r => {
        totalKrzaki += (r.krzaki || 0);
        totalKille += (r.kille || 0);
        totalPayout += (r.payout || 0);
    });

    document.getElementById('total-krzaki').innerText = totalKrzaki;
    document.getElementById('total-kille').innerText = totalKille;
    document.getElementById('total-payout').innerText = `${totalPayout}$`;

    const activityEl = document.getElementById('recent-activity-list');
    if (activityEl) {
        const recent = userReports.slice(0, 3);
        activityEl.innerHTML = recent.length ? recent.map(r => `
            <div class="activity-item">
                <span class="activity-desc">Wysłano: <strong>${r.type}</strong></span>
                <span class="activity-date">${r.date}</span>
            </div>
        `).join('') : '<p style="font-size:0.7rem; color:#444;">Brak aktywności</p>';
    }

    // 3. RAPORTY ADMINA (FIREBASE REAL-TIME)
    const adminList = document.getElementById('admin-list');
    if (adminList) {
        const reportsRef = ref(db, 'reports');
        // onValue sprawia, że lista odświeża się sama, gdy coś dojdzie do bazy
        onValue(reportsRef, (snapshot) => {
            const data = snapshot.val();
            adminList.innerHTML = '';
            currentAdminReports = [];

            if (!data) {
                adminList.innerHTML = '<p style="text-align:center; padding:20px;">Brak raportów w Firebase.</p>';
                return;
            }

            Object.keys(data).forEach(key => {
                const r = data[key];
                r.firebaseId = key; // Zapisujemy klucz do usuwania
                currentAdminReports.push(r);

                const card = document.createElement('div');
                card.className = 'admin-report-card';
                card.innerHTML = `
                    <div>
                        <strong>${r.username} - ${r.type}</strong><br>
                        <small>${r.payout}$ | ${r.date}</small>
                    </div>
                    <div>
                        <a href="${r.imgur}" target="_blank" class="btn-submit" style="padding: 5px 10px; text-decoration: none;">IMGUR</a>
                        <button onclick="handleReport('${key}', 'accept')" class="btn-submit" style="padding: 5px 10px; margin-left:5px; background: #2ecc71;">V</button>
                        <button onclick="handleReport('${key}', 'reject')" class="btn-submit" style="padding: 5px 10px; margin-left:5px; background: #e74c3c;">X</button>
                    </div>
                `;
                adminList.appendChild(card);
            });
        });
    }
}

// Globalna funkcja do obsługi przycisków Admina
window.handleReport = async function(firebaseId, action) {
    const report = currentAdminReports.find(r => r.firebaseId === firebaseId);
    if (!report) return;

    const endpoint = action === 'accept' ? '/api/send-webhook' : '/api/reject-webhook';
    
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });

        if (res.ok) {
            // USUWANIE Z FIREBASE PO KLIKNIĘCIU
            await remove(ref(db, `reports/${firebaseId}`));
            alert(action === 'accept' ? "Zaakceptowano!" : "Odrzucono!");
        }
    } catch (err) {
        console.error("Błąd webhooka", err);
    }
};