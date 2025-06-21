import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    avatar = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      userTime = 6048e5,
      suspectTime = 6048e5,
      borderColor = "f0f0f0",
      locale = "en",
      overlayOpacity = .9
  } = req.method === "GET" ? req.query : req.body;
  if (!avatar || !background || !userTime) {
    return res.status(400).json({
      error: "Missing required parameters"
    });
  }
  try {
    const securityImage = await new canvafy.Security().setAvatar(avatar).setBackground("image", background).setCreatedTimestamp(Number(userTime)).setSuspectTimestamp(Number(suspectTime)).setBorder("#" + borderColor).setLocale(locale).setAvatarBorder("#" + borderColor).setOverlayOpacity(Number(overlayOpacity)).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(securityImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate security image"
    });
  }
}