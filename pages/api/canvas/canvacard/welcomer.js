import {
  WelcomeLeave
} from "canvacard";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method Not Allowed"
    });
  }
  const {
    avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      title = "Default Card Title 👋",
      subtitle = "Default Card Caption 👋",
      opacityOverlay = 1,
      colorCircle = "#FFFFFF",
      colorOverlay = "#5865F2",
      typeOverlay = "ROUNDED",
      titleColor = "#FFFFFF",
      subtitleColor = "#FFFFFF"
  } = req.method === "GET" ? req.query : req.body;
  const isUrl = url => {
    const regex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
    return regex.test(url);
  };
  const bgType = isUrl(background) ? "IMAGE" : "COLOR";
  try {
    const welcomer = new WelcomeLeave().setAvatar(avatar).setBackground(bgType, background).setTitulo(title, titleColor).setSubtitulo(subtitle, subtitleColor).setOpacityOverlay(opacityOverlay).setColorCircle(colorCircle).setColorOverlay(colorOverlay).setTypeOverlay(typeOverlay);
    const data = await welcomer.build("Cascadia Code PL, Noto Color Emoji");
    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
}