import axios from "axios";
class DaohangGen {
  constructor() {
    this.base = "https://www.daohang.buzz/api/generate";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  async img(src) {
    try {
      console.log("🔄 Processing image source...");
      let b64 = "";
      let mime = "image/jpeg";
      if (Buffer.isBuffer(src)) {
        b64 = src.toString("base64");
      } else if (typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"))) {
        console.log("🌐 Downloading image from URL...");
        const res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        b64 = Buffer.from(res.data).toString("base64");
        mime = res.headers["content-type"] || mime;
      } else {
        b64 = src.toString();
      }
      return b64.includes("data:image") ? b64 : `data:${mime};base64,${b64}`;
    } catch (e) {
      console.error("❌ Image processing failed:", e.message);
      throw e;
    }
  }
  async req(payload) {
    console.log("🚀 Sending request to API...");
    return await axios.post(this.base, payload, {
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.daohang.buzz",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.daohang.buzz/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.ua
      }
    });
  }
  pars(b64String) {
    console.log("📦 Parsing response data...");
    const match = b64String.match(/^data:(.+);base64,(.+)$/);
    const contentType = match?.[1] || "image/png";
    const rawData = match?.[2] || b64String;
    const buffer = Buffer.from(rawData, "base64");
    return {
      buffer: buffer,
      contentType: contentType
    };
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    const start = Date.now();
    console.log(`\n============== START TASK ==============`);
    try {
      const finalPrompt = prompt || "Cyberpunk masterpiece";
      const inputImage = imageUrl ? await this.img(imageUrl) : null;
      if (!inputImage) console.log('ℹ️ No image provided/detected, running Text-to-Image mode.');
      const payload = {
        prompt: finalPrompt,
        ...(inputImage && { image: inputImage }),
        ...rest
      };
      const {
        data
      } = await this.req(payload);
      const isSuccess = data?.success ?? false;
      const resultImg = data?.generatedImage;
      if (!isSuccess || !resultImg) {
        throw new Error("API Response indicated failure or empty image");
      }
      const result = this.pars(resultImg);
      console.log(`✅ Task Finished in ${(Date.now() - start) / 1e3}s`);
      return result;
    } catch (error) {
      console.error(`💥 Error in generate: ${error?.message || "Unknown error"}`);
      return {
        buffer: null,
        contentType: null,
        error: error?.response?.data || error.message
      };
    } finally {
      console.log(`============== END TASK ==============\n`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new DaohangGen();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}