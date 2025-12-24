import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class CaptchaGenerator {
  constructor() {
    this.defaultConfig = {
      background: `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
      borderColor: "f0f0f0",
      overlayOpacity: .7,
      keyLength: 15
    };
  }
  validateInputs({
    background,
    borderColor,
    overlayOpacity,
    keyLength
  }) {
    if (!background || typeof background !== "string") {
      throw new Error("Invalid or missing background URL");
    }
    if (!/^([0-9A-Fa-f]{6})$/.test(borderColor)) {
      throw new Error("Invalid border color format. Must be a 6-digit hexadecimal color code");
    }
    const opacity = Number(overlayOpacity);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      throw new Error("Overlay opacity must be a number between 0 and 1");
    }
    const length = Number(keyLength);
    if (isNaN(length) || length < 6 || length > 20) {
      throw new Error("Key length must be a number between 6 and 20");
    }
    return {
      background: background,
      borderColor: borderColor,
      overlayOpacity: opacity,
      keyLength: length
    };
  }
  async generateCaptcha({
    background,
    borderColor,
    overlayOpacity,
    keyLength
  }) {
    try {
      const captchaImage = await new canvafy.Captcha().setBackground("image", background).setCaptchaKey(canvafy.Util.captchaKey(keyLength)).setBorder(`#${borderColor}`).setOverlayOpacity(overlayOpacity).build();
      return captchaImage;
    } catch (error) {
      throw new Error(`Failed to generate captcha image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const captchaGenerator = new CaptchaGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...captchaGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = captchaGenerator.validateInputs(config);
    const captchaImage = await captchaGenerator.generateCaptcha(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(captchaImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}