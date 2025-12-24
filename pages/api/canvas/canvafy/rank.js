import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class RankImageGenerator {
  constructor() {
    this.defaultConfig = {
      username: "wudy",
      avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      status: "offline",
      level: 2,
      rank: 1,
      currentXp: 100,
      requiredXp: 400,
      background: `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
      borderColor: "fff"
    };
    this.validStatuses = ["online", "offline", "idle", "dnd"];
  }
  validateInputs({
    username,
    avatar,
    status,
    level,
    rank,
    currentXp,
    requiredXp,
    background,
    borderColor
  }) {
    if (!username || typeof username !== "string" || username.length > 30) {
      throw new Error("Invalid or missing username. Must be a string with max 30 characters");
    }
    if (!avatar || typeof avatar !== "string") {
      throw new Error("Invalid or missing avatar URL");
    }
    if (!this.validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${this.validStatuses.join(", ")}`);
    }
    const parsedLevel = parseInt(level);
    if (isNaN(parsedLevel) || parsedLevel < 0) {
      throw new Error("Level must be a non-negative number");
    }
    const parsedRank = parseInt(rank);
    if (isNaN(parsedRank) || parsedRank < 1) {
      throw new Error("Rank must be a positive number");
    }
    const parsedCurrentXp = parseInt(currentXp);
    if (isNaN(parsedCurrentXp) || parsedCurrentXp < 0) {
      throw new Error("Current XP must be a non-negative number");
    }
    const parsedRequiredXp = parseInt(requiredXp);
    if (isNaN(parsedRequiredXp) || parsedRequiredXp <= parsedCurrentXp) {
      throw new Error("Required XP must be a number greater than current XP");
    }
    if (!background || typeof background !== "string") {
      throw new Error("Invalid or missing background URL");
    }
    if (!/^([0-9A-Fa-f]{3,6})$/.test(borderColor)) {
      throw new Error("Invalid border color format. Must be a 3 or 6-digit hexadecimal color code");
    }
    return {
      username: username,
      avatar: avatar,
      status: status,
      level: parsedLevel,
      rank: parsedRank,
      currentXp: parsedCurrentXp,
      requiredXp: parsedRequiredXp,
      background: background,
      borderColor: borderColor
    };
  }
  async generateRankImage({
    username,
    avatar,
    status,
    level,
    rank,
    currentXp,
    requiredXp,
    background,
    borderColor
  }) {
    try {
      const rankImage = await new canvafy.Rank().setAvatar(avatar).setBackground("image", background).setUsername(username).setBorder(`#${borderColor}`).setStatus(status).setLevel(level).setRank(rank).setCurrentXp(currentXp).setRequiredXp(requiredXp).build();
      return rankImage;
    } catch (error) {
      throw new Error(`Failed to generate rank image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const rankGenerator = new RankImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...rankGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = rankGenerator.validateInputs(config);
    const rankImage = await rankGenerator.generateRankImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(rankImage);
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      error: error.message
    });
  }
}