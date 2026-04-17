let currentUser = null;
let currentAdminReports = []; // Dodana zmienna do trzymania raportów z bazy

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

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', () => window.location.href = '/api/login');

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
                krzaki: krzaki,
                kille: kille
            };

            // ZAPIS LOKALNY: Zostawiamy, żeby Twoje prywatne statystyki działały tak jak wcześniej!
            let userReports = JSON.parse(localStorage.getItem('user_reports') || '[]');
            userReports.unshift(reportData);
            localStorage.setItem('user_reports', JSON.stringify(userReports));

            // ZAPIS DO BAZY (DLA ADMINA): Nowy system wysyłania na serwer
            try {
                const res = await fetch('/api/save-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reportData)
                });

                if (res.ok) {
                    alert("Raport wysłany do Admina!");
                    reportForm.reset();
                    loadData();
                } else {
                    alert("Błąd serwera przy zapisie do bazy.");
                }
            } catch (err) {
                console.error(err);
                alert("Błąd połączenia z API.");
            }
        });
    }
});

async function fetchUserInfo() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            currentUser = await res.json();
            const nameEl = document.getElementById('user-name');
            const avatarEl = document.getElementById('user-avatar');
            const roleEl = document.getElementById('user-role-text');
            
            if (nameEl) nameEl.innerText = currentUser.username;
            if (avatarEl) avatarEl.src = currentUser.avatar || 'logo.jpg';
            if (roleEl) roleEl.innerText = `Ranga: ${currentUser.roleName || '-'}`;

            // Ukrywanie panelu admina wizualnie dla mniejszych rang
            const adminBtn = document.querySelector('.tab-btn[data-tab="admin"]');
            if (adminBtn && currentUser.roleLevel < 11) {
                adminBtn.remove();
            }
        }
    } catch (e) { console.error("Błąd pobierania danych użytkownika:", e); }
}

async function loadData() {
    // 1. Pobieranie członków z Discorda
    try {
        const membersRes = await fetch('/api/members');
        if (membersRes.ok) {
            const members = await membersRes.json();
            const membersList = document.getElementById('members-list');
            if (membersList) {
                membersList.innerHTML = members.map(m => `
                    <div class="member-item">
                        <img src="${m.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
                        <span class="member-name">${m.displayName}</span>
                    </div>
                `).join('');
            }
        }
    } catch (e) { console.error("Błąd członków", e); }

    // 2. Ładowanie prywatnych statystyk (Zostawiamy nienaruszone!)
    let userReports = JSON.parse(localStorage.getItem('user_reports') || '[]');
    
    let totalKrzaki = 0;
    let totalKille = 0;
    let totalPayout = 0;

    userReports.forEach(r => {
        if (r.krzaki) totalKrzaki += r.krzaki;
        if (r.kille) totalKille += r.kille;
        if (r.payout) totalPayout += r.payout;
    });

    const statKrzaki = document.getElementById('total-krzaki');
    const statKille = document.getElementById('total-kille');
    const statPayout = document.getElementById('total-payout');
    
    if (statKrzaki) statKrzaki.innerText = totalKrzaki;
    if (statKille) statKille.innerText = totalKille;
    if (statPayout) statPayout.innerText = `${totalPayout}$`;

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

    // 3. Ładowanie raportów Admina (NOWOŚĆ: Z BAZY DANYCH)
    const adminList = document.getElementById('admin-list');
    if (adminList) {
        try {
            const res = await fetch('/api/get-reports');
            if (res.ok) {
                currentAdminReports = await res.json();
                if (currentAdminReports.length === 0) {
                    adminList.innerHTML = '<p style="text-align:center; padding:20px;">Brak oczekujących raportów.</p>';
                    return;
                }
                adminList.innerHTML = currentAdminReports.map((r) => `
                    <div class="admin-report-card">
                        <div>
                            <strong>${r.username} - ${r.type}</strong><br>
                            <small>${r.payout}$ | ${r.date || 'Brak daty'}</small>
                        </div>
                        <div>
                            <a href="${r.imgur}" target="_blank" class="btn-submit" style="padding: 5px 10px; text-decoration: none;">IMGUR</a>
                            <button onclick="acceptReport('${r.id}')" class="btn-submit" style="padding: 5px 10px; margin-left:5px; background: #2ecc71;">V</button>
                            <button onclick="rejectReport('${r.id}')" class="btn-submit" style="padding: 5px 10px; margin-left:5px; background: #e74c3c;">X</button>
                        </div>
                    </div>
                `).join('');
            } else if (res.status === 403) {
                // Jeśli serwer odrzuci (brak rangi), czyścimy listę
                adminList.innerHTML = '';
            }
        } catch (err) {
            console.error("Błąd pobierania bazy:", err);
        }
    }
}

// Funkcje Admina korzystające z nowego ID z bazy danych
async function acceptReport(id) {
    const r = currentAdminReports.find(rep => rep.id === id);
    if (!r) return;

    const res = await fetch('/api/send-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    
    if (res.ok) {
        alert("Zaakceptowano i wysłano log!");
        loadData();
    }
}

async function rejectReport(id) {
    const r = currentAdminReports.find(rep => rep.id === id);
    if (!r) return;

    const res = await fetch('/api/reject-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    
    if (res.ok) {
        alert("Odrzucono i wysłano log!");
        loadData();
    }
}