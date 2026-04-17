export default async function handler(req, res) {
    const hierarchy = ["1435005337492263033", "1435005341606875300", "1435005371105411215", "1435005373198241945", "1435005375727276112", "1435005377090682881", "1435005379917385768", "1435005393834344620", "1435005395759534192", "1435005397907013652", "1435005399978999828", "1435005406924636241", "1477020190393893035", "1435005408757551196", "1435005410913550397"];

    const response = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=1000`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } });
    const members = await response.json();

    const result = members
        .filter(m => m.roles.some(r => hierarchy.includes(r)))
        .map(m => ({
            username: m.user.username,
            avatar: `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png`,
            rankIndex: hierarchy.findIndex(r => m.roles.includes(r))
        }))
        .sort((a, b) => a.rankIndex - b.rankIndex);

    res.status(200).json(result);
}