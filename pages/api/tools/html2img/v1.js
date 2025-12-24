import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class PlaywrightAPI {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
    };
  }
  async convertHTMLToImage({
    html
  }) {
    const code = `
      const { chromium } = require('playwright');
      (async () => {
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          try {
              await page.setContent(\`${html}\`);
              const buffer = await page.screenshot({ fullPage: true });
              console.log(buffer.toString('base64'));
          } catch (e) {
              console.error(e);
          } finally {
              await page.close();
              await browser.close();
          }
      })();
    `;
    try {
      const response = await axios.post(this.url, {
        code: code
      }, {
        headers: this.headers
      });
      const base64Image = response.data?.output?.trim();
      if (!base64Image) throw new Error("Failed to generate image");
      return Buffer.from(base64Image, "base64");
    } catch (error) {
      throw new Error("Error generating image: " + error.message);
    }
  }
  async uploadImage(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const playwrightService = new PlaywrightAPI();
    const imageBuffer = await playwrightService.convertHTMLToImage(params);
    const imageUrl = await playwrightService.uploadImage(imageBuffer);
    return res.status(200).json({
      url: imageUrl
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}