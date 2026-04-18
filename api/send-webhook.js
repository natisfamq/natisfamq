import { getCookieValue } from './utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const userId = getCookieValue(req, 'user_id');
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

    // 1. Sprawdzamy rangę użytkownika prosto z Discorda (nie ufamy przeglądarce!)
    try {
        const discordRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        const member = await discordRes.json();

        // Lista ID ról uprawnionych (11-15)
        const adminRoles = [
            "1435005337492263033", // 15
            "1435005341606875300", // 14
            "1435005371105411215", // 13
            "1435005373198241945", // 12
            "1435005375727276112"  // 11
        ];

        const hasPermission = member.roles && member.roles.some(r => adminRoles.includes(r));

        if (!hasPermission) {
            return res.status(403).json({ error: "Nie masz uprawnień admina (wymagana ranga 11+)" });
        }

        // 2. Jeśli ma uprawnienia, idziemy dalej
        const r = req.body;
        await fetch(process.env.DISCORD_WEBHOOK_URL_ACCEPTED || process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: "✅ RAPORT ZAAKCEPTOWANY",
                    color: 3066993,
                    fields: [
                        { name: "Gracz", value: r.username, inline: true },
                        { name: "Typ", value: r.type, inline: true },
                        { name: "Wypłata", value: `${r.payout}$` }
                    ],
                    footer: { text: `Zaakceptował: ${member.nick || member.user.username}` }
                }]
            })
        });

        res.status(200).json({ success: true });

    } catch (error) {
        res.status(500).json({ error: "Błąd serwera przy weryfikacji" });
    }
}