import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class DrawingGenerator {
  constructor() {
    this.baseURL = "https://picturetodrawing.com";
    this.setHeaders();
  }
  setHeaders() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: this.baseURL,
      priority: "u=1, i",
      referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async processImage(imageData) {
    try {
      console.log("Processing image data...");
      if (typeof imageData === "string") {
        if (imageData.startsWith("data:")) {
          const matches = imageData.match(/^data:image\/\w+;base64,(.+)$/);
          if (matches?.[1]) {
            return matches[1];
          }
          throw new Error("Invalid data URL format");
        } else if (imageData.startsWith("http")) {
          console.log("Downloading image from URL...");
          const response = await axios.get(imageData, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          return Buffer.from(response.data).toString("base64");
        } else {
          return imageData;
        }
      } else if (Buffer.isBuffer(imageData)) {
        return imageData.toString("base64");
      } else {
        throw new Error("Unsupported image data type");
      }
    } catch (error) {
      console.error("Image processing error:", error.message);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }
  async generateDrawing({
    style = "pencil-sketch",
    model = "nano-banana",
    imageUrl: image,
    ratio = null,
    ...options
  }) {
    try {
      console.log("Generating drawing...");
      console.log("Style:", style, "Model:", model);
      const processedImage = await this.processImage(image);
      const payload = {
        style: style,
        model: model,
        image: processedImage,
        ratio: ratio,
        ...options
      };
      console.log("Sending request to drawing API...");
      const response = await axios.post(`${this.baseURL}/api/gen-drawing`, payload, {
        headers: this.headers,
        timeout: 6e4
      });
      console.log("Drawing generation response received");
      console.log("Response data:", response.data);
      return response.data;
    } catch (error) {
      console.error("Drawing generation error:", error.response?.data || error.message);
      throw new Error(`Drawing generation failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const api = new DrawingGenerator();
    const response = await api.generateDrawing(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error.response?.data?.error || error.message || "Internal Server Error";
    return res.status(500).json({
      error: errorMessage
    });
  }
}