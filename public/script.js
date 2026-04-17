document.addEventListener('DOMContentLoaded', () => {
    // Sprawdzanie logowania
    const checkLogin = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            loadData();
        }
    };
    checkLogin();

    // Taby
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

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

    // Formularz raportu z ładowaniem
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        setTimeout(async () => {
            const type = document.getElementById('contract-type').value;
            const imgur = document.getElementById('imgur-link').value;
            
            // Webhook
            try {
                await fetch('/api/webhook', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        embeds: [{ 
                            title: "📩 NOWY RAPORT", 
                            color: 16766720, 
                            fields: [{ name: "Typ", value: type.toUpperCase() }] 
                        }] 
                    })
                });
                alert("Raport wysłany!");
                e.target.reset();
            } catch (err) {
                console.error("Błąd wysyłki", err);
            } finally {
                loader.style.display = 'none';
                loadData();
            }
        }, 1200);
    });
});

async function loadData() {
    try {
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
    } catch (err) {
        console.error("Błąd ładowania danych", err);
    }
}