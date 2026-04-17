document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Sprawdzanie sesji
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadInitialData();
    }

    // 2. Obsługa logowania
    document.getElementById('login-btn').addEventListener('click', () => {
        window.location.href = '/api/login';
    });

    // 3. System Zakładek
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // 4. Dynamiczne pola raportu
    const typeSelect = document.getElementById('contract-type');
    typeSelect.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    // 5. Wysyłanie Raportu
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = typeSelect.value;
        const imgur = document.getElementById('imgur-link').value;
        let payout = 0;
        let desc = type.toUpperCase();

        if (type === 'paczki' || type === 'cenna') payout = 10000;
        else if (type === 'grover') {
            const count = document.getElementById('krzaki-count').value;
            payout = count * 1000;
            desc = `Grover (${count} krzaków)`;
        } else if (type === 'capt') {
            const kille = document.getElementById('kille-count').value;
            const dmg = document.getElementById('dmg-count').value;
            payout = (kille * 1000) + (dmg * 10);
            desc = `Capt (Kille: ${kille}, DMG: ${dmg})`;
        }

        if (!imgur) return alert("Podaj link do dowodu!");

        addToAdminList({ type: desc, payout, imgur, date: new Date().toLocaleString() });
        alert("Raport wysłany do Admina!");
        e.target.reset();
    });
});

async function loadInitialData() {
    // Pobierz profil
    const resMe = await fetch('/api/me');
    const user = await resMe.json();
    if (!user.error) {
        document.getElementById('user-name').innerText = user.username;
        document.getElementById('user-avatar').src = user.avatar;
        if (user.banner) document.getElementById('user-banner').style.backgroundImage = `url(${user.banner})`;
        document.getElementById('user-role').innerText = "Członek Rodziny";
    }

    // Pobierz członków
    const resMembers = await fetch('/api/members');
    const members = await resMembers.json();
    const list = document.getElementById('members-list');
    list.innerHTML = members.map(m => `
        <div class="list-item">
            <div class="member-info">
                <img src="${m.avatar}" class="mini-avatar">
                <span>${m.username}</span>
            </div>
            <div style="font-size: 0.8rem; color: #666;">Zatwierdzony</div>
        </div>
    `).join('');
}

function addToAdminList(report) {
    const list = document.getElementById('admin-list');
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <div>
            <strong>${report.type}</strong><br>
            <small>${report.payout}$ | ${report.date}</small>
        </div>
        <div>
            <button class="btn" style="padding: 5px 10px; font-size: 10px;" onclick="processReport('${report.type}', '${report.payout}', '${report.imgur}', '✅ ZAAKCEPTOWANO', this)">Akceptuj</button>
            <button class="btn" style="padding: 5px 10px; font-size: 10px; border-color: red;" onclick="processReport('${report.type}', '${report.payout}', '${report.imgur}', '❌ ODRZUCONO', this)">Odrzuć</button>
        </div>
    `;
    list.prepend(div);
}

async function processReport(type, payout, imgur, status, btn) {
    btn.parentElement.parentElement.remove();
    await fetch('/api/send-webhook', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ type, payout, imgur, status })
    });
}