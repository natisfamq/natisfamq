document.addEventListener('DOMContentLoaded', () => {
    // 1. Sprawdzanie logowania (BEZ pokazywania loga na cały ekran)
    if (document.cookie.includes('user_id') || new URLSearchParams(window.location.search).get('logged') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    // 2. Obsługa zakładek
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            contents.forEach(c => {
                c.classList.remove('active-tab');
                if(c.id === target) setTimeout(() => c.classList.add('active-tab'), 50);
            });
        });
    });

    // 3. Pola dynamiczne w raporcie
    document.getElementById('contract-type').addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('grover-fields').style.display = val === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = val === 'capt' ? 'block' : 'none';
    });

    // 4. Wysyłanie raportu
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        const me = await (await fetch('/api/me')).json();

        setTimeout(async () => {
            await fetch('/api/webhook', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    embeds: [{ 
                        title: "📩 NOWY RAPORT", 
                        color: 16766720, 
                        fields: [
                            { name: "Gracz", value: me.username, inline: true },
                            { name: "Typ", value: type.toUpperCase(), inline: true }
                        ] 
                    }] 
                })
            });
            loader.style.display = 'none';
            alert("Wysłano raport!");
            e.target.reset();
        }, 1000);
    });
});

async function loadData() {
    try {
        // Pobieranie moich danych
        const me = await (await fetch('/api/me')).json();
        if (!me.error) {
            document.getElementById('user-name').innerText = me.username;
            document.getElementById('user-avatar').src = me.avatar || 'logo.jpg';
            document.getElementById('user-role-text').innerText = me.roleName || 'Brak Rangi'; // NAPRAWIONO
        }

        // Pobieranie członków
        const members = await (await fetch('/api/members')).json();
        document.getElementById('members-list').innerHTML = members.map(m => `
            <div class="member-item">
                <img src="${m.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
                <div class="member-info">
                    <span class="member-name">${m.displayName}</span>
                    <span class="member-rank">${m.rankName || 'Członek'}</span> </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Błąd ładowania:", err);
    }
}