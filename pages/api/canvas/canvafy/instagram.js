import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    username = "wudy",
      avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      image = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      likeCount = 1200,
      likeText = "like",
      verified = true,
      story = true,
      date = Date.now() - 1e3 * 60 * 60 * 24 * 2,
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
    return res.status(200).send(instagramImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate Instagram image"
    });
  }
}