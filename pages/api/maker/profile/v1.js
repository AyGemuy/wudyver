import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/profile/list";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    theme = "flag",
    flagId = "ua",
    profileUrl = `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
    gradient = "45deg, ff7e5f, feb47b",
    pattern = "https://www.toptal.com/designers/subtlepatterns/uploads/dark_embroidery.png",
    model: template = 1,
    type = "v5"
  }) {
    const templateSizes = {
      1: {
        width: 1280,
        height: 1280
      }
    };
    const {
      width,
      height
    } = templateSizes[template] || templateSizes[1];
    const data = {
      width: width,
      height: height,
      html: Html({
        template: template,
        theme: theme,
        flagId: flagId,
        profileUrl: profileUrl,
        gradient: gradient,
        pattern: pattern
      })
    };
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      if (response.data) {
        return response.data?.url;
      }
    } catch (error) {
      console.error("Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}