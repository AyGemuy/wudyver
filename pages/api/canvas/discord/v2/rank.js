import {
  RankCard
} from "discord-canvas";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");
  try {
    const {
      avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
        level = 1,
        reputation = 0,
        rankName = "Beginner",
        username = "defaultUser",
        badge1 = "gold",
        badge2 = "diamond",
        badge3 = "silver",
        badge4 = "bronze",
        background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg"
    } = req.method === "GET" ? req.query : req.body;
    const image = await new RankCard().setAddon("xp", false).setAddon("rank", false).setAvatar(avatar).setLevel(level).setReputation(reputation).setRankName(rankName).setUsername(username).setBadge(1, badge1).setBadge(3, badge2).setBadge(5, badge3).setBadge(6, badge4).setBackground(background).toAttachment();
    res.setHeader("Content-Type", "image/png");
    res.send(image.toBuffer());
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate rank card.",
      details: error.message
    });
  }
}