document.addEventListener('DOMContentLoaded', () => {
    // --- POPRAWKA LOGOWANIA ---
    function handleAuth() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('logged') === 'true') {
            localStorage.setItem('is_logged', 'true');
            // Czyścimy URL bez przeładowania strony
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (localStorage.getItem('is_logged') === 'true') {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            loadData();
        }
    }
    handleAuth();

    // --- PRZEŁĄCZANIE ZAKŁADEK ---
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

    // --- POLA DYNAMICZNE W RAPORCIE ---
    const contractSelect = document.getElementById('contract-type');
    contractSelect.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    // --- WYSYŁANIE RAPORTU ---
    document.getElementById('report-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        setTimeout(() => {
            let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
            reports.unshift({
                user: document.getElementById('user-name').innerText,
                type: contractSelect.value,
                date: new Date().toLocaleString(),
                imgur: document.getElementById('imgur-link').value
            });
            localStorage.setItem('admin_reports', JSON.stringify(reports));
            
            loader.style.display = 'none';
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