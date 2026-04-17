export default async function handler(req, res) {
    const userId = req.cookies.user_id;
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

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

    try {
        const response = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        const data = await response.json();

        const hierarchy = Object.keys(roleNames);
        const topRoleId = hierarchy.find(id => data.roles.includes(id));

        res.status(200).json({
            username: data.nick || data.user.global_name || data.user.username,
            avatar: `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`,
            roleName: `Ranga: ${roleNames[topRoleId] || "Brak Rangi"}`,
            reportsThisWeek: 0, 
            lastActivity: {
                name: "Logowanie do panelu",
                date: new Date().toLocaleString('pl-PL')
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Błąd podczas pobierania profilu" });
    }
}