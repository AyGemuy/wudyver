import axios from "axios";
import FormData from "form-data";
class Image2Prompt {
  constructor() {
    this.apiUrl = "https://image2prompt.net/api/image2prompt/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://image2prompt.net",
      priority: "u=1, i",
      referer: "https://image2prompt.net/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async describeImage({
    imageUrl,
    prompt = "Gambar apa itu?",
    ...rest
  }) {
    try {
      console.log(`🔍 Mendeskripsikan gambar dengan prompt: "${prompt}"`);
      const imageBuffer = await this.uploadImageFromUrl(imageUrl);
      const fileExt = this._getFileExtension(imageUrl);
      return await this._sendImageRequest(imageBuffer, {
        filename: `image.${fileExt}`,
        contentType: `image/${fileExt}`,
        prompt: prompt,
        ...rest
      });
    } catch (error) {
      console.error("[Image2Prompt] Error describing image:", error);
      throw error;
    }
  }
  async uploadImageFromUrl(imageUrl) {
    try {
      console.log(`📤 Mengunggah gambar dari URL: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error("[Image2Prompt] Error uploading image:", error);
      throw error;
    }
  }
  _getFileExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split(".").pop().toLowerCase() || "webp";
    } catch {
      return "webp";
    }
  }
  async _sendImageRequest(imageBuffer, options = {}) {
    try {
      const formData = new FormData();
      formData.append("image", imageBuffer, {
        filename: options.filename || "image.webp",
        contentType: options.contentType || "image/webp"
      });
      formData.append("model", options.model || "general");
      formData.append("language", options.language || "English");
      if (options.prompt) formData.append("prompt", options.prompt);
      if (options.additionalParams) {
        for (const [key, value] of Object.entries(options.additionalParams)) {
          formData.append(key, value);
        }
      }
      const formHeaders = {
        ...this.headers,
        "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`,
        ...formData.getHeaders()
      };
      const response = await axios.post(this.apiUrl, formData, {
        headers: formHeaders,
        timeout: options.timeout || 3e4
      });
      return response.data;
    } catch (error) {
      console.error("[Image2Prompt] Request error:", error);
      throw error;
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
    const describer = new Image2Prompt();
    const response = await describer.describeImage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}