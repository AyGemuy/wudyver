import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      avatar2 = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      borderColor = "f0f0f0",
      overlayOpacity = .5
  } = req.method === "GET" ? req.query : req.body;
  if (!avatar || !avatar2 || !background) {
    return res.status(400).json({
      error: "Missing required parameters"
    });
  }
  try {
    const shipImage = await new canvafy.Ship().setAvatars(avatar, avatar2).setBackground("image", background).setBorder("#" + borderColor).setOverlayOpacity(overlayOpacity).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(shipImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate ship image"
    });
  }
}