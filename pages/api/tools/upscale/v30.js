import axios from "axios";
import ApiKey from "@/configs/api-key";
class ReplicateClient {
  constructor() {
    this.cfg = {
      base: "https://api.replicate.com/v1",
      keys: ApiKey.replicate,
      model: "flux-kontext-apps/restore-image",
      idx: 0
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toISOString().split("T")[1].split(".")[0];
    const icon = type === "ERR" ? "❌" : type === "OK" ? "✅" : "ℹ️";
    console.log(`[${time}] ${icon} [${type}] ${msg}`);
  }
  key() {
    return this.cfg.keys[this.cfg.idx];
  }
  rotate() {
    const old = this.cfg.idx;
    this.cfg.idx = (this.cfg.idx + 1) % this.cfg.keys.length;
    this.log(`Rotate Key: Index ${old} -> ${this.cfg.idx}`, "WARN");
  }
  async getB64(url) {
    try {
      this.log(`Downloading: ${url.slice(0, 40)}...`);
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const mime = res.headers["content-type"] || "image/png";
      const b64 = Buffer.from(res.data).toString("base64");
      this.log(`Download OK (${res.data.length} bytes)`, "OK");
      return `data:${mime};base64,${b64}`;
    } catch (e) {
      this.log(`Download Fail: ${e.message}`, "ERR");
      throw e;
    }
  }
  async solve(input) {
    try {
      if (Buffer.isBuffer(input)) {
        this.log("Input is Buffer -> converting...");
        return `data:image/png;base64,${input.toString("base64")}`;
      }
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          return await this.getB64(input);
        }
        if (input.startsWith("data:")) {
          this.log("Input is Base64 String");
          return input;
        }
      }
      throw new Error("Format Image Invalid (Must be Buffer, URL, or Base64)");
    } catch (e) {
      this.log(`Solve Image Error: ${e.message}`, "ERR");
      return null;
    }
  }
  async req(method, endpoint, data = null) {
    let attempts = 0;
    const max = this.cfg.keys.length;
    while (attempts < max) {
      try {
        const token = this.key();
        const url = endpoint.startsWith("http") ? endpoint : `${this.cfg.base}${endpoint}`;
        this.log(`${method.toUpperCase()} ${url}`);
        const res = await axios({
          method: method,
          url: url,
          data: data,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "wait"
          }
        });
        return res?.data;
      } catch (err) {
        const status = err.response?.status || 0;
        const detail = err.response?.data?.detail || err.message;
        this.log(`Req Error (${status}): ${detail}`, "ERR");
        if (status === 401 || status === 429) {
          this.rotate();
          attempts++;
        } else {
          throw new Error(`API Fail: ${detail}`);
        }
      }
    }
    throw new Error("All Keys Exhausted");
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    this.log("--- GENERATE START ---");
    try {
      const imgParams = await this.solve(imageUrl);
      if (!imgParams) throw new Error("Image Processing Failed");
      const [owner, name] = this.cfg.model.split("/");
      const path = `/models/${owner}/${name}/predictions`;
      const result = await this.req("post", path, {
        input: {
          input_image: imgParams,
          ...rest
        }
      });
      this.log("--- GENERATE DONE ---", "OK");
      return result;
    } catch (e) {
      this.log(`FATAL ERROR: ${e.message}`, "ERR");
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new ReplicateClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}