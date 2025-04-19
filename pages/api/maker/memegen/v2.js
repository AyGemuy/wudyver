import Html from "../../../../data/html/memegen/list";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${process.env.DOMAIN_URL}/api/tools/html2img/`;
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
    top = " ",
    bottom = " ",
    url = "https://i.pinimg.com/originals/4d/be/22/4dbe22882d18d64cc97f852fb8c6673c.jpg",
    model: template = "1",
    type = "v5"
  }) {
    const data = {
      width: 1280,
      height: 1280,
      html: Html({
        top: top,
        bottom: bottom,
        url: url,
        template: template
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
      res.status(200).send(imageBuffer);
    } else {
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error generating brat image:", error);
    res.status(500).json({
      error: "Failed to generate brat image"
    });
  }
}