import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class WelcomeImageGenerator {
  constructor() {
    this.defaultConfig = {
      avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      background: `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
      title: "Welcome",
      description: "Welcome to this server, go read the rules please!",
      borderColor: "2a2e35",
      avatarBorderColor: "2a2e35",
      overlayOpacity: .3
    };
  }
  validateInputs({
    avatar,
    background,
    title,
    description,
    borderColor,
    avatarBorderColor,
    overlayOpacity
  }) {
    if (!avatar || typeof avatar !== "string") {
      throw new Error("Invalid or missing avatar URL");
    }
    if (!background || typeof background !== "string") {
      throw new Error("Invalid or missing background URL");
    }
    if (!title || typeof title !== "string" || title.length > 50) {
      throw new Error("Invalid or missing title. Must be a string with max 50 characters");
    }
    if (!description || typeof description !== "string" || description.length > 200) {
      throw new Error("Invalid or missing description. Must be a string with max 200 characters");
    }
    if (!/^([0-9A-Fa-f]{6})$/.test(borderColor)) {
      throw new Error("Invalid border color format. Must be a 6-digit hexadecimal color code");
    }
    if (!/^([0-9A-Fa-f]{6})$/.test(avatarBorderColor)) {
      throw new Error("Invalid avatar border color format. Must be a 6-digit hexadecimal color code");
    }
    const opacity = Number(overlayOpacity);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      throw new Error("Overlay opacity must be a number between 0 and 1");
    }
    return {
      avatar: avatar,
      background: background,
      title: title,
      description: description,
      borderColor: borderColor,
      avatarBorderColor: avatarBorderColor,
      overlayOpacity: opacity
    };
  }
  async generateWelcomeImage({
    avatar,
    background,
    title,
    description,
    borderColor,
    avatarBorderColor,
    overlayOpacity
  }) {
    try {
      const welcomeImage = await new canvafy.WelcomeLeave().setAvatar(avatar).setBackground("image", background).setTitle(title).setDescription(description).setBorder(`#${borderColor}`).setAvatarBorder(`#${avatarBorderColor}`).setOverlayOpacity(overlayOpacity).build();
      return welcomeImage;
    } catch (error) {
      throw new Error(`Failed to generate welcome image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const welcomeGenerator = new WelcomeImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...welcomeGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = welcomeGenerator.validateInputs(config);
    const welcomeImage = await welcomeGenerator.generateWelcomeImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(welcomeImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}