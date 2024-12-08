import { Goodbye } from "discord-canvas";

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

        const image = await new Goodbye()
            .setUsername(username || "defaultUser")
            .setDiscriminator(discriminator || "0001")
            .setMemberCount(memberCount || "0")
            .setGuildName(guildName || "My Server")
            .setAvatar(avatarUrl || "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg")
            .setColor("border", colorBorder || "#8015EA")
            .setColor("username-box", colorUsernameBox || "#8015EA")
            .setColor("discriminator-box", colorDiscriminatorBox || "#8015EA")
            .setColor("message-box", colorMessageBox || "#8015EA")
            .setColor("title", colorTitle || "#8015EA")
            .setColor("avatar", colorAvatar || "#8015EA")
            .setBackground(backgroundUrl || "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg")
            .toAttachment();

        res.setHeader("Content-Type", "image/png");
        res.send(image.toBuffer());
    } catch (error) {
        res.status(500).json({
            error: "Failed to generate goodbye card.",
            details: error.message,
        });
    }
}
