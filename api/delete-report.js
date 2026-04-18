import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const userId = req.cookies.user_id;
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

        // Usuń raport z listy
        await kv.lrem('reports_list', 0, JSON.stringify({ id: reportId })); // To może nie działać, bo lrem usuwa po wartości
        
        // Lepiej pobrać wszystkie i odfiltrować
        const reports = await kv.lrange('reports_list', 0, -1);
        const filtered = reports.filter(r => r.id !== reportId);
        await kv.del('reports_list');
        for (const r of filtered) {
            await kv.lpush('reports_list', r);
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Błąd serwera" });
    }
}