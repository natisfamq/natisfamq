export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const report = req.body;

    const reportId = report.id || 'unknown';
    const embed = {
        title: "🔔 NOWY RAPORT DO SPRAWDZENIA",
        color: 15844367, // Złoty
        fields: [
            { name: "Obywatel", value: report.username || "Nieznany", inline: true },
            { name: "Typ", value: report.type || "Brak", inline: true },
            { name: "Kwota", value: `${report.payout}$`, inline: true },
            { name: "Link do dowodu", value: report.imgur || "Brak" },
            { name: "ID", value: reportId }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Raport do sprawdzenia" }
    };

    const components = [{
        type: 1, // Action row
        components: [
            {
                type: 2, // Button
                style: 3, // Success (green)
                label: "Zaakceptuj",
                custom_id: `accept:${reportId}`
            },
            {
                type: 2, // Button
                style: 4, // Danger (red)
                label: "Odrzuć",
                custom_id: `reject:${reportId}`
            }
        ]
    }];

    const payload = {
        content: "W panelu pojawił się nowy raport!",
        embeds: [embed],
        components: components
    };

    try {
        if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_REPORT_CHANNEL_ID) {
            await fetch(`https://discord.com/api/channels/${process.env.DISCORD_REPORT_CHANNEL_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            await fetch(process.env.DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}