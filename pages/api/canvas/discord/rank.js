import { RankCardBuilder } from "discord-card-canvas";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const {
            currentLvl,
            currentRank,
            currentXP,
            requiredXP,
            background,
            bubbles,
            backgroundImgURL,
            avatarImgURL,
            nicknameContent,
            nicknameFont,
            nicknameColor,
            userStatus,
        } = req.query;

        const card = await new RankCardBuilder({
            currentLvl: currentLvl ? parseInt(currentLvl) : 0,
            currentRank: currentRank ? parseInt(currentRank) : 0,
            currentXP: currentXP ? parseInt(currentXP) : 0,
            requiredXP: requiredXP ? parseInt(requiredXP) : 100,
            backgroundColor: {
                background: background || "#070d19",
                bubbles: bubbles || "#0ca7ff",
            },
            backgroundImgURL: backgroundImgURL || 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg',
            avatarImgURL:
                avatarImgURL ||
                "https://i.pinimg.com/1200x/f3/32/19/f332192b2090f437ca9f49c1002287b6.jpg",
            nicknameText: {
                content: nicknameContent || "xNinja_Catx",
                font: nicknameFont || "Nunito",
                color: nicknameColor || "#0CA7FF",
            },
            userStatus: userStatus || "idle",
        }).build();

        const buffer = card.toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.send(buffer);
    } catch (error) {
        res.status(500).json({
            error: "Failed to render rank card.",
            details: error.message,
        });
    }
}
