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
            .setAvatar(avatarUrl || "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg")
            .setLevel(level || 1)
            .setReputation(reputation || 0)
            .setRankName(rankName || "Beginner")
            .setUsername(username || "defaultUser")
            .setBadge(1, badge1 || "gold")
            .setBadge(3, badge2 || "diamond")
            .setBadge(5, badge3 || "silver")
            .setBadge(6, badge4 || "bronze")
            .setBackground(backgroundUrl || "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg")
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
