import axios from "axios";
import FormData from "form-data";
import https from "https";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
const httpsAgent = new https.Agent({
  keepAlive: true
});
const commonHeaders = {
  accept: "*/*",
  "accept-language": "id-ID",
  origin: "https://www.seedream.best",
  priority: "u=1, i",
  referer: "https://www.seedream.best/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  ...SpoofHead()
};
class SeedreamAPI {
  constructor() {
    this.api = axios.create({
      baseURL: "https://www.seedream.best/api",
      headers: commonHeaders,
      httpsAgent: httpsAgent
    });
    console.log("SeedreamAPI instance created with curl-like headers (no cookies).");
  }
  async _upload(image) {
    console.log("Starting image upload process...");
    try {
      const form = new FormData();
      let imageBuffer;
      const filename = "image.jpg";
      if (typeof image === "string" && image.startsWith("http")) {
        console.log("Downloading image from URL...");
        const response = await axios.get(image, {
          responseType: "arraybuffer",
          httpsAgent: httpsAgent
        });
        imageBuffer = Buffer.from(response.data);
      } else if (typeof image === "string") {
        console.log("Decoding Base64 image...");
        imageBuffer = Buffer.from(image, "base64");
      } else if (image instanceof Buffer) {
        console.log("Using image from Buffer...");
        imageBuffer = image;
      } else {
        throw new Error("Unsupported image format. Use URL, Base64, or Buffer.");
      }
      form.append("file", imageBuffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      form.append("folder", "seedream/uploads");
      const response = await this.api.post("/storage/upload", form, {
        headers: {
          ...this.api.defaults.headers.common,
          ...form.getHeaders()
        }
      });
      if (!response.data?.url) {
        throw new Error("Upload successful, but no URL was returned.");
      }
      const uploadedUrl = response.data.url;
      console.log("Image uploaded successfully:", uploadedUrl);
      return uploadedUrl;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error during upload:", error.response?.data || error.message);
      } else {
        console.error("Generic error during upload:", error.message);
      }
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log("Starting generation process...");
    if (!prompt) {
      throw new Error("Prompt is a required field.");
    }
    try {
      const endpoint = imageUrl ? "/image-to-image" : "/image-to-image";
      console.log(`Using endpoint: ${endpoint}`);
      let finalImageUrl = null;
      if (imageUrl) {
        finalImageUrl = await this._upload(imageUrl);
      }
      const payload = {
        prompt: prompt,
        aspectRatio: rest.aspectRatio || "9:16",
        saveToStorage: rest.saveToStorage ?? true,
        ...finalImageUrl && {
          imageUrl: finalImageUrl
        },
        ...rest
      };
      console.log("Sending JSON payload to API:", payload);
      const response = await this.api.post(endpoint, payload, {
        headers: {
          ...this.api.defaults.headers.common,
          "content-type": "application/json"
        }
      });
      console.log("Generation successful.");
      return response.data || {};
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`API request failed with status ${error.response?.status}:`, error.response?.data || error.message);
      } else {
        console.error("Error during generation:", error.message);
      }
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new SeedreamAPI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}