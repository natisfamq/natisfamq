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
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Formularz raportu z Webhookiem
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        const me = await (await fetch('/api/me')).json();

        let payout = 0;
        let desc = type.toUpperCase();

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
        }

        const reportData = {
            username: me.username,
            type: desc,
            payout: payout,
            imgur: imgur,
            date: new Date().toLocaleString('pl-PL')
        };

        // WYSYŁKA NA WEBHOOK
        await fetch('/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        // Zapis lokalny dla Admina
        let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        reports.unshift({ ...reportData, banner: me.banner });
        localStorage.setItem('admin_reports', JSON.stringify(reports));

        alert("Raport wysłany!");
        e.target.reset();
        loadData();
    });
});

async function loadData() {
    try {
        const me = await (await fetch('/api/me')).json();
        if (!me.error) {
            document.getElementById('user-name').innerText = me.username;
            document.getElementById('user-avatar').src = me.avatar;
            document.getElementById('user-role-text').innerText = me.roleName;
            
            const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            const myReports = reports.filter(r => r.username === me.username);
            document.getElementById('reports-count').innerText = myReports.length;
            document.getElementById('last-act-text').innerText = myReports[0] ? myReports[0].type : "Brak danych";
            
            if (me.banner) document.querySelector('.user-banner').style.backgroundImage = `url(${me.banner})`;
        }

        const members = await (await fetch('/api/members')).json();
        document.getElementById('members-list').innerHTML = members.map(m => `
            <div class="list-item">
                <div style="display:flex; align-items:center;">
                    <img src="${m.avatar}" class="mini-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                    <span class="member-name">${m.displayName}</span>
                </div>
                <span class="member-rank-label">${m.rankName}</span>
            </div>
        `).join('');

        // Lista Admin
        const adminReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        document.getElementById('admin-list').innerHTML = adminReports.map((r, i) => `
            <div class="admin-report-card">
                <div class="user-banner" style="background-image: url(${r.banner})"></div>
                <div class="report-body">
                    <div><strong>${r.username}</strong> - ${r.type}<br><small>${r.payout}$ | ${r.date}</small></div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-accept" onclick="action(${i},'akcept')">OK</button>
                        <button class="btn btn-reject" onclick="action(${i},'odrzuc')">X</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

function action(i, type) {
    let r = JSON.parse(localStorage.getItem('admin_reports'));
    r.splice(i, 1);
    localStorage.setItem('admin_reports', JSON.stringify(r));
    loadData();
}