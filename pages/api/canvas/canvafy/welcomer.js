import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      title = "Welcome",
      description = "Welcome to this server, go read the rules please!",
      borderColor = "2a2e35",
      avatarBorderColor = "2a2e35",
      overlayOpacity = .3
  } = req.method === "GET" ? req.query : req.body;
  if (!avatar) {
    return res.status(400).json({
      error: "Missing required parameters"
    });
  }
  try {
    const welcomeImage = await new canvafy.WelcomeLeave().setAvatar(avatar).setBackground("image", background).setTitle(title).setDescription(description).setBorder("#" + borderColor).setAvatarBorder("#" + avatarBorderColor).setOverlayOpacity(overlayOpacity).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(welcomeImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate welcome image"
    });
  }
}