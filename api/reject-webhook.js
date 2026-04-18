import { getCookieValue } from '../utils.js';

export default async function handler(req, res) {
    // Przyjmujemy tylko metodę POST
    if (req.method !== 'POST') return res.status(405).end();

    const userId = getCookieValue(req, 'user_id');
    if (!userId) return res.status(401).json({ error: "Brak autoryzacji" });

    try {
        // 1. Weryfikacja rangi w Discord API (Poziom 2 zabezpieczeń)
        const discordRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        });
        const member = await discordRes.json();

        // Lista ID ról uprawnionych (11-15)
        const adminRoles = [
            "1435005337492263033", // 15 | Bosik
            "1435005341606875300", // 14 | V-Lider
            "1435005371105411215", // 13 | Prawa ręka
            "1435005373198241945", // 12 | Lewe jądro
            "1435005375727276112"  // 11 | Klapmistrz
        ];

        const hasPermission = member.roles && member.roles.some(r => adminRoles.includes(r));

        if (!hasPermission) {
            return res.status(403).json({ error: "Odmowa dostępu: Wymagana ranga 11+" });
        }

        // 2. Jeśli autoryzacja przeszła, wysyłamy log o odrzuceniu na Discord
        const r = req.body;
        await fetch(process.env.DISCORD_WEBHOOK_URL_REJECTED || process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: "❌ RAPORT ODRZUCONY",
                    color: 15158332, // Kolor czerwony
                    fields: [
                        { name: "Gracz", value: r.username, inline: true },
                        { name: "Typ", value: r.type, inline: true },
                        { name: "Kwota (anulowana)", value: `${r.payout}$` }
                    ],
                    footer: { text: `Odrzucił: ${member.nick || member.user.username}` },
                    timestamp: new Date().toISOString()
                }]
            })
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("Błąd Reject API:", error);
        res.status(500).json({ error: "Błąd serwera" });
    }
}