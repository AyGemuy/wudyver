import {
  Welcome
} from "discord-canvas";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");
  try {
    const {
      username = "defaultUser",
        discriminator = "0001",
        memberCount = "0",
        guildName = "My Server",
        avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
        background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
        colorBorder = "#8015EA",
        colorUsernameBox = "#8015EA",
        colorDiscriminatorBox = "#8015EA",
        colorMessageBox = "#8015EA",
        colorTitle = "#8015EA",
        colorAvatar = "#8015EA"
    } = req.method === "GET" ? req.query : req.body;
    const image = await new Welcome().setUsername(username).setDiscriminator(discriminator).setMemberCount(memberCount).setGuildName(guildName).setAvatar(avatar).setColor("border", colorBorder).setColor("username-box", colorUsernameBox).setColor("discriminator-box", colorDiscriminatorBox).setColor("message-box", colorMessageBox).setColor("title", colorTitle).setColor("avatar", colorAvatar).setBackground(background).toAttachment();
    res.setHeader("Content-Type", "image/png");
    res.send(image.toBuffer());
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate Welcome card.",
      details: error.message
    });
  }
}