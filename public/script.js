let currentUser = null;

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
            const grover = document.getElementById('grover-fields');
            const capt = document.getElementById('capt-fields');
            if (grover) grover.style.display = val === 'grover' ? 'block' : 'none';
            if (capt) capt.style.display = val === 'capt' ? 'block' : 'none';
        });
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) await fetchUserInfo();
            
            const type = document.getElementById('contract-type').value;
            const imgur = document.getElementById('imgur-link').value.trim();
            const senderName = currentUser ? currentUser.username : "Nieznany";

            let payout = 10000;
            let desc = type.toUpperCase();
            if (type === 'grover') {
                const count = document.getElementById('krzaki-count').value;
                payout = count * 1000;
                desc = `GROVER (${count} szt.)`;
            } else if (type === 'capt') {
                const k = document.getElementById('kille-count').value;
                const d = document.getElementById('dmg-count').value;
                payout = 2500 + (k * 1000) + (d * 10);
                desc = `CAPT (K: ${k}, D: ${d})`;
            }

            const now = new Date();
            const timestamp = now.toLocaleString('pl-PL');
            
            // Wysyłka na Discord
            fetch('/api/webhook', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    embeds: [{
                        title: "📩 NOWY RAPORT DO ROZPATRZENIA",
                        color: 16766720,
                        fields: [
                            { name: "Wysłał", value: senderName, inline: true },
                            { name: "Typ", value: desc, inline: true },
                            { name: "Kwota", value: `${payout}$`, inline: true }
                        ],
                        footer: { text: `Panel Wyplat | ${timestamp}` }
                    }]
                })
            });

            // Zapis lokalny
            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({ 
                username: senderName, 
                type: desc, 
                payout: payout, 
                imgur: imgur, 
                date: timestamp, 
                rawDate: now.toISOString() 
            });
            localStorage.setItem('admin_reports', JSON.stringify(reports));
            
            alert("Raport wysłany!");
            reportForm.reset();
            loadData();
        });
    }
});

async function fetchUserInfo() {
    try {
        const res = await fetch('/api/me');
        currentUser = await res.json();
        if (!currentUser.error) {
            const nameEl = document.getElementById('user-name');
            const avatarEl = document.getElementById('user-avatar');
            const roleEl = document.getElementById('user-role-text');
            
            if (nameEl) nameEl.innerText = currentUser.username;
            if (avatarEl) avatarEl.src = currentUser.avatar || 'logo.jpg';
            if (roleEl) roleEl.innerText = `Ranga: ${currentUser.roleName || '-'}`;
        }
    } catch (e) { console.error("Błąd profilu:", e); }
}

async function loadData() {
    // 1. Zawsze najpierw ładuj raporty (niezależnie od wszystkiego)
    renderAdminReports();
    
    // 2. Statystyki użytkownika
    if (currentUser) {
        updateUserStats(currentUser.username);
    }

    // 3. Lista członków
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
                        <span class="member-rank">${m.rankName}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error("Błąd członków:", e); }
}

function renderAdminReports() {
    const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    const adminList = document.getElementById('admin-list');
    if (!adminList) return;

    if (reports.length === 0) {
        adminList.innerHTML = '<p style="text-align:center; color:#444; padding:20px;">Brak raportów</p>';
        return;
    }

    adminList.innerHTML = reports.map((r, i) => `
        <div class="admin-report-card">
            <div class="report-details">
                <strong>OD: ${r.username || 'Anonim'}</strong><br>
                <span>${r.type}</span><br>
                <small>${r.payout}$ | ${r.date}</small>
            </div>
            <div class="report-actions">
                <button onclick="acceptReport(${i})" class="btn-action btn-accept">AKCEPTUJ</button>
                <a href="${r.imgur}" target="_blank" class="btn-action btn-imgur">IMGUR</a>
                <button onclick="rejectReport(${i})" class="btn-action btn-delete">ODRZUĆ</button>
            </div>
        </div>
    `).join('');
}

function updateUserStats(currentUsername) {
    const allReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    const userReports = allReports.filter(r => r.username === currentUsername);

    // Licznik raportów z 7 dni
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyCount = userReports.filter(r => new Date(r.rawDate) >= sevenDaysAgo).length;

    // Suma wypłat
    const total = userReports.reduce((sum, r) => sum + parseInt(r.payout), 0);

    const countEl = document.getElementById('reports-count');
    const totalEl = document.getElementById('payout-total');
    if (countEl) countEl.innerText = weeklyCount;
    if (totalEl) totalEl.innerText = `${total}$`;

    // Aktywność
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
}

async function acceptReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    const res = await fetch('/api/send-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    if (res.ok) {
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        loadData();
    }
}

async function rejectReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    const res = await fetch('/api/reject-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    if (res.ok) {
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        loadData();
    }
}