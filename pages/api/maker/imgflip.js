import axios from "axios";
class MemePlugin {
  constructor(username = "Wudysoft", password = "Wudysoft") {
    this.GET_MEMES_URL = "https://api.imgflip.com/get_memes";
    this.CAPTION_IMAGE_URL = "https://api.imgflip.com/caption_image";
    this.username = username;
    this.password = password;
    this.api = axios.create({
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
  }
  async getMemes() {
    try {
      const response = await this.api.get(this.GET_MEMES_URL);
      return response.data.success ? response.data.data.memes : null;
    } catch (error) {
      return null;
    }
  }
  async captionImage(memeId, texts) {
    try {
      const data = new URLSearchParams();
      data.append("template_id", memeId);
      data.append("username", this.username);
      data.append("password", this.password);
      texts.forEach((text, index) => data.append(`text${index}`, text));
      const response = await this.api.post(this.CAPTION_IMAGE_URL, data);
      if (response.data.success) {
        const imageResponse = await this.api.get(response.data.data.url, {
          responseType: "arraybuffer"
        });
        return {
          type: "buffer",
          buffer: Buffer.from(imageResponse.data, "binary")
        };
      }
      return {
        type: "error",
        message: response.data.error_message
      };
    } catch (error) {
      return {
        type: "error",
        message: "Error generating meme"
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action = "create",
      id: memeId, ...queryParams
  } = req.query;
  const texts = Object.keys(queryParams).filter(key => key.startsWith("text")).map(key => queryParams[key]);
  const memePlugin = new MemePlugin();
  if (action === "list") {
    const memes = await memePlugin.getMemes();
    return memes ? res.status(200).json({
      success: true,
      memes: memes
    }) : res.status(404).json({
      success: false,
      message: "No memes found"
    });
  }
  if (action === "create") {
    if (!memeId || texts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing parameters"
      });
    }
    const result = await memePlugin.captionImage(memeId, texts);
    if (result.type === "buffer") {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(result.buffer);
    }
    return res.status(400).json({
      success: false,
      message: result.message
    });
  }
  return res.status(400).json({
    success: false,
    message: "Invalid action or missing parameters"
  });
}