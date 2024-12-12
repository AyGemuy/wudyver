import { Welcome } from "discord-canvas";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

    try {
        const {
            username,
            discriminator,
            memberCount,
            guildName,
            avatarUrl,
            backgroundUrl,
            colorBorder,
            colorUsernameBox,
            colorDiscriminatorBox,
            colorMessageBox,
            colorTitle,
            colorAvatar,
        } = req.query;

        const image = await new Welcome()
            .setUsername(username || "defaultUser")
            .setDiscriminator(discriminator || "0001")
            .setMemberCount(memberCount || "0")
            .setGuildName(guildName || "My Server")
            .setAvatar(avatarUrl || "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg")
            .setColor("border", colorBorder || "#8015EA")
            .setColor("username-box", colorUsernameBox || "#8015EA")
            .setColor("discriminator-box", colorDiscriminatorBox || "#8015EA")
            .setColor("message-box", colorMessageBox || "#8015EA")
            .setColor("title", colorTitle || "#8015EA")
            .setColor("avatar", colorAvatar || "#8015EA")
            .setBackground(backgroundUrl || "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg")
            .toAttachment();

        res.setHeader("Content-Type", "image/png");
        res.send(image.toBuffer());
    } catch (error) {
        res.status(500).json({
            error: "Failed to generate Welcome card.",
            details: error.message,
        });
    }
}
