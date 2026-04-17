export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
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
                ]
            }]
        })
    });
    res.status(200).json({ success: true });
}