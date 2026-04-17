document.addEventListener('DOMContentLoaded', () => {
    // Logowanie
    if (document.cookie.includes('user_id') || new URLSearchParams(window.location.search).get('logged') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    // Zakładki
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => {
                c.classList.remove('active-tab');
                if(c.id === tab.dataset.tab) setTimeout(() => c.classList.add('active-tab'), 50);
            });
        });
    });

    // Pola dynamiczne
    document.getElementById('contract-type').addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('grover-fields').style.display = val === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = val === 'capt' ? 'block' : 'none';
    });

    // WYŚLIJ RAPORT
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        const me = await (await fetch('/api/me')).json();
        const timestamp = new Date().toLocaleString('pl-PL');

        // Kalkulacja kwoty
        let payout = 10000;
        let displayType = type.charAt(0).toUpperCase() + type.slice(1);
        
        if (type === 'grover') {
            const count = document.getElementById('krzaki-count').value;
            payout = count * 1000;
            displayType = `Grover (${count} szt.)`;
        } else if (type === 'capt') {
            const k = document.getElementById('kille-count').value;
            const d = document.getElementById('dmg-count').value;
            payout = 2500 + (k * 1000) + (d * 10);
            displayType = `Capt (K:${k} D:${d})`;
        }

        setTimeout(async () => {
            // WEBHOOK
            await fetch('/api/webhook', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    embeds: [{ 
                        title: "📩 NOWY RAPORT", 
                        color: 16766720, 
                        fields: [
                            { name: "Gracz", value: me.username, inline: true },
                            { name: "Typ", value: displayType, inline: true },
                            { name: "Kwota", value: `${payout}$`, inline: true },
                            { name: "Akcja", value: "👀 [SPRAWDŹ RAPORTY](https://panel.natis.pl/admin)" }
                        ],
                        thumbnail: { url: "https://panel.natis.pl/logo.jpg" },
                        footer: { text: `Panel Wyplat | ${timestamp}` }
                    }] 
                })
            });

            // Zapis do Admina
            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({ username: me.username, type: displayType, payout, imgur, date: timestamp });
            localStorage.setItem('admin_reports', JSON.stringify(reports));

            loader.style.display = 'none';
            alert("Wysłano raport!");
            e.target.reset();
            loadData();
        }, 1200);
    });
});

async function loadData() {
    const me = await (await fetch('/api/me')).json();
    if (!me.error) {
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-avatar').src = me.avatar || 'logo.jpg';
        document.getElementById('user-role-text').innerText = me.roleName || 'Członek';
    }

    const members = await (await fetch('/api/members')).json();
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="member-item">
            <img src="${m.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
            <div class="member-info">
                <span class="member-name">${m.displayName}</span>
                <span class="member-rank">${m.rankName || 'Członek'}</span>
            </div>
        </div>
    `).join('');

    const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    document.getElementById('admin-list').innerHTML = reports.map((r, i) => `
        <div class="admin-report-card">
            <div>
                <strong>${r.username}</strong> - ${r.type}<br>
                <small>${r.payout}$ | ${r.date}</small>
            </div>
            <button onclick="deleteReport(${i})" class="btn-submit" style="width: auto; padding: 5px 10px;">USUŃ</button>
        </div>
    `).join('');
}

function deleteReport(index) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    reports.splice(index, 1);
    localStorage.setItem('admin_reports', JSON.stringify(reports));
    loadData();
}