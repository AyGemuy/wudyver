import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/fansign/list";
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
    console.log(`[HtmlToImg] Fetching image buffer from URL: ${url}`);
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      console.log(`[HtmlToImg] Image buffer fetched successfully.`);
      return response.data;
    } catch (error) {
      console.error("[HtmlToImg] Error fetching image buffer:", error.message);
      throw error;
    }
  }
  async generate({
    text = "Jane Doe",
    model: template = 1,
    type = "v5"
  }) {
    const templateSizes = {
      1: {
        width: 735,
        height: 636
      },
      2: {
        width: 1270,
        height: 1392
      },
      3: {
        width: 550,
        height: 758
      },
      4: {
        width: 812,
        height: 1080
      },
      5: {
        width: 480,
        height: 654
      },
      6: {
        width: 700,
        height: 834
      },
      7: {
        width: 1280,
        height: 720
      },
      8: {
        width: 363,
        height: 500
      },
      9: {
        width: 750,
        height: 1e3
      },
      10: {
        width: 600,
        height: 714
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
        text: text
      })
    };
    console.log(`[HtmlToImg] Sending POST request to: ${this.url}${type}`, data);
    try {
      const response = await axios.post(`${this.url}${type}`, data, {
        headers: this.headers
      });
      console.log("[HtmlToImg] POST request successful. Response data:", response.data);
      return response.data?.url;
    } catch (error) {
      console.error("[HtmlToImg] Error during API call:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const htmlToImg = new HtmlToImg();
  try {
    console.log("[handler] Received request with parameters:", params);
    const imageUrl = await htmlToImg.generate(params);
    if (imageUrl) {
      console.log("[handler] Image URL received:", imageUrl);
      const imageBuffer = await htmlToImg.getImageBuffer(imageUrl);
      res.setHeader("Content-Type", "image/png");
      console.log("[handler] Sending image buffer as response.");
      return res.status(200).send(imageBuffer);
    } else {
      console.warn("[handler] No image URL returned from the service.");
      res.status(400).json({
        error: "No image URL returned from the service"
      });
    }
  } catch (error) {
    console.error("[handler] Error generating fansign image:", error);
    res.status(500).json({
      error: "Failed to generate fansign image"
    });
  }
}