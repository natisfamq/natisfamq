export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).send("Brak kodu autoryzacji.");

    try {
        // 1. Wymieniamy kod na token użytkownika, aby dowiedzieć się KIM on jest (ID)
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const tokens = await tokenResponse.json();
        
        // Pobieramy ID zalogowanego użytkownika
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const userData = await userResponse.json();

        // 2. Używamy BOT TOKENA, aby sprawdzić jego rangę na serwerze
        // To jest bezpieczniejsze i pozwala pobrać więcej danych o użytkowniku
        const memberResponse = await fetch(
            `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}`,
            {
                headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
            }
        );

        if (!memberResponse.ok) {
            return res.status(403).send("Nie znaleziono Cię na serwerze Natis FamQ.");
        }

        const memberData = await memberResponse.json();

        // 3. Weryfikacja Rangi
        const hasRole = memberData.roles.includes(process.env.REQUIRED_ROLE_ID);

        if (hasRole) {
            // Możemy zapisać dane użytkownika w ciasteczku (opcjonalnie)
            res.setHeader('Set-Cookie', `user_id=${userData.id}; Path=/; HttpOnly`);
            res.redirect('/?logged=true');
        } else {
            res.status(403).send("Odmowa dostępu: Nie posiadasz wymaganej rangi.");
        }

    } catch (error) {
        console.error(error);
        res.status(500).send("Błąd serwera podczas logowania.");
    }
}