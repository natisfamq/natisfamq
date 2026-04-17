export default async function handler(req, res) {
    const userId = req.cookies.user_id;
    if (!userId) return res.status(401).json({ error: "Brak sesji" });

    const response = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    });
    const data = await response.json();
    res.status(200).json({
        username: data.user.global_name || data.user.username,
        avatar: `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png`,
        banner: data.user.banner ? `https://cdn.discordapp.com/banners/${data.user.id}/${data.user.banner}.png` : null
    });
}