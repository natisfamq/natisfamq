export default async function handler(req, res) {
    const hierarchy = [
        "1435005337492263033", // 15 | Bosik
        "1435005341606875300", // 14 | V-Lider
        "1435005371105411215", // 13 | Prawa ręka
        "1435005373198241945", // 12 | Lewe jądro
        "1435005375727276112", // 11 | Klapmistrz
        "1435005377090682881", // 10 | Main
        "1435005379917385768", // 9  | Porucznik
        "1435005393834344620", // 8  | Weteran
        "1435005395759534192", // 7  | Hunter
        "1435005397907013652", // 6  | Egzekutor
        "1435005399978999828", // 5  | Torpeda
        "1435005406924636241", // 4  | Młody
        "1477020190393893035", // 3  | Jopek
        "1435005408757551196", // 2  | Klapek
        "1435005410913550397"  // 1  | Zawieszony
    ];

    const roleNames = {
        "1435005337492263033": "Bosik",
        "1435005341606875300": "V-Lider",
        "1435005371105411215": "Prawa ręka",
        "1435005373198241945": "Lewe jądro",
        "1435005375727276112": "Klapmistrz",
        "1435005377090682881": "Main",
        "1435005379917385768": "Porucznik",
        "1435005393834344620": "Weteran",
        "1435005395759534192": "Hunter",
        "1435005397907013652": "Egzekutor",
        "1435005399978999828": "Torpeda",
        "1435005406924636241": "Młody",
        "1477020190393893035": "Jopek",
        "1435005408757551196": "Klapek",
        "1435005410913550397": "Zawieszony"
    };

    try {
        const response = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=1000`, { 
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } 
        });
        const members = await response.json();

        const result = members
            .filter(m => m.roles.some(r => hierarchy.includes(r)))
            .map(m => {
                // Szukamy najwyższej roli z naszej hierarchii
                const topRoleId = hierarchy.find(r => m.roles.includes(r));
                return {
                    username: m.user.global_name || m.user.username,
                    avatar: `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`,
                    rankName: roleNames[topRoleId] || "Członek",
                    rankOrder: hierarchy.indexOf(topRoleId)
                };
            })
            .sort((a, b) => a.rankOrder - b.rankOrder);

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: "Błąd serwera" });
    }
}