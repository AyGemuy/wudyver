import { RankCard } from "discord-canvas";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const {
            avatarUrl,
            level,
            reputation,
            rankName,
            username,
            badge1,
            badge2,
            badge3,
            badge4,
            backgroundUrl
        } = req.query;

        const image = await new RankCard()
            .setAddon("xp", false)
            .setAddon("rank", false)
            .setAvatar(avatarUrl || "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg")
            .setLevel(level || 1)
            .setReputation(reputation || 0)
            .setRankName(rankName || "Beginner")
            .setUsername(username || "defaultUser")
            .setBadge(1, badge1 || "gold")
            .setBadge(3, badge2 || "diamond")
            .setBadge(5, badge3 || "silver")
            .setBadge(6, badge4 || "bronze")
            .setBackground(backgroundUrl || "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg")
            .toAttachment();

        res.setHeader("Content-Type", "image/png");
        res.send(image.toBuffer());
    } catch (error) {
        res.status(500).json({
            error: "Failed to generate rank card.",
            details: error.message,
        });
    }
}
