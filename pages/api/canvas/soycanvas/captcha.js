import soycanvas from "soycanvas";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      background = "https://png.pngtree.com/thumb_back/fw800/background/20240911/pngtree-surreal-moonlit-panorama-pc-wallpaper-image_16148136.jpg",
        borderColor = "#f0f0f0",
        overlayOpacity = .7,
        keyLength = 15
    } = req.method === "GET" ? req.query : req.body;
    if (!background) {
      return res.status(400).json({
        error: "Missing background URL"
      });
    }
    try {
      const captchaImage = await new soycanvas.Captcha().setBackground("image", background).setCaptchaKey(soycanvas.Util.captchaKey(Number(keyLength))).setBorder(borderColor).setOverlayOpacity(Number(overlayOpacity)).build();
      res.setHeader("Content-Type", "image/png");
      res.status(200).send(captchaImage);
    } catch (error) {
      res.status(500).json({
        error: "Failed to generate captcha image"
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}