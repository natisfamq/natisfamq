export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { username, type, payout, imgur, date } = req.body;

    const discordPayload = {
        embeds: [{
            title: "📩 NOWY RAPORT",
            color: 16777215,
            fields: [
                { name: "Gracz", value: username, inline: true },
                { name: "Typ", value: type, inline: true },
                { name: "Kwota", value: `${payout}$`, inline: true },
                { name: "Dowód", value: imgur }
            ],
            footer: { text: `Panel Wyplat | ${date}` }
        }]
    };

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload)
    });

    res.status(200).json({ success: true });
}