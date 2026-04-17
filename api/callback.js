export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).send("Błąd kodu.");

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
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

    const tokens = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userData = await userRes.json();

    const memberRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });

    const memberData = await memberRes.json();
    if (memberData.roles && memberData.roles.includes(process.env.REQUIRED_ROLE_ID)) {
        res.setHeader('Set-Cookie', `user_id=${userData.id}; Path=/; HttpOnly; Max-Age=36000`);
        res.redirect('/?logged=true');
    } else {
        res.status(403).send("Brak rangi.");
    }
}