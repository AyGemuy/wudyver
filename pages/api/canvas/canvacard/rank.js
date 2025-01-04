import {
  Rank
} from "canvacard";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method Not Allowed"
    });
  }
  const {
    avatarURL = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      bannerURL = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      username = "wudy",
      xp = 500,
      requiredXP = 500,
      rank = 100,
      level = 100,
      status = "online"
  } = req.method === "GET" ? req.query : req.body;
  if (!avatarURL || !bannerURL || !username || !xp || !requiredXP || !rank || !level || !status) {
    return res.status(400).json({
      message: "Missing required query parameters."
    });
  }
  try {
    const rankCard = new Rank().setAvatar(avatarURL, null, false).setBanner(bannerURL, true).setBadges([], false, true).setBorder(["#22274a", "#001eff"], "vertical").setCurrentXP(Number(xp)).setRequiredXP(Number(requiredXP)).setRank(Number(rank), "RANK", true).setLevel(Number(level), "LEVEL").setStatus(status).setProgressBar(["#14C49E", "#FF0000"], "GRADIENT", true).setUsername(username, "#FFFFFF").setCreatedTimestamp(new Date().getTime());
    const data = await rankCard.build("Cascadia Code PL");
    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message
    });
  }
}