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

    // WYSYŁANIE NOWEGO RAPORTU Przez Gracza
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('contract-type').value;
        let imgur = document.getElementById('imgur-link').value.trim();
        const me = await (await fetch('/api/me')).json();

        // FIX: Naprawa linku Imgur (dodawanie protokołu jeśli brak)
        if (imgur && !imgur.startsWith('http')) {
            imgur = 'https://' + imgur;
        }

        let payout = 0;
        let desc = type.toUpperCase();
        let logDesc = type.charAt(0).toUpperCase() + type.slice(1);

        if (type === 'paczki' || type === 'cenna') {
            payout = 10000;
        } else if (type === 'grover') {
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

        if (!imgur) return alert("Podaj link do dowodu!");

        const now = new Date();
        const timestamp = now.toLocaleDateString('pl-PL') + ', ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // LOG DO DISCORDA: NOWY RAPORT
        const discordPayload = {
            embeds: [{
                title: "📩 NOWY RAPORT",
                color: 16766720, // Żółty
                fields: [
                    { name: "Gracz", value: me.username, inline: true },
                    { name: "Typ", value: logDesc, inline: true },
                    { name: "Kwota", value: `${payout}$`, inline: true },
                    { name: "Akcja", value: `👀 [SPRAWDŹ RAPORTY](${window.location.origin})`, inline: false }
                ],
                thumbnail: {
                    url: "https://cdn.discordapp.com/icons/1218558455823405108/a_d65e2361099e03f191b4e3e6060f0891.webp"
                },
                footer: { text: `Panel Wyplat | ${timestamp}` }
            }]
        };

        try {
            await fetch('/api/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            });

            // Zapis lokalny dla panelu Admina
            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({
                username: me.username,
                type: desc,
                payout: payout,
                imgur: imgur,
                date: timestamp
            });
            localStorage.setItem('admin_reports', JSON.stringify(reports));

            alert("Raport wysłany!");
            e.target.reset();
            loadData();
        } catch (err) {
            alert("Błąd połączenia z API.");
        }
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
                    <span class="member-name" style="font-size:1.5rem; font-weight:700;">${m.displayName}</span>
                </div>
                <span class="member-rank-label" style="color:#888;">${m.rankName}</span>
            </div>
        `).join('');

        // Lista raportów w adminie - przejrzysty design
        const adminReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        document.getElementById('admin-list').innerHTML = adminReports.map((r, i) => `
            <div class="admin-report-card">
                <div class="report-accent-bar"></div>
                <div class="report-body">
                    <div class="report-info">
                        <span class="report-user">${r.username}</span>
                        <span class="report-type">${r.type}</span>
                        <span class="report-meta">${r.payout}$ | ${r.date}</span>
                    </div>
                    <div class="report-actions">
                        <a href="${r.imgur}" target="_blank" class="btn btn-imgur">IMGUR</a>
                        <button class="btn btn-accept" onclick="processReport(${i}, 'AKCEPTACJA')">AKCEPTUJ</button>
                        <button class="btn btn-reject" onclick="processReport(${i}, 'ODRZUCENIE')">ODRZUĆ</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

// PRZETWARZANIE RAPORTU Przez Admina (Akceptacja/Odrzucenie)
async function processReport(index, actionType) {
    let reports = JSON.parse(localStorage.getItem('admin_reports'));
    const r = reports[index];
    
    const meRes = await fetch('/api/me');
    const me = await meRes.json();
    const verifierName = me.username || "System";

    const isAccept = actionType === 'AKCEPTACJA';
    const embedColor = isAccept ? 3066993 : 15158332; // Zielony vs Czerwony
    
    const now = new Date();
    const timestamp = now.toLocaleDateString('pl-PL') + ', ' + now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Formatowanie embeda zgodnie ze screenami
    const discordPayload = {
        embeds: [{
            title: isAccept ? "⚖️ RAPORT AKCEPTACJA" : "⚖️ RAPORT ODRZUCENIE",
            color: embedColor,
            fields: [
                { name: "Gracz", value: r.username, inline: true },
                { name: "Kwota", value: `${r.payout}$`, inline: true },
                { name: "Weryfikator", value: verifierName, inline: true }
            ],
            thumbnail: {
                url: "https://cdn.discordapp.com/icons/1218558455823405108/a_d65e2361099e03f191b4e3e6060f0891.webp" 
            },
            footer: { 
                text: `Panel Wyplat | ${timestamp}` 
            }
        }]
    };

    try {
        const response = await fetch('/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordPayload)
        });

        if (response.ok) {
            // Usuwamy raport z lokalnej bazy tylko jeśli webhook przeszedł
            reports.splice(index, 1);
            localStorage.setItem('admin_reports', JSON.stringify(reports));
            loadData();
        } else {
            alert("Błąd serwera Discord.");
        }
    } catch (error) {
        alert("Błąd wysyłania: " + error.message);
    }
}