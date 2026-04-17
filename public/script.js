document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const loader = document.getElementById('loading-overlay');

    const showLoader = (show) => loader.style.display = show ? 'flex' : 'none';

    // Animacja zmiany kategorii
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            contents.forEach(c => {
                c.classList.remove('active-tab');
                if(c.id === target) {
                    setTimeout(() => c.classList.add('active-tab'), 50);
                }
            });
        });
    });

    // Obsługa formularza z ładowaniem
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader(true);

        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        const me = await (await fetch('/api/me')).json();
        const timestamp = new Date().toLocaleString('pl-PL');

        // Symulacja laga/przesyłania
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
                        ],
                        thumbnail: { url: `${window.location.origin}/logo.jpg` },
                        footer: { text: `Panel Wyplat | ${timestamp}` }
                    }]
                })
            });

            showLoader(false);
            alert("Raport został wysłany!");
            e.target.reset();
            loadData();
        }, 1200);
    });
});

async function loadData() {
    const me = await (await fetch('/api/me')).json();
    if (!me.error) {
        document.getElementById('user-name').innerText = me.username;
        document.getElementById('user-avatar').src = me.avatar || 'logo.jpg';
    }

    const members = await (await fetch('/api/members')).json();
    document.getElementById('members-list').innerHTML = members.map(m => `
        <div class="member-item">
            <img src="${m.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
            <span class="member-name">${m.displayName}</span>
        </div>
    `).join('');
}

// Funkcja akceptacji z ładowaniem
async function handleAdminAction(id, action) {
    document.getElementById('loading-overlay').style.display = 'flex';
    setTimeout(() => {
        // Logika usuwania/akceptacji...
        document.getElementById('loading-overlay').style.display = 'none';
        loadData();
    }, 800);
}