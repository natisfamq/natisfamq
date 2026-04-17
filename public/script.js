document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');

    // --- POPRAWIONA INICJALIZACJA ---
    function init() {
        // Reset widoczności na starcie
        loginScreen.classList.remove('show-flex');
        mainApp.classList.remove('show-block');

        const params = new URLSearchParams(window.location.search);
        if (params.get('logged') === 'true') {
            localStorage.setItem('is_logged', 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (localStorage.getItem('is_logged') === 'true') {
            mainApp.classList.add('show-block');
            loadData();
        } else {
            loginScreen.classList.add('show-flex');
        }
    }
    init();

    // --- OBSŁUGA ZAKŁADEK ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-tab'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active-tab');
        });
    });

    // --- POLA DYNAMICZNE ---
    const contractSelect = document.getElementById('contract-type');
    contractSelect.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    // --- WYSYŁANIE RAPORTU ---
    document.getElementById('report-form').addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('loading-overlay').style.display = 'flex';

        setTimeout(() => {
            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({
                user: document.getElementById('user-name').innerText,
                type: contractSelect.value,
                date: new Date().toLocaleString(),
                imgur: document.getElementById('imgur-link').value
            });
            localStorage.setItem('admin_reports', JSON.stringify(reports));
            
            document.getElementById('loading-overlay').style.display = 'none';
            alert("Raport wysłany!");
            e.target.reset();
            loadData();
        }, 800);
    });
});

function loadData() {
    // Dane profilu
    document.getElementById('user-name').innerText = "Travis Natis";
    document.getElementById('user-role-text').innerText = "14 | V-Lider";

    // Dane członków
    const members = [
        { n: "Lider Natisek", r: "Lider", a: "logo.jpg" },
        { n: "Travis Natis", r: "14", a: "logo.jpg" },
        { n: "Pabloo Jackson", r: "Klapek", a: "logo.jpg" }
    ];
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="member-item">
            <img src="${m.a}" class="member-avatar">
            <div class="member-info"><strong>${m.n}</strong><br><small style="color: #666">${m.r}</small></div>
        </div>
    `).join('');

    // Dane admina
    const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    document.getElementById('admin-list').innerHTML = reports.map((r, i) => `
        <div class="glass-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${r.user}</strong> - ${r.type}<br>
                    <small style="color:#555">${r.date}</small>
                </div>
                <a href="${r.imgur}" target="_blank" style="color: #3498db; font-size: 0.8rem;">DOWÓD</a>
            </div>
        </div>
    `).join('');
}