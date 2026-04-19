export default async function handler(req, res) {
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

        try {
            // Get report data from Firebase
            const firebaseUrl = `https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app/reports/${reportId}.json`;
            const reportRes = await fetch(firebaseUrl);
            if (!reportRes.ok) {
                return res.status(200).json({
                    type: 4,
                    data: { content: "Raport nie znaleziony." }
                });
            }
            const reportData = await reportRes.json();
            if (!reportData) {
                return res.status(200).json({
                    type: 4,
                    data: { content: "Raport nie znaleziony." }
                });
            }

            if (action === 'accept') {
                // Send accept webhook
                await fetch(process.env.DISCORD_WEBHOOK_URL_ACCEPTED || process.env.DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: "✅ RAPORT ZAAKCEPTOWANY (z Discord)",
                            color: 3066993,
                            fields: [
                                { name: "Gracz", value: reportData.username, inline: true },
                                { name: "Typ", value: reportData.type, inline: true },
                                { name: "Wypłata", value: `${reportData.payout}$` },
                                { name: "Zaakceptował", value: interaction.member.user.username, inline: true }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
            } else if (action === 'reject') {
                // Send reject webhook
                await fetch(process.env.DISCORD_WEBHOOK_URL_REJECTED || process.env.DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: "❌ RAPORT ODRZUCONY (z Discord)",
                            color: 15158332,
                            fields: [
                                { name: "Gracz", value: reportData.username, inline: true },
                                { name: "Typ", value: reportData.type, inline: true },
                                { name: "Kwota (anulowana)", value: `${reportData.payout}$` },
                                { name: "Odrzucił", value: interaction.member.user.username, inline: true }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
            }

            // Delete report from Firebase
            await fetch(`https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app/reports/${reportId}.json`, {
                method: 'DELETE'
            });

            return res.status(200).json({
                type: 4,
                data: {
                    content: `Raport ${action === 'accept' ? 'zaakceptowany' : 'odrzucony'}!`,
                    flags: 64 // Ephemeral message
                }
            });

        } catch (error) {
            console.error('Interaction error:', error);
            return res.status(200).json({
                type: 4,
                data: { content: "Wystąpił błąd podczas przetwarzania." }
            });
        }
    }

    return res.status(400).json({ error: "Nieobsługiwany typ interakcji" });
}