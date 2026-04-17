document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');

    // --- NAPRAWA LOGIKI STARTOWEJ ---
    function initApp() {
        const params = new URLSearchParams(window.location.search);
        
        // 1. Sprawdź czy wróciłeś z logowania
        if (params.get('logged') === 'true') {
            localStorage.setItem('is_logged', 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 2. Decyzja co wyświetlić
        if (localStorage.getItem('is_logged') === 'true') {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
            loadData();
        } else {
            loginScreen.style.display = 'flex'; // Wymuszenie wyświetlenia centrowania
            mainApp.style.display = 'none';
        }
    }

    initApp();

    // --- OBSŁUGA ZAKŁADEK ---
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-tab'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active-tab');
        });
    });

    // --- OBSŁUGA PÓL RAPORTU ---
    const contractSelect = document.getElementById('contract-type');
    contractSelect.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    // --- WYSYŁKA RAPORTU ---
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
        { n: "Travis Natis", r: "14", a: "logo.jpg" }
    ];
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="member-item">
            <img src="${m.a}" class="member-avatar">
            <div><strong>${m.n}</strong><br><small style="color: #666">${m.r}</small></div>
        </div>
    `).join('');

    // Dane admina
    const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    document.getElementById('admin-list').innerHTML = reports.map((r, i) => `
        <div class="glass-card" style="margin-bottom: 10px;">
            <strong>${r.user}</strong> - ${r.type}<br>
            <small>${r.date}</small><br>
            <a href="${r.imgur}" target="_blank" style="color: #3498db">DOWÓD</a>
        </div>
    `).join('');
}