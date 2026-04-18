import { readReports, writeReports } from './report-store.js';
import { getCookieValue } from './utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const userId = getCookieValue(req, 'user_id');
    if (!userId) return res.status(401).json({ error: "Brak sesji" });

    // Sprawdź uprawnienia admina
    const adminRoles = ["1435005337492263033", "1435005341606875300", "1435005371105411215", "1435005373198241945", "1435005375727276112"];

    try {
        const discordRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        const member = await discordRes.json();
        
        const isAdmin = member.roles && member.roles.some(r => adminRoles.includes(r));
        if (!isAdmin) return res.status(403).json({ error: "Brak uprawnień" });

        const { reportId } = req.body;
        if (!reportId) return res.status(400).json({ error: "Brak ID raportu" });

        const reports = await readReports();
        const filtered = reports.filter(r => r.id !== reportId);
        await writeReports(filtered);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('delete-report error:', error);
        res.status(500).json({ error: "Błąd serwera" });
    }
}