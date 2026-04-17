document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');

    // Obsługa logowania i URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true') {
        localStorage.setItem('is_logged', 'true');
        window.history.replaceState({}, document.title, "/");
    }

    if (localStorage.getItem('is_logged') === 'true') {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'block';
        loadData();
    }

    // Zakładki
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-tab'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active-tab');
        });
    });

    // Pokaż/ukryj pola raportu
    const contractType = document.getElementById('contract-type');
    contractType.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    // Formularz raportu
    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        const data = {
            type: contractType.value,
            imgur: document.getElementById('imgur-link').value,
            krzaki: document.getElementById('krzaki-count').value,
            capt: document.getElementById('capt-stats').value
        };

        try {
            const res = await fetch('/api/raport', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Raport wysłany pomyślnie!');
                reportForm.reset();
            }
        } catch (err) {
            console.error(err);
        } finally {
            loader.style.display = 'none';
        }
    });
});

async function loadData() {
    try {
        const res = await fetch('/api/user-data');
        const data = await res.json();

        // Profil
        document.getElementById('user-name').innerText = data.user.username;
        document.getElementById('user-avatar').src = data.user.avatar;
        document.getElementById('user-role-text').innerText = data.user.role;
        document.getElementById('reports-count').innerText = data.reportsCount;

        // Panel Admina
        if (data.isAdmin) {
            document.getElementById('admin-tab-btn').style.display = 'block';
            updateAdminList(data.allReports);
        }

        // CZŁONKOWIE - POPRAWKA: teraz widać rangę pod imieniem
        const list = document.getElementById('members-list');
        list.innerHTML = data.members.map(m => `
            <div class="member-item">
                <img src="${m.avatar}" class="member-avatar">
                <div>
                    <div style="font-weight: bold;">${m.username}</div>
                    <div style="font-size: 0.8rem; color: #888;">${m.role}</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Błąd ładowania danych:", err);
    }
}

function updateAdminList(reports) {
    const adminList = document.getElementById('admin-list');
    adminList.innerHTML = reports.map(r => `
        <div class="glass-card" style="margin-bottom: 10px;">
            <strong>${r.username}</strong> - ${r.type} (${r.date})<br>
            <a href="${r.imgur}" target="_blank" style="color: #3498db;">Link do dowodu</a>
        </div>
    `).join('');
}