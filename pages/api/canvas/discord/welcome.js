import {
  WelcomeBuilder
} from "discord-card-canvas";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");
  try {
    const {
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
        font = "Inter",
        nicknameContent = "ДобраяKnopKa#2575",
        nicknameColor = "#0CA7FF",
        textContent = "Raccoon Bot Discord",
        textColor = "#0CA7FF",
        avatar = "https://i.pinimg.com/1200x/f3/32/19/f332192b2090f437ca9f49c1002287b6.jpg"
    } = req.method === "GET" ? req.query : req.body;
    const card = await new WelcomeBuilder({
      backgroundImgURL: background,
      fontDefault: font,
      nicknameText: {
        color: nicknameColor,
        content: nicknameContent
      },
      secondText: {
        color: textColor,
        content: textContent
      },
      avatarImgURL: avatar
    }).build();
    const buffer = card.toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      error: "Failed to render welcome card.",
      details: error.message
    });
  }
}