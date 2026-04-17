document.addEventListener('DOMContentLoaded', () => {
    // 1. Logika przełączania zakładek
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-tab'));

            tab.classList.add('active');
            document.getElementById(target).classList.add('active-tab');
        });
    });

    // 2. Obsługa pól dynamicznych w formularzu
    const contractSelect = document.getElementById('contract-type');
    const groverFields = document.getElementById('grover-fields');
    const captFields = document.getElementById('capt-fields');

    contractSelect.addEventListener('change', () => {
        const val = contractSelect.value;
        groverFields.style.display = (val === 'grover') ? 'block' : 'none';
        captFields.style.display = (val === 'capt') ? 'block' : 'none';
    });

    // 3. Sprawdzanie sesji przy starcie
    if (document.cookie.includes('user_id') || localStorage.getItem('is_logged')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    // 4. Wysyłanie raportu
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        // Symulacja zapisu i Webhooka
        setTimeout(() => {
            const type = contractSelect.value;
            const imgur = document.getElementById('imgur-link').value;
            const timestamp = new Date().toLocaleString();

            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({ 
                username: document.getElementById('user-name').innerText,
                type: type,
                date: timestamp,
                imgur: imgur
            });
            localStorage.setItem('admin_reports', JSON.stringify(reports));

            loader.style.display = 'none';
            alert("Raport wysłany pomyślnie!");
            e.target.reset();
            loadData();
        }, 1000);
    });
});

async function loadData() {
    try {
        // Mock danych (zastąp fetchami API)
        const me = { username: "Travis Natis", roleName: "14 | V-Lider", avatar: "logo.jpg" };
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-role-text').innerText = me.roleName;

        // Ładowanie listy członków
        const members = [
            { name: "Lider Natisek", role: "Lider", avatar: "logo.jpg" },
            { name: "Travis Natis", role: "14", avatar: "logo.jpg" },
            { name: "Pabloo Jackson", role: "Klapek", avatar: "logo.jpg" }
        ];

        document.getElementById('members-list').innerHTML = members.map(m => `
            <div class="member-item">
                <img src="${m.avatar}" class="member-avatar">
                <div>
                    <strong>${m.name}</strong><br>
                    <small style="color: #666">${m.role}</small>
                </div>
            </div>
        `).join('');

        // Ładowanie admina
        const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        document.getElementById('admin-list').innerHTML = reports.map((r, i) => `
            <div class="admin-report-card">
                <strong>${r.username}</strong> - ${r.type}<br>
                <small>${r.date}</small><br>
                <a href="${r.imgur}" target="_blank" style="color: #3498db">DOWÓD</a>
                <div class="report-actions">
                    <button class="btn-accept" onclick="process(${i})">AKCEPTUJ</button>
                    <button class="btn-reject" onclick="process(${i})">ODRZUĆ</button>
                </div>
            </div>
        `).join('');

    } catch (e) { console.error(e); }
}

function process(idx) {
    let r = JSON.parse(localStorage.getItem('admin_reports'));
    r.splice(idx, 1);
    localStorage.setItem('admin_reports', JSON.stringify(r));
    loadData();
}