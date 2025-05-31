import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/brat/list";
import axios from "axios";
class HtmlToImg {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async getImageBuffer(url, responseType = "arraybuffer") {
    try {
      const response = await axios.get(url, {
        responseType: responseType
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching buffer (${responseType}):`, error.message);
      throw error;
    }
  }
  async generate({
    text = "Jane Doe",
    output = "png",
    model: template = 1,
    type = "v5"
  }) {
    const data = {
      ext: output,
      html: Html({
        text: text,
        output: output,
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
  const outputFormat = params.output || "png";
  const htmlToImg = new HtmlToImg();
  try {
    const imageUrl = await htmlToImg.generate({
      ...params,
      output: outputFormat
    });
    if (imageUrl) {
      let buffer;
      let contentType;
      if (outputFormat === "gif") {
        const arrayBuffer = await htmlToImg.getImageBuffer(imageUrl, "blob");
        buffer = Buffer.from(arrayBuffer);
        contentType = "video/mp4";
      } else if (outputFormat === "png") {
        buffer = await htmlToImg.getImageBuffer(imageUrl);
        contentType = "image/png";
      } else {
        return res.status(400).json({
          error: `Output format "${outputFormat}" tidak didukung.`
        });
      }
      res.setHeader("Content-Type", contentType);
      return res.status(200).send(buffer);
    } else {
      res.status(400).json({
        error: "No image/video URL returned from the service"
      });
    }
  } catch (error) {
    console.error("Error API:", error);
    res.status(500).json({
      error: "API Error"
    });
  }
}