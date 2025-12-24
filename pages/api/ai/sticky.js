import axios from "axios";
import ApiKey from "@/configs/api-key";
class Sticky {
  constructor() {
    this.headersGenerate = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: ApiKey.openai?.[2],
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://sticky.cool",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://sticky.cool/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.headersSticky = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      apikey: "0b584babc5d2c068d08b8e4f120f1183",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://sticky.cool",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://sticky.cool/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateImage(prompt, num) {
    const url = "https://api.openai.com/v1/images/generations";
    const data = {
      prompt: prompt,
      n: num,
      response_format: "url"
    };
    try {
      const response = await axios.post(url, data, {
        headers: this.headersGenerate
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async sendImageData(imgList) {
    const url = "https://api.stipop.com/v4.0.1/sticky/image";
    const data = {
      imgList: imgList.map(img => ({
        url: img.url
      }))
    };
    try {
      const response = await axios.post(url, data, {
        headers: this.headersSticky
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const sticky = new Sticky();
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  switch (action) {
    case "generate":
      const {
        prompt,
        num
      } = params;
      if (!prompt || !num) {
        return res.status(400).json({
          error: "Missing prompt or num parameter"
        });
      }
      try {
        const result = await sticky.generateImage(prompt, parseInt(num));
        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({
          error: "Error generating image"
        });
      }
    case "sticky":
      const dataSticky = req.method === "GET" ? {
        url: params.url
      } : {
        imgList: params.imgList ? params.imgList.map(img => ({
          url: img.url
        })) : []
      };
      if (req.method === "GET" && !dataSticky.url) {
        return res.status(400).json({
          error: "Missing url parameter"
        });
      }
      if (req.method === "POST" && (!dataSticky.imgList || !Array.isArray(dataSticky.imgList))) {
        return res.status(400).json({
          error: "Invalid image list"
        });
      }
      try {
        const result = await sticky.sendImageData(req.method === "GET" ? [dataSticky] : dataSticky.imgList);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({
          error: "Error sending image data"
        });
      }
    default:
      return res.status(400).json({
        error: "Unknown action"
      });
  }
}