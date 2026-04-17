export default async function handler(req, res) {
    const { type, payout, imgur, status } = req.body;
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            embeds: [{
                title: `Raport: ${status}`,
                color: status.includes('✅') ? 65280 : 16711680,
                fields: [{ name: "Typ", value: type, inline: true }, { name: "Kwota", value: `${payout}$`, inline: true }, { name: "Dowód", value: imgur }]
            }]
        })
    });
    res.status(200).json({ ok: true });
}