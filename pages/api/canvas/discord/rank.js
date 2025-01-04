import {
  RankCardBuilder
} from "discord-card-canvas";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");
  try {
    const {
      currentLvl = 0,
        currentRank = 0,
        currentXP = 0,
        requiredXP = 100,
        backgroundColor = "#070d19",
        bubbles = "#0ca7ff",
        background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
        avatar = "https://i.pinimg.com/1200x/f3/32/19/f332192b2090f437ca9f49c1002287b6.jpg",
        nicknameContent = "xNinja_Catx",
        nicknameFont = "Nunito",
        nicknameColor = "#0CA7FF",
        userStatus = "idle"
    } = req.method === "GET" ? req.query : req.body;
    const card = await new RankCardBuilder({
      currentLvl: parseInt(currentLvl),
      currentRank: parseInt(currentRank),
      currentXP: parseInt(currentXP),
      requiredXP: parseInt(requiredXP),
      backgroundColor: {
        background: backgroundColor,
        bubbles: bubbles
      },
      backgroundImgURL: background,
      avatarImgURL: avatar,
      nicknameText: {
        content: nicknameContent,
        font: nicknameFont,
        color: nicknameColor
      },
      userStatus: userStatus
    }).build();
    const buffer = card.toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      error: "Failed to render rank card.",
      details: error.message
    });
  }
}