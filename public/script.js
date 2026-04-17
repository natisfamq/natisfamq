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
        
        // Pobieranie danych zalogowanego użytkownika
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

        const timestamp = new Date().toLocaleString('pl-PL');
        
        // Powiadomienie o nowym raporcie (oczekującym)
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

        // Zapis do localStorage (z nazwą wysyłającego)
        let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        reports.unshift({ username: senderName, type: desc, payout, imgur, date: timestamp });
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        
        alert("Raport został wysłany do administracji!");
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

async function acceptReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    
    const response = await fetch('/api/send-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });

    if (response.ok) {
        alert("Raport Zaakceptowany!");
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        loadData();
    }
}

async function rejectReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    
    // Wysyłanie logu o odrzuceniu na Discord
    const response = await fetch('/api/reject-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r)
    });

    if (response.ok) {
        alert("Raport Odrzucony!");
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        loadData();
    }
}