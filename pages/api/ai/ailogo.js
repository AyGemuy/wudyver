import fetch from "node-fetch";
import crypto from "crypto";
class LogoScraper {
  constructor() {
    this.BASE_URL = "https://us-central1-aiartandroid.cloudfunctions.net/";
    this.PASSWORD = "5046137199641827";
    this.SALT = "aiBrightProxyKey";
    this.ITERATIONS = 1e3;
    this.KEY_LENGTH = 256;
    this.DIGEST = "sha256";
    this.IV = Buffer.from("ailogokerroroayt", "utf8");
    this.ALGORITHM = "aes-256-cbc";
  }
  encryptToken(plaintext) {
    const key = crypto.pbkdf2Sync(this.PASSWORD, this.SALT, this.ITERATIONS, this.KEY_LENGTH / 8, this.DIGEST);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, this.IV);
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    return Buffer.from(encrypted, "base64").toString("base64").replace(/=+$/, "");
  }
  _buildPrompt({
    realPrompt,
    style,
    prompt,
    negativePrompt
  }) {
    if (realPrompt && realPrompt.trim()) return realPrompt.trim();
    let built = `Create One logo for this prompt:-> ${style || ""} ${prompt || ""}`.trim();
    if (negativePrompt && negativePrompt.trim()) {
      built += `\n\nExclude these:-> ${negativePrompt.trim()}`;
    }
    return built;
  }
  async _resolveImage(image) {
    if (!image) return null;
    if (Buffer.isBuffer(image)) {
      return image.toString("base64");
    }
    if (typeof image === "string") {
      const trimmed = image.trim();
      if (/^[A-Za-z0-9+/=]+$/.test(trimmed) || trimmed.includes("base64,")) {
        return trimmed.split(",").pop();
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
          const res = await fetch(trimmed);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());
          return buffer.toString("base64");
        } catch (err) {
          throw new Error(`Gagal download gambar: ${err.message}`);
        }
      }
      throw new Error("Format image tidak valid: harus URL, Base64, atau Buffer");
    }
    throw new Error("Tipe image tidak didukung (harus string atau Buffer)");
  }
  _extractBase64Image(data) {
    if (!data || typeof data !== "string") return null;
    if (data.includes("base64,")) {
      return data.split("base64,")[1];
    }
    if (data.length > 100 && /^[A-Za-z0-9+/=]+$/.test(data)) {
      return data;
    }
    return null;
  }
  async generate({
    realPrompt = "",
    style = "",
    prompt = "",
    negativePrompt = "",
    image = null
  }) {
    if (!prompt && !realPrompt) {
      throw new Error("Prompt atau realPrompt wajib diisi.");
    }
    const endpoint = `${this.BASE_URL}AiLogoMaker`;
    const utcSeconds = Math.floor(Date.now() / 1e3);
    const plaintext = `random${utcSeconds}`;
    const token = this.encryptToken(plaintext);
    const finalPrompt = this._buildPrompt({
      realPrompt: realPrompt,
      style: style,
      prompt: prompt,
      negativePrompt: negativePrompt
    });
    let base64Image = null;
    if (image) {
      base64Image = await this._resolveImage(image);
    }
    const body = base64Image ? JSON.stringify({
      contents: [{
        role: "user",
        parts: [{
          type: "input_text",
          text: finalPrompt
        }, {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${base64Image}`
        }]
      }]
    }) : JSON.stringify({
      prompt: finalPrompt
    });
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
    try {
      console.log(`[UTC] ${utcSeconds} → plaintext: ${plaintext}`);
      console.log(`[TOKEN] ${token}`);
      console.log(`[PROMPT] ${finalPrompt.substring(0, 80)}...`);
      if (base64Image) console.log(`[IMAGE] Base64 (${base64Image.length} chars)`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: body
      });
      const text = await response.text();
      if (!response.ok) {
        console.error(`[HTTP ${response.status}] ${text}`);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const base64Result = this._extractBase64Image(text);
      if (!base64Result) {
        throw new Error("Response tidak mengandung base64 image yang valid");
      }
      const imageBuffer = Buffer.from(base64Result, "base64");
      console.log(`[SUCCESS] Image buffer created (${imageBuffer.length} bytes)`);
      return imageBuffer;
    } catch (error) {
      throw new Error(`Generate failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const api = new LogoScraper();
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}