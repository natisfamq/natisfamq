import { getCookieValue } from '../utils.js';

const roleNames = {
    "1435005337492263033": "15 | Bosik",
    "1435005341606875300": "14 | V-Lider",
    "1435005371105411215": "13 | Prawa ręka",
    "1435005373198241945": "12 | Lewe jądro",
    "1435005375727276112": "11 | Klapmistrz",
    "1435005377090682881": "10 | Main",
    "1435005379917385768": "9 | Porucznik",
    "1435005393834344620": "8 | Weteran",
    "1435005395759534192": "7 | Hunter",
    "1435005397907013652": "6 | Egzekutor",
    "1435005399978999828": "5 | Torpeda",
    "1435005406924636241": "4 | Młody",
    "1477020190393893035": "3 | Jopek",
    "1435005408757551196": "2 | Klapek",
    "1435005410913550397": "1 | Zawieszony"
};

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const userId = getCookieValue(req, 'user_id');
    if (!userId) {
        return res.writeHead(302, { Location: '/' }).end();
    }

    try {
        const memberRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });

        if (!memberRes.ok) {
            return res.writeHead(302, { Location: '/' }).end();
        }

        const member = await memberRes.json();
        const topRoleId = Object.keys(roleNames).find(roleId => member.roles.includes(roleId));
        const topRoleName = roleNames[topRoleId] || 'Brak rangi';
        const topRoleLevel = parseInt(topRoleName.split(' | ')[0], 10) || 0;

        if (topRoleLevel < 11 || topRoleLevel > 15) {
            return res.status(403).send('Brak uprawnień');
        }

        const html = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel admina - NATIS FAMQ</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div id="main-app" class="fade-in" style="display: block;">
        <header class="main-header modern-glass-panel">
            <div class="header-content">
                <img src="/logo.jpg" alt="Logo" class="header-logo-small">
                <h1 class="header-title-small white-glow-text">Panel admina</h1>
                <a id="home-link" class="admin-button" style="margin-left:auto; text-decoration:none;">Wróć</a>
            </div>
        </header>
        <div class="app-container">
            <div class="modern-glass-card">
                <h3 class="card-title">Zarządzanie raportami</h3>
                <div id="admin-list" class="reports-container"></div>
            </div>
        </div>
    </div>
    <div id="toast-container"></div>
    <script type="module" src="/admin.js"></script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    } catch (error) {
        console.error('Admin page error:', error);
        return res.writeHead(302, { Location: '/' }).end();
    }
}
