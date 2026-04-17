export default async function handler(req, res) {
    try {
        const response = await fetch(
            `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=1000`,
            {
                headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
            }
        );

        const members = await response.json();
        
        // Mapujemy tylko potrzebne dane, aby nie wysyłać wszystkiego na frontend
        const memberList = members.map(m => ({
            username: m.user.username,
            avatar: `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`,
            roles: m.roles
        }));

        res.status(200).json(memberList);
    } catch (error) {
        res.status(500).json({ error: "Nie udało się pobrać listy członków." });
    }
}