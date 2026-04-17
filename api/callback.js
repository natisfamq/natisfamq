export default async function handler(req, res) {
    const { code } = req.query;
    const roles = ["1435005410913550397", "1435005408757551196", "1477020190393893035", "1435005406924636241", "1435005399978999828", "1435005397907013652", "1435005395759534192", "1435005393834344620", "1435005379917385768", "1435005377090682881", "1435005375727276112", "1435005373198241945", "1435005371105411215", "1435005341606875300", "1435005337492263033"];

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code', code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const tokens = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const userData = await userRes.json();

    const memberRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } });
    const memberData = await memberRes.json();

    if (memberData.roles && memberData.roles.some(r => roles.includes(r))) {
        res.setHeader('Set-Cookie', `user_id=${userData.id}; Path=/; HttpOnly; Max-Age=36000`);
        res.redirect('/?logged=true');
    } else {
        res.status(403).send("Brak rangi Natis FamQ.");
    }
}