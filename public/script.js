document.addEventListener('DOMContentLoaded', () => {
    // Sprawdzenie czy użytkownik wrócił z logowania
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }

    // Logowanie
    document.getElementById('login-btn').addEventListener('click', () => {
        window.location.href = '/api/login';
    });

    // Przełączanie zakładek
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Dynamiczne pola w raporcie
    const typeSelect = document.getElementById('contract-type');
    typeSelect.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    // Obsługa Formularza
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = typeSelect.value;
        const imgur = document.getElementById('imgur-link').value;
        let payout = 0;
        let desc = type.toUpperCase();

        if(type === 'paczki' || type === 'cenna') payout = 10000;
        else if(type === 'grover') {
            const count = document.getElementById('krzaki-count').value;
            payout = count * 1000;
            desc = `Grover (${count} krzaków)`;
        } else if(type === 'capt') {
            const kille = document.getElementById('kille-count').value;
            const dmg = document.getElementById('dmg-count').value;
            payout = (kille * 1000) + (dmg * 10);
            desc = `Capt (Kille: ${kille}, DMG: ${dmg})`;
        }

        const report = { type: desc, payout, imgur, user: "Użytkownik", date: new Date().toLocaleString() };
        
        // Dodawanie do listy admina (lokalnie dla przykładu)
        addToAdminList(report);
        alert('Raport wysłany do admina!');
    });
});

function addToAdminList(report) {
    const list = document.getElementById('admin-list');
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <div>
            <strong>${report.type}</strong><br>
            <small>${report.date} | Kwota: ${report.payout}$</small><br>
            <a href="${report.imgur}" target="_blank" style="color: #666;">Zobacz dowód</a>
        </div>
        <div class="admin-actions">
            <button onclick="sendToDiscord('${report.type}', '${report.payout}', '${report.imgur}', '✅ ZAAKCEPTOWANO')">Akceptuj</button>
            <button onclick="sendToDiscord('${report.type}', '${report.payout}', '${report.imgur}', '❌ ODRZUCONO')">Odrzuć</button>
        </div>
    `;
    list.appendChild(div);
}

async function sendToDiscord(type, payout, imgur, status) {
    await fetch('/api/send-webhook', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ type, payout, imgur, status })
    });
    alert('Status wysłany na Discord!');
}