import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class ImgSys {
  constructor() {
    this.baseUrl = "https://imgsys.org/api";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
      "content-type": "application/json",
      "accept-language": "id-ID",
      referer: "https://imgsys.org/",
      origin: "https://imgsys.org",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=0",
      te: "trailers"
    };
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    return {
      origin: "https://imgsys.org",
      referer: "https://imgsys.org/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
  }
  async imgsysPost({
    prompt
  }) {
    try {
      console.log(`Sending request to initiate image generation with prompt: "${prompt}"`);
      const data = JSON.stringify({
        prompt: prompt
      });
      const config = {
        method: "POST",
        url: `${this.baseUrl}/initiate`,
        headers: this.headers,
        data: data
      };
      const api = await axios.request(config);
      console.log("Image initiation response received:", api.data);
      return api.data;
    } catch (error) {
      console.error(`Error in imgsysPost: ${error.message}`);
      throw new Error(`Error in imgsysPost: ${error.message}`);
    }
  }
  async imgsysCreate({
    prompt
  }) {
    try {
      console.log(`Starting image creation with prompt: "${prompt}"`);
      const data = await this.imgsysPost({
        prompt: prompt
      });
      const job = data.requestId;
      console.log(`Polling for image generation with job ID: ${job}`);
      let img;
      let isImageReady = false;
      while (!isImageReady) {
        img = await axios.get(`${this.baseUrl}/get?requestId=${job}`, {
          headers: this.buildHeaders()
        });
        if (img.data.results && img.data.results.length > 0) {
          isImageReady = true;
          console.log("Image generation complete. Image data:", img.data);
        } else {
          console.log("Image still being processed, retrying in 3 seconds...");
          await new Promise(resolve => setTimeout(resolve, 3e3));
        }
      }
      return img.data;
    } catch (error) {
      console.error(`Error in imgsysCreate: ${error.message}`);
      throw new Error(`Error in imgsysCreate: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const imgSys = new ImgSys();
  try {
    const data = await imgSys.imgsysCreate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}