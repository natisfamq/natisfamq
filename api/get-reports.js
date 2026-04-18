import { readReports } from './report-store.js';
import { getCookieValue } from './utils.js';

export default async function handler(req, res) {
    const userId = getCookieValue(req, 'user_id');
    if (!userId) return res.status(401).json({ error: "Brak sesji" });

    // Twoja lista ról admina (11-15)
    const adminRoles = ["1435005337492263033", "1435005341606875300", "1435005371105411215", "1435005373198241945", "1435005375727276112"];

    try {
        const discordRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        const member = await discordRes.json();
        
        const isAdmin = member.roles && member.roles.some(r => adminRoles.includes(r));
        if (!isAdmin) return res.status(403).json({ error: "Brak uprawnień" });

        const reports = await readReports();
        res.status(200).json(reports);
    } catch (error) {
        console.error('get-reports error:', error);
        res.status(500).json({ error: "Błąd serwera" });
    }
}