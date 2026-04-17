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

    // Obsługa formularza raportu
    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
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
            payout = (kille * 1000) + (dmg * 10);
            desc = `Capt (K: ${kille}, D: ${dmg})`;
        }

        if (!imgur) return alert("Podaj link do dowodu!");

        const reportData = { 
            type: desc, 
            payout, 
            imgur, 
            date: new Date().toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        };

        // Zapisywanie lokalne (dla demonstracji aktywności w panelu)
        let myReports = JSON.parse(localStorage.getItem('my_reports') || '[]');
        myReports.unshift(reportData);
        localStorage.setItem('my_reports', JSON.stringify(myReports));

        addReportToAdmin(reportData);
        alert("Raport wysłany!");
        e.target.reset();
        loadData(); // Odśwież panel, aby pokazać nową aktywność
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
            
            // Pobieranie ostatniego raportu z pamięci lokalnej
            const myReports = JSON.parse(localStorage.getItem('my_reports') || '[]');
            if (myReports.length > 0) {
                const last = myReports[0];
                document.getElementById('reports-count').innerText = myReports.length;
                document.getElementById('last-act-name').innerText = last.type;
                document.getElementById('last-act-date').innerText = last.date;
            } else {
                document.getElementById('reports-count').innerText = "0";
                document.getElementById('last-act-name').innerText = "Brak raportów";
                document.getElementById('last-act-date').innerText = "-";
            }
        }

        const memRes = await fetch('/api/members');
        const members = await memRes.json();
        const list = document.getElementById('members-list');
        list.innerHTML = members.map(m => `
            <div class="list-item">
                <div style="display:flex; align-items:center;">
                    <img src="${m.avatar}" class="mini-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                    <span class="member-name">${m.displayName}</span>
                </div>
                <span class="member-rank-label">Ranga: ${m.rankName}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error("Błąd ładowania:", err);
    }
}

function addReportToAdmin(rep) {
    const list = document.getElementById('admin-list');
    if(!list) return;
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <div><strong>${rep.type}</strong><br><small>${rep.payout}$ | ${rep.date}</small></div>
        <button class="btn" style="width:auto; padding:5px 15px;" onclick="this.parentElement.remove()">Usuń</button>
    `;
    list.prepend(div);
}