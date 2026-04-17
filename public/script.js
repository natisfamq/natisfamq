document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    document.getElementById('login-btn').addEventListener('click', () => window.location.href = '/api/login');

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';
        });
    });

    document.getElementById('contract-type').addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('grover-fields').style.display = val === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = val === 'capt' ? 'block' : 'none';
    });

    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('contract-type').value;
        let imgur = document.getElementById('imgur-link').value.trim();
        
        const meResponse = await fetch('/api/me');
        const me = await meResponse.json();
        const senderName = me.username || "Nieznany";

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
        const isoDate = now.toISOString(); // Potrzebne do łatwego filtrowania dat
        
        await fetch('/api/webhook', {
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

        let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        reports.unshift({ username: senderName, type: desc, payout, imgur, date: timestamp, rawDate: isoDate });
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        
        alert("Raport został wysłany!");
        document.getElementById('report-form').reset();
        loadData();
    });
});

async function loadData() {
    const meRes = await fetch('/api/me');
    const me = await meRes.json();
    
    if (!me.error) {
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-avatar').src = me.avatar || 'logo.jpg';
        document.getElementById('user-role-text').innerText = `Ranga: ${me.roleName || '-'}`;
        
        // Obliczanie statystyk i aktywności dla zalogowanego użytkownika
        updateUserStats(me.username);
    }

    const members = await (await fetch('/api/members')).json();
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="member-item">
            <img src="${m.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
            <div class="member-info">
                <span class="member-name">${m.displayName}</span>
                <span class="member-rank">${m.rankName}</span>
            </div>
        </div>
    `).join('');

    const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    document.getElementById('admin-list').innerHTML = reports.map((r, i) => `
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

    // 1. Raporty w tym tygodniu (ostatnie 7 dni)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyReports = userReports.filter(r => {
        const reportDate = r.rawDate ? new Date(r.rawDate) : new Date();
        return reportDate >= sevenDaysAgo;
    });

    // 2. Suma wypłat
    const totalPayout = userReports.reduce((sum, r) => sum + parseInt(r.payout), 0);

    // Aktualizacja w DOM
    document.getElementById('reports-count').innerText = weeklyReports.length;
    document.getElementById('payout-total').innerText = `${totalPayout}$`;

    // 3. Ostatnia aktywność (max 3 ostatnie)
    const recentList = userReports.slice(0, 3);
    const activityContainer = document.getElementById('recent-activity-list');
    
    if (recentList.length === 0) {
        activityContainer.innerHTML = '<p style="color:#444; font-size:0.8rem;">Brak niedawnej aktywności</p>';
    } else {
        activityContainer.innerHTML = recentList.map(r => `
            <div class="activity-item">
                <span class="activity-desc">Wysłano raport: <strong>${r.type}</strong></span>
                <span class="activity-date">${r.date}</span>
            </div>
        `).join('');
    }
}

async function acceptReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    const response = await fetch('/api/send-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    if (response.ok) {
        alert("Zaakceptowano!");
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        loadData();
    }
}

async function rejectReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    const response = await fetch('/api/reject-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });
    if (response.ok) {
        alert("Odrzucono!");
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        loadData();
    }
}