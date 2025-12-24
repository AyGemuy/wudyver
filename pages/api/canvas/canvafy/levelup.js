import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class LevelUpImageGenerator {
  constructor() {
    this.defaultConfig = {
      avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      background: `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
      username: "wudy",
      borderColor: "000000",
      avatarBorderColor: "ff0000",
      overlayOpacity: .7,
      currentLevel: 55,
      nextLevel: 56
    };
  }
  validateInputs({
    avatar,
    background,
    username,
    borderColor,
    avatarBorderColor,
    overlayOpacity,
    currentLevel,
    nextLevel
  }) {
    if (!avatar || typeof avatar !== "string") {
      throw new Error("Invalid or missing avatar URL");
    }
    if (!background || typeof background !== "string") {
      throw new Error("Invalid or missing background URL");
    }
    if (!username || typeof username !== "string" || username.length > 30) {
      throw new Error("Invalid or missing username. Must be a string with max 30 characters");
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
    const currLevel = parseInt(currentLevel);
    if (isNaN(currLevel) || currLevel < 0) {
      throw new Error("Current level must be a non-negative number");
    }
    const nxtLevel = parseInt(nextLevel);
    if (isNaN(nxtLevel) || nxtLevel <= currLevel) {
      throw new Error("Next level must be a number greater than current level");
    }
    return {
      avatar: avatar,
      background: background,
      username: username,
      borderColor: borderColor,
      avatarBorderColor: avatarBorderColor,
      overlayOpacity: opacity,
      currentLevel: currLevel,
      nextLevel: nxtLevel
    };
  }
  async generateLevelUpImage({
    avatar,
    background,
    username,
    borderColor,
    avatarBorderColor,
    overlayOpacity,
    currentLevel,
    nextLevel
  }) {
    try {
      const levelUpImage = await new canvafy.LevelUp().setAvatar(avatar).setBackground("image", background).setUsername(username).setBorder(`#${borderColor}`).setAvatarBorder(`#${avatarBorderColor}`).setOverlayOpacity(overlayOpacity).setLevels(currentLevel, nextLevel).build();
      return levelUpImage;
    } catch (error) {
      throw new Error(`Failed to generate level-up image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const levelUpGenerator = new LevelUpImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...levelUpGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = levelUpGenerator.validateInputs(config);
    const levelUpImage = await levelUpGenerator.generateLevelUpImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(levelUpImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}