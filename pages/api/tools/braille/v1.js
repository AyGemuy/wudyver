import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class BrailleGenerator {
  constructor() {
    this.baseUrl = "https://lazesoftware.com/en/tool/brailleaagen";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://lazesoftware.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async generateFromImage(imageUrl, options = {}) {
    try {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      const form = new FormData();
      const defaultOptions = {
        scaleType: "ratio",
        scaleRatio: "100",
        brightness: "0",
        contrast: "0",
        mean: "1",
        rotate: "0degrees",
        flip: "none",
        fill: "minimum"
      };
      const finalOptions = {
        ...defaultOptions,
        ...options
      };
      form.append("srcFile", new Blob([imageBuffer], {
        type: imageResponse.headers["content-type"]
      }), "image.jpg");
      Object.entries(finalOptions).forEach(([key, value]) => form.append(key, value));
      const response = await axios.post(`${this.baseUrl}/imageexec`, form, {
        headers: {
          ...this.headers,
          ...form.headers
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error generating Braille from image: ${error.message}`);
    }
  }
  async generateFromText(text, options = {}) {
    try {
      const defaultOptions = {
        preventGarbled: "disable",
        font: "ipaexg",
        fontFamily: "sans_serif",
        size: "40",
        textAlign: "left",
        rotate: "0degrees",
        flip: "none",
        fill: "minimum"
      };
      const finalOptions = {
        ...defaultOptions,
        ...options,
        text: text
      };
      const data = new URLSearchParams(finalOptions);
      const response = await axios.post(`${this.baseUrl}/textexec`, data, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error generating Braille from text: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      imageUrl,
      text,
      ...options
    } = req.method === "GET" ? req.query : req.body;
    const brailleGen = new BrailleGenerator();
    switch (action) {
      case "image":
        if (!imageUrl) return res.status(400).json({
          error: "imageUrl is required"
        });
        const imageResult = await brailleGen.generateFromImage(imageUrl, options);
        return res.status(200).json(imageResult);
      case "text":
        if (!text) return res.status(400).json({
          error: "text is required"
        });
        const textResult = await brailleGen.generateFromText(text, options);
        return res.status(200).json(textResult);
      default:
        return res.status(400).json({
          error: "Invalid action. Use 'image' or 'text'."
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}