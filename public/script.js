document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    
    // Sprawdzanie sesji/logowania
    if (params.get('logged') === 'true' || document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    }

    // Obsługa przycisku logowania
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '/api/login';
        });
    }

    // Obsługa zakładek (Tabs)
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Resetuj aktywność
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Aktywuj wybraną
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
});

async function loadData() {
    try {
        // 1. Pobierz profil zalogowanego użytkownika
        const meRes = await fetch('/api/me');
        const me = await meRes.json();
        if (!me.error) {
            document.getElementById('user-name').innerText = me.username;
            document.getElementById('user-avatar').src = me.avatar;
            document.getElementById('user-role').innerText = me.roleName;
            if (me.banner) {
                document.getElementById('user-banner').style.backgroundImage = `url(${me.banner})`;
            }
        }

        // 2. Pobierz listę wszystkich członków
        const memRes = await fetch('/api/members');
        const members = await memRes.json();
        const listContainer = document.getElementById('members-list');
        
        if (listContainer) {
            listContainer.innerHTML = members.map(m => `
                <div class="list-item">
                    <div class="member-info">
                        <img src="${m.avatar}" class="mini-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                        <span class="member-name">${m.displayName}</span>
                    </div>
                    <span class="member-rank-label">Ranga: ${m.rankName}</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Błąd ładowania danych z API:", err);
    }
}