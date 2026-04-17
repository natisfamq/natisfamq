export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();
    const { type, payout, imgur, status } = req.body;

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: `System Raportów - ${status}`,
                color: status.includes('✅') ? 65280 : 16711680,
                fields: [
                    { name: "Typ", value: type, inline: true },
                    { name: "Kwota", value: `${payout}$`, inline: true },
                    { name: "Dowód", value: imgur }
                ],
                timestamp: new Date()
            }]
        })
    });
    res.status(200).json({ ok: true });
}