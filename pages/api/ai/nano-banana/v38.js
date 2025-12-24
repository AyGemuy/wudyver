import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Nano {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://nanobanana.subnp.com",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://nanobanana.subnp.com",
        referer: "https://nanobanana.subnp.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        priority: "u=1, i"
      }
    }));
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  parseDataUri(dataUri) {
    try {
      if (!dataUri || typeof dataUri !== "string" || !dataUri.startsWith("data:")) {
        return null;
      }
      const [header, base64Data] = dataUri.split(",");
      const contentType = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
      const buffer = Buffer.from(base64Data, "base64");
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (e) {
      this.log(`Parse Error: ${e.message}`, "ERR");
      return null;
    }
  }
  async to64(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string" && input.startsWith("http")) {
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data).toString("base64");
      }
      if (typeof input === "string") {
        return input.replace(/^data:image\/\w+;base64,/, "");
      }
      return null;
    } catch (e) {
      this.log(`Convert Fail: ${e.message}`, "WARN");
      return null;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ratio,
    ...rest
  }) {
    const validRatios = ["1:1", "16:9", "9:16"];
    const selectedRatio = validRatios.find(r => r === ratio) || "1:1";
    const payload = {
      prompt: prompt || "art",
      ratio: selectedRatio,
      ...rest
    };
    const inputs = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
    let count = 0;
    this.log(`Processing... Ratio: ${selectedRatio}`);
    for (const raw of inputs) {
      try {
        const b64 = await this.to64(raw);
        if (b64) {
          count++;
          const key = count === 1 ? "image" : `image${count}`;
          payload[key] = b64;
        }
      } catch (e) {
        this.log(`Skip Img: ${e.message}`, "WARN");
      }
    }
    try {
      this.log(`Generating (${payload.image ? "I2I" : "T2I"})...`);
      const {
        data
      } = await this.client.post("/api/nanobanana", payload);
      if (data?.result) {
        this.log("Success. Parsing result...");
        const output = this.parseDataUri(data.result);
        if (output) {
          return output;
        } else {
          this.log("Gagal parsing format result", "ERR");
          return null;
        }
      } else {
        this.log("No result in response", "WARN");
        return null;
      }
    } catch (e) {
      this.log(`API Error: ${e.message}`, "ERR");
      return null;
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
  const api = new Nano();
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