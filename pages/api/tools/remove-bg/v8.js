import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class BackgroundRemover {
  constructor() {}
  async fetchImageBuffer(imageUrl) {
    try {
      console.log("Fetching image buffer...");
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      if (response.status !== 200) throw new Error("Failed to fetch image");
      const contentType = response.headers["content-type"] || "image/jpeg";
      const ext = contentType.split("/")[1] || "jpg";
      console.log(`Image fetched. Type: ${contentType}, Extension: ${ext}`);
      return {
        buffer: response.data,
        type: contentType,
        ext: ext
      };
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async removeBackground({
    imageUrl
  }) {
    try {
      console.log("Starting background removal process...");
      const {
        buffer,
        type,
        ext
      } = await this.fetchImageBuffer(imageUrl);
      const form = new FormData();
      const blob = new Blob([buffer], {
        type: type
      });
      form.append("file", blob, `image.${ext}`);
      const headers = {
        ...form.headers,
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: "https://text2img.vip",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://text2img.vip/dashboard/playground/remove-bg",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      };
      const response = await axios.post("https://text2img.vip/api/remove-bg", form, {
        headers: headers,
        maxRedirects: 0
      });
      console.log("Background removal successful");
      return response.data;
    } catch (error) {
      console.error("Error in background removal process:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const remover = new BackgroundRemover();
    const result = await remover.removeBackground(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}