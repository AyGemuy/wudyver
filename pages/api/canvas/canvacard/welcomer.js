import { WelcomeLeave } from "canvacard";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    avatar,
    background,
    title,
    subtitle,
    opacityOverlay,
    colorCircle,
    colorOverlay,
    typeOverlay,
    titleColor,
    subtitleColor,
  } = req.query;

  const avatarUrl = avatar || "https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg";
  const bgColor = background || "#000000";
  const cardTitle = title || "Default Card Title 👋";
  const cardSubtitle = subtitle || "Default Card Caption 👋";
  const overlayOpacity = opacityOverlay ? parseFloat(opacityOverlay) : 1;
  const circleColor = colorCircle || "#FFFFFF";
  const overlayColor = colorOverlay || "#5865F2";
  const overlayType = typeOverlay || "ROUNDED";
  const cardTitleColor = titleColor || "#FFFFFF";
  const cardSubtitleColor = subtitleColor || "#FFFFFF";

  try {
    const welcomer = new WelcomeLeave()
      .setAvatar(avatarUrl)
      .setBackground("COLOR", bgColor)
      .setTitulo(cardTitle, cardTitleColor)
      .setSubtitulo(cardSubtitle, cardSubtitleColor)
      .setOpacityOverlay(overlayOpacity)
      .setColorCircle(circleColor)
      .setColorOverlay(overlayColor)
      .setTypeOverlay(overlayType);

    const data = await welcomer.build("Cascadia Code PL, Noto Color Emoji");

    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
