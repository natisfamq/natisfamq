export default async function handler(req, res) {
    const { code } = req.query;
    
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
    
    // Sprawdzanie członka na konkretnym serwerze
    const memberResponse = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const member = await memberResponse.json();

    if (member.roles && member.roles.includes(process.env.REQUIRED_ROLE_ID)) {
        res.redirect('/?logged=true');
    } else {
        res.status(403).send("Brak wymaganej rangi na serwerze Discord.");
    }
}