import canvafy from "canvafy";
export default async function handler(req, res) {
  const {
    background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
      borderColor = "f0f0f0",
      overlayOpacity = .7,
      keyLength = 15
  } = req.method === "GET" ? req.query : req.body;
  if (!background) {
    return res.status(400).json({
      error: "Missing background URL"
    });
  }
  try {
    const captchaImage = await new canvafy.Captcha().setBackground("image", background).setCaptchaKey(canvafy.Util.captchaKey(Number(keyLength))).setBorder("#" + borderColor).setOverlayOpacity(Number(overlayOpacity)).build();
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(captchaImage);
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate captcha image"
    });
  }
}