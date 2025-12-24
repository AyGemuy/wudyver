import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class TopImageGenerator {
  constructor() {
    this.defaultConfig = {
      topData: JSON.stringify([{
        top: 1,
        avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-5.jpg`,
        tag: "Beş#0005",
        score: 5555
      }, {
        top: 2,
        avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
        tag: "Lulushu#1337",
        score: 1337
      }]),
      background: `https://${apiConfig.DOMAIN_URL}/assets/images/all-img/image-3.png`,
      opacity: .6,
      scoreMessage: "Message:",
      abbreviateNumber: false,
      colors: {}
    };
  }
  validateInputs({
    topData,
    background,
    opacity,
    scoreMessage,
    abbreviateNumber,
    colors
  }) {
    let usersData;
    try {
      usersData = typeof topData === "string" && topData.length ? JSON.parse(topData) : [];
      if (!Array.isArray(usersData)) {
        throw new Error("topData must be a valid JSON array");
      }
    } catch (error) {
      throw new Error(`Invalid topData format: ${error.message}`);
    }
    if (usersData.length === 0) {
      usersData = JSON.parse(this.defaultConfig.topData);
    }
    if (usersData.length > 10) {
      throw new Error("topData array cannot exceed 10 users");
    }
    usersData.forEach((user, index) => {
      if (!user.top || !Number.isInteger(user.top) || user.top < 1) {
        throw new Error(`User at index ${index}: top must be a positive integer`);
      }
      if (!user.avatar || typeof user.avatar !== "string") {
        throw new Error(`User at index ${index}: avatar must be a valid URL string`);
      }
      if (!user.tag || typeof user.tag !== "string" || user.tag.length > 32) {
        throw new Error(`User at index ${index}: tag must be a string with max 32 characters`);
      }
      if (!Number.isInteger(user.score) || user.score < 0) {
        throw new Error(`User at index ${index}: score must be a non-negative integer`);
      }
    });
    const topPositions = usersData.map(user => user.top);
    if (new Set(topPositions).size !== topPositions.length) {
      throw new Error("topData contains duplicate top positions");
    }
    if (!background || typeof background !== "string") {
      throw new Error("Invalid or missing background URL");
    }
    const parsedOpacity = Number(opacity);
    if (isNaN(parsedOpacity) || parsedOpacity < 0 || parsedOpacity > 1) {
      throw new Error("Opacity must be a number between 0 and 1");
    }
    if (typeof scoreMessage !== "string" || scoreMessage.length > 50) {
      throw new Error("Score message must be a string with max 50 characters");
    }
    if (typeof abbreviateNumber !== "boolean") {
      throw new Error("Abbreviate number must be a boolean");
    }
    if (typeof colors !== "object" || colors === null) {
      throw new Error("Colors must be an object");
    }
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value !== "string" || !/^#?([0-9A-Fa-f]{6})$/.test(value.replace("#", ""))) {
        throw new Error(`Invalid color for ${key}. Must be a 6-digit hexadecimal color code`);
      }
    });
    return {
      usersData: usersData,
      background: background,
      opacity: parsedOpacity,
      scoreMessage: scoreMessage,
      abbreviateNumber: abbreviateNumber,
      colors: colors
    };
  }
  async generateTopImage({
    usersData,
    background,
    opacity,
    scoreMessage,
    abbreviateNumber,
    colors
  }) {
    try {
      const topImage = await new canvafy.Top().setOpacity(opacity).setScoreMessage(scoreMessage).setAbbreviateNumber(abbreviateNumber).setBackground("image", background).setColors(colors).setUsersData(usersData).build();
      return topImage;
    } catch (error) {
      throw new Error(`Failed to generate top image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const topGenerator = new TopImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...topGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = topGenerator.validateInputs(config);
    const topImage = await topGenerator.generateTopImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(topImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}