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
});

async function loadData() {
    try {
        const meRes = await fetch('/api/me');
        const me = await meRes.json();
        
        if (!me.error) {
            document.getElementById('user-name').innerText = me.username;
            document.getElementById('user-avatar').src = me.avatar;
            document.getElementById('user-role').innerText = me.roleName;
            
            // Wypełnianie nowych pól w Panelu
            document.getElementById('reports-count').innerText = me.reportsThisWeek;
            document.getElementById('last-act-name').innerText = me.lastActivity.name;
            document.getElementById('last-act-date').innerText = me.lastActivity.date;
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
        console.error("Błąd ładowania danych:", err);
    }
}