import canvafy from "canvafy";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      username = "wudy",
        avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
        image = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
        likeCount = 1200,
        likeText = "like",
        verified = true,
        story = true,
        date,
        liked = true,
        saved = true,
        theme = "light"
    } = req.method === "GET" ? req.query : req.body;
    if (!username || !avatar || !image || !date) {
      return res.status(400).json({
        error: "Missing required parameters"
      });
    }
    try {
      const instagramImage = await new canvafy.Instagram().setTheme(theme).setUser({
        username: username
      }).setLike({
        count: likeCount,
        likeText: likeText
      }).setVerified(verified).setStory(story).setPostDate(date).setAvatar(avatar).setPostImage(image).setLiked(liked).setSaved(saved).build();
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(instagramImage);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate Instagram image"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}