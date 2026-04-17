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

    const typeSelect = document.getElementById('contract-type');
    typeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('grover-fields').style.display = val === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = val === 'capt' ? 'block' : 'none';
    });

    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('contract-type').value;
        let imgur = document.getElementById('imgur-link').value.trim();
        const me = await (await fetch('/api/me')).json();

        if (imgur && !imgur.startsWith('http')) imgur = 'https://' + imgur;

        let payout = 0;
        let desc = type.toUpperCase();
        let logDesc = type.charAt(0).toUpperCase() + type.slice(1);

        if (type === 'paczki' || type === 'cenna') payout = 10000;
        else if (type === 'grover') {
            const count = document.getElementById('krzaki-count').value;
            payout = count * 1000;
            desc = `GROVER (${count} szt.)`;
        } else if (type === 'capt') {
            const kille = document.getElementById('kille-count').value;
            const dmg = document.getElementById('dmg-count').value;
            payout = 2500 + (kille * 1000) + (dmg * 10);
            desc = `CAPT (K: ${kille}, D: ${dmg})`;
            logDesc = "Capt";
        }

        const timestamp = new Date().toLocaleString('pl-PL');

        const discordPayload = {
            embeds: [{
                title: "📩 NOWY RAPORT",
                color: 16766720,
                fields: [
                    { name: "Gracz", value: me.username, inline: true },
                    { name: "Typ", value: logDesc, inline: true },
                    { name: "Kwota", value: `${payout}$`, inline: true },
                    { name: "Akcja", value: `👀 [SPRAWDŹ RAPORTY](${window.location.origin})`, inline: false }
                ],
                thumbnail: { url: `${window.location.origin}/logo.jpg` }, // Logo w logu
                footer: { text: `Panel Wyplat | ${timestamp}` }
            }]
        };

        await fetch('/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload)
        });

        let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        reports.unshift({ username: me.username, type: desc, payout: payout, imgur: imgur, date: timestamp });
        localStorage.setItem('admin_reports', JSON.stringify(reports));

        alert("Raport wysłany!");
        e.target.reset();
        loadData();
    });
});

async function loadData() {
    const me = await (await fetch('/api/me')).json();
    if (!me.error) {
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-avatar').src = me.avatar || 'logo.jpg'; // Logo jako fallback
    }

    const members = await (await fetch('/api/members')).json();
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="list-item">
            <img src="${m.avatar}" class="mini-avatar" onerror="this.src='logo.jpg'">
            <span>${m.displayName}</span>
        </div>
    `).join('');

    const adminReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    document.getElementById('admin-list').innerHTML = adminReports.map((r, i) => `
        <div class="admin-report-card">
            <div><strong>${r.username}</strong> - ${r.type}<br><small>${r.payout}$ | ${r.date}</small></div>
            <div>
                <a href="${r.imgur}" target="_blank" class="btn">IMGUR</a>
                <button onclick="processReport(${i}, 'AKCEPTACJA')">TAK</button>
                <button onclick="processReport(${i}, 'ODRZUCENIE')">NIE</button>
            </div>
        </div>
    `).join('');
}

async function processReport(index, actionType) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    const me = await (await fetch('/api/me')).json();

    const isAccept = actionType === 'AKCEPTACJA';
    const timestamp = new Date().toLocaleString('pl-PL');

    const discordPayload = {
        embeds: [{
            title: `⚖️ RAPORT ${actionType}`,
            color: isAccept ? 3066993 : 15158332, // Zielony vs Czerwony
            fields: [
                { name: "Gracz", value: r.username, inline: true },
                { name: "Kwota", value: `${r.payout}$`, inline: true },
                { name: "Weryfikator", value: me.username, inline: true }
            ],
            thumbnail: { url: `${window.location.origin}/logo.jpg` }, // Logo w logu
            footer: { text: `Panel Wyplat | ${timestamp}` }
        }]
    };

    await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
    });

    reports.splice(index, 1);
    localStorage.setItem('admin_reports', JSON.stringify(reports));
    loadData();
}