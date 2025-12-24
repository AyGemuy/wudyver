import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class TweetImageGenerator {
  constructor() {
    this.defaultConfig = {
      displayName: "wudy",
      username: "wudy",
      avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      comment: "This is a tweet card. You can customize it as you wish. Enjoy! #Canvafy",
      theme: "dim",
      verified: true
    };
    this.validThemes = ["light", "dark", "dim"];
  }
  validateInputs({
    displayName,
    username,
    avatar,
    comment,
    theme,
    verified
  }) {
    if (!displayName || typeof displayName !== "string" || displayName.length > 50) {
      throw new Error("Invalid or missing displayName. Must be a string with max 50 characters");
    }
    if (!username || typeof username !== "string" || username.length > 15) {
      throw new Error("Invalid or missing username. Must be a string with max 15 characters");
    }
    if (!avatar || typeof avatar !== "string") {
      throw new Error("Invalid or missing avatar URL");
    }
    if (!comment || typeof comment !== "string" || comment.length > 280) {
      throw new Error("Invalid or missing comment. Must be a string with max 280 characters");
    }
    if (!this.validThemes.includes(theme)) {
      throw new Error(`Invalid theme. Must be one of: ${this.validThemes.join(", ")}`);
    }
    if (typeof verified !== "boolean") {
      throw new Error("Verified status must be a boolean");
    }
    return {
      displayName: displayName,
      username: username,
      avatar: avatar,
      comment: comment,
      theme: theme,
      verified: verified
    };
  }
  async generateTweetImage({
    displayName,
    username,
    avatar,
    comment,
    theme,
    verified
  }) {
    try {
      const tweetImage = await new canvafy.Tweet().setTheme(theme).setUser({
        displayName: displayName,
        username: username
      }).setVerified(verified).setComment(comment).setAvatar(avatar).build();
      return tweetImage;
    } catch (error) {
      throw new Error(`Failed to generate tweet image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const tweetGenerator = new TweetImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...tweetGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = tweetGenerator.validateInputs(config);
    const tweetImage = await tweetGenerator.generateTweetImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(tweetImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}