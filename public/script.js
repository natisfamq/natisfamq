document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    document.getElementById('login-btn').addEventListener('click', () => {
        window.location.href = '/api/login';
    });

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    const typeSelect = document.getElementById('contract-type');
    typeSelect.addEventListener('change', (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    });

    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        const userRes = await fetch('/api/me');
        const userData = await userRes.json();

        let payout = 0;
        let desc = type.toUpperCase();

        if (type === 'paczki' || type === 'cenna') payout = 10000;
        else if (type === 'grover') {
            const count = document.getElementById('krzaki-count').value;
            payout = count * 1000;
            desc = `Grover (${count} szt.)`;
        } else if (type === 'capt') {
            const kille = document.getElementById('kille-count').value;
            const dmg = document.getElementById('dmg-count').value;
            // Nowa logika: 2500$ na start + bonusy
            payout = 2500 + (kille * 1000) + (dmg * 10);
            desc = `Capt (K: ${kille}, D: ${dmg})`;
        }

        if (!imgur) return alert("Podaj link do dowodu!");

        const reportData = { 
            username: userData.username,
            banner: userData.banner || '',
            type: desc, 
            payout, 
            imgur, 
            date: new Date().toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
        };

        // Zapisz raport do "globalnej" listy (udawana baza danych)
        let allReports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        allReports.unshift(reportData);
        localStorage.setItem('admin_reports', JSON.stringify(allReports));

        alert("Raport wysłany do administracji!");
        e.target.reset();
        loadData();
    });
});

async function loadData() {
    try {
        const meRes = await fetch('/api/me');
        const me = await meRes.json();
        
        if (!me.error) {
            document.getElementById('user-name').innerText = me.username;
            document.getElementById('user-avatar').src = me.avatar;
            document.getElementById('user-role').innerText = me.roleName;
            if (me.banner) document.querySelector('.user-banner').style.backgroundImage = `url(${me.banner})`;
        }

        // Ładowanie raportów w panelu Admina
        const adminList = document.getElementById('admin-list');
        const reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
        
        adminList.innerHTML = reports.map((rep, index) => `
            <div class="admin-report-card">
                <div class="user-banner" style="background-image: url(${rep.banner})"></div>
                <div class="report-body">
                    <div class="report-info">
                        <h3>${rep.username} - ${rep.type}</h3>
                        <p>Kwota: <strong>${rep.payout}$</strong> | Data: ${rep.date}</p>
                        <a href="${rep.imgur}" target="_blank" style="color: #3498db; font-size: 0.8rem;">Zobacz dowód (Imgur)</a>
                    </div>
                    <div class="report-actions">
                        <button class="btn btn-accept" onclick="handleReport(${index}, 'accept')">Akceptuj</button>
                        <button class="btn btn-reject" onclick="handleReport(${index}, 'reject')">Odrzuć</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) { console.error(err); }
}

function handleReport(index, action) {
    let reports = JSON.parse(localStorage.getItem('admin_reports') || '[]');
    if (action === 'accept') {
        alert("Raport zaakceptowany! Pieniądze dodane do wypłaty gracza.");
    } else {
        alert("Raport odrzucony.");
    }
    reports.splice(index, 1); // Usuń z listy po akcji
    localStorage.setItem('admin_reports', JSON.stringify(reports));
    loadData();
}