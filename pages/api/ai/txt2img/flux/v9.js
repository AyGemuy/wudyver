import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class FluxGenerator {
  constructor() {
    this.fluxURL = "https://www.omnihuman1.org/api/cloudflare/flux";
    this.uploadURL = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.omnihuman1.org",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.omnihuman1.org/ai-image-generator",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async generate({
    prompt,
    count = "1",
    ...rest
  }) {
    try {
      const payload = {
        model: "turbo",
        prompt: prompt,
        style: "auto",
        count: count,
        imageRatio: "2:3",
        ...rest
      };
      console.log(`Generating ${count} images: "${prompt}"`);
      const response = await axios.post(this.fluxURL, payload, {
        headers: this.headers
      });
      if (!response.data.images || response.data.images.length === 0) {
        throw new Error("No images generated");
      }
      console.log(`Generated ${response.data.images.length} images`);
      return response.data.images;
    } catch (error) {
      console.error("Generate error:", error.message);
      throw error;
    }
  }
  async upload(img, idx) {
    try {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const form = new FormData();
      form.append("file", buffer, {
        filename: `flux-${Date.now()}-${idx}.png`,
        contentType: "image/png"
      });
      console.log(`Uploading image ${idx + 1}...`);
      const res = await axios.post(this.uploadURL, form, {
        headers: {
          ...form.getHeaders(),
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      console.log(`Uploaded image ${idx + 1}`);
      return {
        ok: true,
        result: res.data.result,
        idx: idx
      };
    } catch (error) {
      console.error(`Upload error ${idx + 1}:`, error.message);
      return {
        ok: false,
        error: error.message,
        idx: idx
      };
    }
  }
  async uploadAll(images) {
    const results = [];
    let idx = 0;
    for (const img of images) {
      const res = await this.upload(img, idx);
      results.push(res);
      idx++;
    }
    return results;
  }
  async flux({
    prompt,
    ...rest
  }) {
    try {
      const images = await this.generate({
        prompt: prompt,
        ...rest
      });
      const uploads = await this.uploadAll(images);
      const successResults = uploads.filter(u => u.ok).map(u => u.result);
      const failed = uploads.filter(u => !u.ok);
      return {
        result: successResults,
        generated: images.length,
        uploaded: successResults.length,
        failed: failed.length,
        success: successResults.length > 0
      };
    } catch (error) {
      console.error("Flux error:", error.message);
      return {
        result: [],
        generated: 0,
        uploaded: 0,
        failed: 0,
        success: false,
        error: error.message
      };
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
    const generator = new FluxGenerator();
    const response = await generator.flux(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}