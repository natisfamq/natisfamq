document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    document.getElementById('login-btn').addEventListener('click', () => window.location.href = '/api/login');

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
            desc = `Capt (K: ${kille}, D: ${dmg})`;
        }

        if (!imgur) return alert("Wklej link do dowodu!");
        
        addReportToAdmin({ type: desc, payout, imgur, date: new Date().toLocaleString() });
        alert("Wysłano do weryfikacji!");
        e.target.reset();
    });
});

async function loadData() {
    // Profil
    const meRes = await fetch('/api/me');
    const me = await meRes.json();
    if (!me.error) {
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-avatar').src = me.avatar;
        document.getElementById('user-role').innerText = me.roleName;
        if (me.banner) document.getElementById('user-banner').style.backgroundImage = `url(${me.banner})`;
    }

    // Członkowie
    const memRes = await fetch('/api/members');
    const members = await memRes.json();
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="list-item">
            <div class="member-info">
                <img src="${m.avatar}" class="mini-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                <span>${m.username}</span>
            </div>
            <span style="font-size:0.7rem; color:#555;">ID: ${m.rankIndex + 1}</span>
        </div>
    `).join('');
}

function addReportToAdmin(rep) {
    const list = document.getElementById('admin-list');
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <div><strong>${rep.type}</strong><br><small>${rep.payout}$ | ${rep.date}</small></div>
        <div style="display:flex; gap:5px;">
            <button class="btn" style="padding:5px; font-size:9px;" onclick="process('${rep.type}','${rep.payout}','${rep.imgur}','✅ AKCEPT', this)">V</button>
            <button class="btn" style="padding:5px; font-size:9px; border-color:red;" onclick="process('${rep.type}','${rep.payout}','${rep.imgur}','❌ ODRZUĆ', this)">X</button>
        </div>
    `;
    list.prepend(div);
}

async function process(t, p, i, s, btn) {
    btn.parentElement.parentElement.remove();
    await fetch('/api/send-webhook', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ type: t, payout: p, imgur: i, status: s })
    });
}