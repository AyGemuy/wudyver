import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class InstagramImageGenerator {
  constructor() {
    this.defaultConfig = {
      username: "wudy",
      avatar: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-5.jpg`,
      image: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      likeCount: 1200,
      likeText: "like",
      verified: true,
      story: true,
      date: Date.now() - 1e3 * 60 * 60 * 24 * 2,
      liked: true,
      saved: true,
      theme: "light"
    };
    this.validThemes = ["light", "dark"];
  }
  validateInputs({
    username,
    avatar,
    image,
    likeCount,
    likeText,
    verified,
    story,
    date,
    liked,
    saved,
    theme
  }) {
    if (!username || typeof username !== "string" || username.length > 30) {
      throw new Error("Invalid or missing username. Must be a string with max 30 characters");
    }
    if (!avatar || typeof avatar !== "string") {
      throw new Error("Invalid or missing avatar URL");
    }
    if (!image || typeof image !== "string") {
      throw new Error("Invalid or missing post image URL");
    }
    const count = parseInt(likeCount);
    if (isNaN(count) || count < 0) {
      throw new Error("Invalid like count. Must be a non-negative number");
    }
    if (!likeText || typeof likeText !== "string") {
      throw new Error("Invalid or missing like text. Must be a string");
    }
    if (typeof verified !== "boolean") {
      throw new Error("Verified status must be a boolean");
    }
    if (typeof story !== "boolean") {
      throw new Error("Story status must be a boolean");
    }
    const parsedDate = parseInt(date);
    if (isNaN(parsedDate) || parsedDate > Date.now()) {
      throw new Error("Invalid date. Must be a valid timestamp not in the future");
    }
    if (typeof liked !== "boolean") {
      throw new Error("Liked status must be a boolean");
    }
    if (typeof saved !== "boolean") {
      throw new Error("Saved status must be a boolean");
    }
    if (!this.validThemes.includes(theme)) {
      throw new Error(`Invalid theme. Must be one of: ${this.validThemes.join(", ")}`);
    }
    return {
      ...arguments[0],
      likeCount: count,
      date: parsedDate
    };
  }
  async generateInstagramImage({
    username,
    avatar,
    image,
    likeCount,
    likeText,
    verified,
    story,
    date,
    liked,
    saved,
    theme
  }) {
    try {
      const instagramImage = await new canvafy.Instagram().setTheme(theme).setUser({
        username: username
      }).setLike({
        count: likeCount,
        likeText: likeText
      }).setVerified(verified).setStory(story).setPostDate(date).setAvatar(avatar).setPostImage(image).setLiked(liked).setSaved(saved).build();
      return instagramImage;
    } catch (error) {
      throw new Error(`Failed to generate Instagram image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const instagramGenerator = new InstagramImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...instagramGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = instagramGenerator.validateInputs(config);
    const instagramImage = await instagramGenerator.generateInstagramImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(instagramImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}