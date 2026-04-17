export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const r = req.body;

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL_REJECTED || process.env.DISCORD_WEBHOOK_URL;

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: "❌ RAPORT ODRZUCONY",
                color: 15158332, // Czerwony
                fields: [
                    { name: "Gracz", value: r.username || "Nieznany", inline: true },
                    { name: "Typ", value: r.type, inline: true },
                    { name: "Niedoszła wypłata", value: `${r.payout}$`, inline: true }
                ],
                footer: { text: `Status: Odrzucono przez Admina` },
                timestamp: new Date().toISOString()
            }]
        })
    });
    res.status(200).json({ success: true });
}