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

    const payload = {
        content: "W panelu pojawił się nowy raport!",
        embeds: [embed]
    };

    try {
        if (!process.env.DISCORD_WEBHOOK_URL) {
            throw new Error('Brakuje DISCORD_WEBHOOK_URL');
        }

        const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('new-report sent via webhook', 'status:', response.status);
        if (!response.ok) {
            const text = await response.text().catch(() => 'no body');
            console.error('Discord send failed:', response.status, text);
            throw new Error(`Discord send failed: ${response.status}`);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('New report send error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}