import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class ProfileImageGenerator {
  constructor() {
    this.defaultConfig = {
      userId: "wudy",
      borderColor: "f0f0f0",
      activityName: "wudy",
      activityDetails: "wudy",
      largeImage: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      smallImage: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-5.jpg`
    };
  }
  validateInputs({
    userId,
    borderColor,
    activityName,
    activityDetails,
    largeImage,
    smallImage
  }) {
    if (!userId || typeof userId !== "string" || userId.length > 32) {
      throw new Error("Invalid or missing userId. Must be a string with max 32 characters");
    }
    if (!/^([0-9A-Fa-f]{6})$/.test(borderColor)) {
      throw new Error("Invalid border color format. Must be a 6-digit hexadecimal color code");
    }
    if (!activityName || typeof activityName !== "string" || activityName.length > 128) {
      throw new Error("Invalid or missing activity name. Must be a string with max 128 characters");
    }
    if (!activityDetails || typeof activityDetails !== "string" || activityDetails.length > 128) {
      throw new Error("Invalid or missing activity details. Must be a string with max 128 characters");
    }
    if (!largeImage || typeof largeImage !== "string") {
      throw new Error("Invalid or missing large image URL");
    }
    if (!smallImage || typeof smallImage !== "string") {
      throw new Error("Invalid or missing small image URL");
    }
    return {
      userId: userId,
      borderColor: borderColor,
      activityName: activityName,
      activityDetails: activityDetails,
      largeImage: largeImage,
      smallImage: smallImage
    };
  }
  async generateProfileImage({
    userId,
    borderColor,
    activityName,
    activityDetails,
    largeImage,
    smallImage
  }) {
    try {
      const profileImage = await new canvafy.Profile().setUser(userId).setBorder(`#${borderColor}`).setActivity({
        activity: {
          name: activityName,
          type: 0,
          details: activityDetails,
          assets: {
            largeText: "📝 Editing a NPM",
            smallText: "❓ Visual Studio Code",
            largeImage: largeImage,
            smallImage: smallImage
          }
        },
        largeImage: largeImage
      }).build();
      return profileImage;
    } catch (error) {
      throw new Error(`Failed to generate profile image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const profileGenerator = new ProfileImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...profileGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = profileGenerator.validateInputs(config);
    const profileImage = await profileGenerator.generateProfileImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(profileImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}