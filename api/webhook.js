export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return res.status(500).json({ error: 'Brak URL Webhooka w Env' });

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // Przekazuje dokładnie to, co wyśle script.js
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Discord Error:", errBody);
            return res.status(response.status).json({ error: errBody });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}