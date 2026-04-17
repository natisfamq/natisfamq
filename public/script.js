document.addEventListener('DOMContentLoaded', () => {
    if (document.cookie.includes('user_id') || new URLSearchParams(window.location.search).get('logged') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    // Zakładki
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active-tab');
                if(c.id === tab.dataset.tab) setTimeout(() => c.classList.add('active-tab'), 50);
            });
        });
    });

    // Formularz
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        const me = await (await fetch('/api/me')).json();
        const timestamp = new Date().toLocaleString('pl-PL');

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
            // Webhook
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
                            { name: "Kwota", value: `${payout}$`, inline: true }
                        ],
                        footer: { text: `Panel Wyplat | ${timestamp}` }
                    }]
                })
            });

            // Zapis do Admina z pełnymi danymi
            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({ 
                username: me.username, 
                type: displayType, 
                payout: payout, 
                imgur: imgur, 
                date: timestamp 
            });
            localStorage.setItem('admin_reports', JSON.stringify(reports));

            loader.style.display = 'none';
            alert("Raport wysłany!");
            e.target.reset();
            loadData();
        }, 1200);
    });
});

async function loadData() {
    const me = await (await fetch('/api/me')).json();
    if (!me.error) {
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-role-text').innerText = me.roleName || 'Członek';
    }

    const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    document.getElementById('admin-list').innerHTML = reports.map((r, i) => `
        <div class="admin-report-card">
            <div class="report-header">
                <strong>${r.username}</strong>
                <span>${r.payout}$</span>
            </div>
            <div>
                <span>Typ: ${r.type}</span>
                <a href="${r.imgur}" target="_blank" class="link-proof">DOWÓD (KLIKNIJ)</a>
                <small style="color: #444; display: block; margin-top: 5px;">${r.date}</small>
            </div>
            <div class="report-actions">
                <button onclick="processReport(${i}, 'akceptacja')" class="btn-accept">AKCEPTUJ</button>
                <button onclick="processReport(${i}, 'odrzucenie')" class="btn-reject">ODRZUĆ</button>
            </div>
        </div>
    `).join('');
}

function processReport(index, action) {
    const loader = document.getElementById('loading-overlay');
    loader.style.display = 'flex';

    setTimeout(() => {
        let reports = JSON.parse(localStorage.getItem('admin_reports'));
        reports.splice(index, 1);
        localStorage.setItem('admin_reports', JSON.stringify(reports));
        
        loader.style.display = 'none';
        alert(`Raport: ${action} pomyślna!`);
        loadData();
    }, 800);
}