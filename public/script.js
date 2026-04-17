document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    document.getElementById('login-btn').addEventListener('click', () => window.location.href = '/api/login');

    // OBSŁUGA ZAKŁADEK (POPRAWIONA)
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Usuń klasę active ze wszystkich przycisków
            tabs.forEach(t => t.classList.remove('active'));
            // Ukryj wszystkie sekcje
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none'; 
            });
            
            // Aktywuj wybrany przycisk
            tab.classList.add('active');
            // Pokaż wybraną sekcję
            const activeSection = document.getElementById(tab.dataset.tab);
            activeSection.classList.add('active');
            activeSection.style.display = 'block';
        });
    });

    // Pokaż domyślnie tylko pierwszą zakładkę
    document.querySelector('.tab-content.active').style.display = 'block';

    const typeSelect = document.getElementById('contract-type');
    typeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('grover-fields').style.display = val === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = val === 'capt' ? 'block' : 'none';
    });

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

        if (!imgur) return alert("Podaj link do dowodu!");

        const reportData = {
            username: me.username,
            type: desc,
            payout: payout,
            imgur: imgur,
            date: new Date().toLocaleString('pl-PL'),
            banner: me.banner
        };

        await fetch('/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });

        let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        reports.unshift(reportData);
        localStorage.setItem('admin_reports', JSON.stringify(reports));

        alert("Raport wysłany!");
        e.target.reset();
        document.getElementById('grover-fields').style.display = 'none';
        document.getElementById('capt-fields').style.display = 'none';
        loadData();
    });
});

async function loadData() {
    try {
        const me = await (await fetch('/api/me')).json();
        if (!me.error) {
            document.getElementById('user-name').innerText = me.username;
            document.getElementById('user-avatar').src = me.avatar;
            document.getElementById('user-role-text').innerHTML = `Ranga: <strong>${me.roleName}</strong>`;
            
            const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            const myReports = reports.filter(r => r.username === me.username);
            document.getElementById('reports-count').innerText = myReports.length;
            document.getElementById('last-act-text').innerText = myReports[0] ? myReports[0].type : "Brak danych";
            
            if (me.banner) document.getElementById('user-banner-div').style.backgroundImage = `url(${me.banner})`;
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

        const adminReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        document.getElementById('admin-list').innerHTML = adminReports.map((r, i) => `
            <div class="admin-report-card">
                <div class="user-banner" style="background-image: url(${r.banner || ''}); background-color: #1a1a1a; height: 100px;"></div>
                <div class="report-body">
                    <div><strong>${r.username}</strong> - ${r.type}<br><small>${r.payout}$ | ${r.date}</small></div>
                    <div style="display:flex; gap:15px;">
                        <a href="${r.imgur}" target="_blank" class="btn" style="text-decoration:none;">IMGUR</a>
                        <button class="btn btn-accept" onclick="action(${i})">USUŃ</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

function action(i) {
    let r = JSON.parse(localStorage.getItem('admin_reports'));
    r.splice(i, 1);
    localStorage.setItem('admin_reports', JSON.stringify(r));
    loadData();
}