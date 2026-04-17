export default async function handler(req, res) {
    const response = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=100`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    const members = await response.json();
    const filtered = members.filter(m => m.roles.includes(process.env.REQUIRED_ROLE_ID)).map(m => ({
        username: m.user.username,
        avatar: `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`
    }));
    res.status(200).json(filtered);
}