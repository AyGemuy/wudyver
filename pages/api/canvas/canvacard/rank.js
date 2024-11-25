import { Rank } from "canvacard";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { avatarURL = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', bannerURL = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', username = 'wudy', xp = 500, requiredXP = 500, rank = 100, level = 100, status = 'online' } = req.query;

  if (!avatarURL || !bannerURL || !username || !xp || !requiredXP || !rank || !level || !status) {
    return res.status(400).json({ message: "Missing required query parameters." });
  }

  try {
    const rankCard = new Rank()
      .setAvatar(avatarURL, null, false)
      .setBanner(bannerURL, true)
      .setBadges([], false, true)
      .setBorder(["#22274a", "#001eff"], "vertical")
      .setCurrentXP(Number(xp))
      .setRequiredXP(Number(requiredXP))
      .setRank(Number(rank), "RANK", true)
      .setLevel(Number(level), "LEVEL")
      .setStatus(status)
      .setProgressBar(["#14C49E", "#FF0000"], "GRADIENT", true)
      .setUsername(username, "#FFFFFF")
      .setCreatedTimestamp(new Date().getTime());

    const data = await rankCard.build("Cascadia Code PL");

    res.setHeader("Content-Type", "image/png");
    res.send(data);
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
