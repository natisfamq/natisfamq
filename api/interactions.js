export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
        return res.status(200).end();
    }

    if (req.method === 'HEAD') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send('Interactions endpoint is alive.');
    }

    if (req.method !== 'POST') return res.status(405).end();

    const interaction = req.body;
    console.log('Interaction received:', interaction.type, interaction.data?.custom_id, interaction.member?.user?.id);

    // Handle ping (Discord checks if endpoint is alive)
    if (interaction.type === 1) {
        return res.status(200).json({ type: 1 });
    }

    // Handle button interactions
    if (interaction.type === 3) { // MESSAGE_COMPONENT
        const customId = interaction.data.custom_id || '';
        const [action, reportId] = customId.includes(':') ? customId.split(':') : customId.split('_');

        if (!reportId || (action !== 'accept' && action !== 'reject')) {
            return res.status(200).json({
                type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                data: { content: "Nieprawidłowa akcja." }
            });
        }

        // Check if user has admin permissions
        const userId = interaction.member?.user?.id;
        if (!userId) {
            return res.status(200).json({
                type: 4,
                data: { content: "Brak dostępu." }
            });
        }

        // Verify admin role
        const adminRoles = [
            "1435005337492263033", "1435005341606875300", "1435005371105411215",
            "1435005373198241945", "1435005375727276112"
        ];

        const hasPermission = interaction.member.roles && interaction.member.roles.some(r => adminRoles.includes(r));
        if (!hasPermission) {
            return res.status(200).json({
                type: 4,
                data: { content: "Brak uprawnień admina (wymagana ranga 11+)." }
            });
        }

        const reply = {
            type: 5 // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        };

        console.log('Interaction acked with deferred response');
        res.status(200).json(reply);

        (async () => {
            try {
                const firebaseUrl = `https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app/reports/${reportId}.json`;
                const reportRes = await fetch(firebaseUrl);
                if (!reportRes.ok) {
                    console.error('Interaction error: report not found', reportId, reportRes.status);
                    return;
                }
                const reportData = await reportRes.json();
                if (!reportData) {
                    console.error('Interaction error: report data empty', reportId);
                    return;
                }

                const webhookUrl = action === 'accept'
                    ? (process.env.DISCORD_WEBHOOK_URL_ACCEPTED || process.env.DISCORD_WEBHOOK_URL)
                    : (process.env.DISCORD_WEBHOOK_URL_REJECTED || process.env.DISCORD_WEBHOOK_URL);

                const webhookPayload = {
                    embeds: [{
                        title: action === 'accept' ? "✅ RAPORT ZAAKCEPTOWANY (z Discord)" : "❌ RAPORT ODRZUCONY (z Discord)",
                        color: action === 'accept' ? 3066993 : 15158332,
                        fields: [
                            { name: "Gracz", value: reportData.username, inline: true },
                            { name: "Typ", value: reportData.type, inline: true },
                            { name: action === 'accept' ? "Wypłata" : "Kwota (anulowana)", value: `${reportData.payout}$` },
                            { name: action === 'accept' ? "Zaakceptował" : "Odrzucił", value: interaction.member.user.username, inline: true }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                };

                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(webhookPayload)
                });

                await fetch(firebaseUrl, { method: 'DELETE' });
            } catch (error) {
                console.error('Async interaction error:', error);
            }
        })();

        return;
    }

    return res.status(400).json({ error: "Nieobsługiwany typ interakcji" });
}