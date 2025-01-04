import canvafy from "canvafy";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      displayName = "wudy",
        username = "wudy",
        avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
        comment = 600,
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
      res.status(200).send(tweetImage);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate tweet image"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}