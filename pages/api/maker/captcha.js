import axios from "axios";
import crypto from "crypto";
class ImageGenerator {
  constructor() {
    this.hexRandom = () => crypto.randomBytes(3).toString("hex");
    this.baseUrls = ["https://dummyimage.com/300.png/", "https://via.placeholder.com/300/", "https://fakeimg.pl/300x300/", "https://api.sylvain.pro/en/captcha?text=", "https://api-gen.textstudio.com/?text=", "https://usefoyer.com/ap/api/captcha?text="];
  }
  async fetchImage(url, code) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return {
        buffer: Buffer.from(response.data),
        code: code
      };
    } catch {
      return {
        buffer: null,
        code: null
      };
    }
  }
  async generateImage(version, code = this.hexRandom()) {
    let url;
    switch (version) {
      case "1":
        url = `${this.baseUrls[1]}${this.hexRandom().slice(0, 3)}/${this.hexRandom().slice(0, 3)}?text=${encodeURIComponent(code)}`;
        break;
      case "2":
        url = `${this.baseUrls[2]}${this.hexRandom()}/${this.hexRandom()}/?text=${encodeURIComponent(code)}`;
        break;
      case "3":
        url = `${this.baseUrls[3]}${encodeURIComponent(code)}`;
        break;
      case "4":
        url = `${this.baseUrls[4]}${encodeURIComponent(code)}`;
        break;
      case "5":
        url = `${this.baseUrls[5]}${encodeURIComponent(code)}&type=text`;
        break;
      default:
        url = `${this.baseUrls[0]}${this.hexRandom().slice(0, 3)}/${this.hexRandom().slice(0, 3)}&text=${encodeURIComponent(code)}`;
        break;
    }
    return await this.fetchImage(url, code);
  }
}
export default async function handler(req, res) {
  const generator = new ImageGenerator();
  const {
    text,
    version = "1"
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "text parameter is required"
    });
  }
  const imageResponse = await generator.generateImage(version, text);
  if (imageResponse.buffer) {
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageResponse.buffer);
  } else {
    res.status(500).json({
      error: "Failed to generate captcha"
    });
  }
}