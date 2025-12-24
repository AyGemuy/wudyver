import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GTAFilter {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://www.gta-ai-filter.xyz",
      priority: "u=1, i",
      referer: "https://www.gta-ai-filter.xyz/gta-filter",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      cookie: "used_free_attempt=true",
      ...SpoofHead()
    };
  }
  async toBase64(imageUrl) {
    try {
      if (imageUrl.startsWith("data:")) {
        console.log("📝 Already base64...");
        return imageUrl;
      } else {
        console.log("🌐 Converting URL to base64...");
        const res = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          headers: {
            "user-agent": this.headers["user-agent"]
          }
        });
        const buf = Buffer.from(res.data);
        const mime = res.headers["content-type"] || "image/jpeg";
        const base64 = buf.toString("base64");
        return `data:${mime};base64,${base64}`;
      }
    } catch (err) {
      console.error("❌ Base64 error:", err.message);
      throw new Error(`Base64 failed: ${err.message}`);
    }
  }
  async generate({
    imageUrl,
    prompt = "Convert this image to GTA V artwork style, highly detailed cinematic quality, dramatic lighting, modern Los Santos atmosphere,",
    width = 640,
    height = 640,
    quality = "HD",
    guidance = 7.5
  }) {
    try {
      console.log("🎮 Starting GTA filter...");
      const base64Image = await this.toBase64(imageUrl);
      const data = {
        prompt: prompt,
        image: base64Image,
        dimensions: {
          width: width,
          height: height
        },
        quality: quality,
        guidance: guidance
      };
      console.log("🚀 Sending request...");
      const res = await axios.post("https://www.gta-ai-filter.xyz/api/transform", data, {
        headers: this.headers
      });
      console.log("✅ GTA filter completed!");
      return res.data;
    } catch (err) {
      console.error("❌ GTA filter failed:", err.message);
      if (err.response) {
        console.error("Response status:", err.response.status);
        console.error("Response data:", err.response.data);
        return {
          success: false,
          error: err.response.data || err.message,
          status: err.response.status
        };
      }
      throw err;
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
    const gta = new GTAFilter();
    const response = await gta.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}