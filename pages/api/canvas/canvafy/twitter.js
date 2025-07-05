import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    displayName = "wudy",
      username = "wudy",
      avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      comment = "This is a tweet card. You can customize it as you wish. Enjoy! #Canvafy",
      theme = "dim",
      verified = true
  } = req.method === "GET" ? req.query : req.body;
  if (!displayName || !username || !avatar || !comment) {
    return res.status(400).json({
      error: "Missing required parameters"
    });
  }
  try {
    const tweetImage = await new canvafy.Tweet().setTheme(theme).setUser({
      displayName: displayName,
      username: username
    }).setVerified(verified).setComment(comment).setAvatar(avatar).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(tweetImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate tweet image"
    });
  }
}