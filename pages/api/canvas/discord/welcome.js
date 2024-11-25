import { WelcomeBuilder } from "discord-card-canvas";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const {
            backgroundImgURL,
            fontDefault,
            nicknameContent,
            nicknameColor,
            secondTextContent,
            secondTextColor,
            avatarImgURL,
        } = req.query;

        const card = await new WelcomeBuilder({
            backgroundImgURL:
                backgroundImgURL ||
                "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg",
            fontDefault: fontDefault || "Inter",
            nicknameText: {
                color: nicknameColor || "#0CA7FF",
                content: nicknameContent || "ДобраяKnopKa#2575",
            },
            secondText: {
                color: secondTextColor || "#0CA7FF",
                content: secondTextContent || "Raccoon Bot Discord",
            },
            avatarImgURL:
                avatarImgURL ||
                "https://i.pinimg.com/1200x/f3/32/19/f332192b2090f437ca9f49c1002287b6.jpg",
        }).build();

        const buffer = card.toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.send(buffer);
    } catch (error) {
        res.status(500).json({
            error: "Failed to render welcome card.",
            details: error.message,
        });
    }
}
