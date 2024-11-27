import { InfoCardBuilder } from "discord-card-canvas";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const { 
            backgroundImgURL, 
            backgroundColorBackground, 
            backgroundColorWaves, 
            mainTextContent 
        } = req.query;

        const card = await new InfoCardBuilder({
            backgroundImgURL: backgroundImgURL || 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg',
            backgroundColor: {
                background: backgroundColorBackground || "#fff",
                waves: backgroundColorWaves || "#0ca7ff",
            },
            mainText: {
                content: mainTextContent || "INFORMATION",
            },
        }).build();

        const buffer = card.toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.send(buffer);
    } catch (error) {
        res.status(500).json({
            error: "Failed to render info card.",
            details: error.message,
        });
    }
}
