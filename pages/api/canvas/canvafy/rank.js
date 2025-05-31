import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    username = "wudy",
      avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      status = "offline",
      level = 2,
      rank = 1,
      currentXp = 100,
      requiredXp = 400,
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      borderColor = "fff"
  } = req.method === "GET" ? req.query : req.body;
  if (!username || !avatar) {
    return res.status(400).json({
      error: "Missing required parameters"
    });
  }
  try {
    const rankImage = await new canvafy.Rank().setAvatar(avatar).setBackground("image", background).setUsername(username).setBorder(`#${borderColor}`).setStatus(status).setLevel(level).setRank(rank).setCurrentXp(currentXp).setRequiredXp(requiredXp).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(rankImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to generate rank image"
    });
  }
}