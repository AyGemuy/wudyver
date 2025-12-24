import crypto from "crypto";
import {
  v4 as uuidv4
} from "uuid";
import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class Ideogram {
  constructor(opts = {}) {
    this.IV = "Hid8sUW70idf2Duv";
    this.key = "X7aB9cD2EfGhJ5Kq";
    this.salt = "9371052846137285";
    this.defaults = {
      ratio: "ASPECT_1_1",
      detail: "50",
      magic: "AUTO",
      neg: "",
      res: "50",
      speed: "V_1",
      style: "AUTO"
    };
    this.valid = {
      ratios: ["ASPECT_10_16", "ASPECT_16_10", "ASPECT_9_16", "ASPECT_16_9", "ASPECT_3_2", "ASPECT_2_3", "ASPECT_4_3", "ASPECT_3_4", "ASPECT_1_1", "ASPECT_1_3", "ASPECT_3_1"],
      magics: ["AUTO", "ON", "OFF"]
    };
  }
  check({
    ratio,
    magic
  } = {}) {
    const errs = [];
    ratio && !this.valid.ratios.includes(ratio) && errs.push(`Invalid ratio: ${ratio}. Valid: ${this.valid.ratios.join(", ")}`);
    magic && !this.valid.magics.includes(magic) && errs.push(`Invalid magic: ${magic}. Valid: ${this.valid.magics.join(", ")}`);
    if (errs.length) throw new Error(`Validation errors:\n${errs.join("\n")}`);
  }
  str2buf(str) {
    return Buffer.from(str, "utf8");
  }
  buf2b64(buf) {
    return buf.toString("base64");
  }
  b642buf(b64) {
    return Buffer.from(b64, "base64");
  }
  async getKey(pwd, salt, iter, len) {
    console.log("Deriving key...");
    return new Promise((res, rej) => {
      crypto.pbkdf2(pwd, salt, iter, len, "sha1", (err, key) => err ? rej(err) : res(key));
    });
  }
  hash(algo, data) {
    console.log(`Hashing with ${algo}...`);
    return crypto.createHash(algo).update(data).digest();
  }
  async enc(msg) {
    try {
      console.log("Starting encryption...");
      const ts = Date.now();
      const id = `ideogram|${ts}|nw_connection_copy_connected_local_endpoint_block_invoke|${uuidv4()}`;
      const model = {
        messages: msg,
        authorization: id
      };
      const json = JSON.stringify(model);
      const keyBuf = this.str2buf(this.key);
      const keyHash = this.hash("sha256", keyBuf);
      const derived = await this.getKey(this.salt, keyHash, 1e3, 256 / 8);
      const b64Key = this.buf2b64(derived);
      const keyBuf2 = this.str2buf(b64Key);
      const secret = this.hash("sha256", keyBuf2);
      const iv = this.b642buf(this.IV);
      const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv, {
        authTagLength: 16
      });
      const plain = this.str2buf(json);
      let enc = cipher.update(plain);
      enc = Buffer.concat([enc, cipher.final()]);
      const tag = cipher.getAuthTag();
      const fullEnc = Buffer.concat([enc, tag]);
      const encB64 = this.buf2b64(fullEnc);
      console.log("Encryption completed");
      return this.IV + encB64;
    } catch (e) {
      console.error("Encryption failed:", e?.message || "Unknown error");
      return null;
    }
  }
  async uploadImg(img) {
    console.log("Uploading image...");
    try {
      const form = new FormData();
      form.append("file", img, {
        filename: `image-${uuidv4()}.jpg`,
        contentType: "image/jpeg"
      });
      const {
        data
      } = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/upload`, form, {
        headers: form.getHeaders()
      });
      console.log("Image uploaded successfully");
      return data?.result || null;
    } catch (e) {
      console.error("Image upload failed:", e?.message || "Unknown error");
      return null;
    }
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  } = {}) {
    console.log("Starting generation process...");
    try {
      this.check(rest);
      const opts = {
        ...this.defaults,
        ...rest,
        type: imageUrl ? "ImageToImage" : "TextToImage"
      };
      let img = "";
      if (imageUrl) {
        if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
          img = imageUrl;
        } else {
          const buffer = typeof imageUrl === "string" ? this.b642buf(imageUrl) : imageUrl instanceof Buffer ? imageUrl : null;
          if (!buffer) throw new Error("Invalid imageUrl format");
          img = await this.uploadImg(buffer);
          if (!img) throw new Error("Failed to upload image");
        }
      }
      const msg = {
        ratio: opts.ratio,
        detail: opts.detail,
        magic: opts.magic,
        neg: opts.neg,
        prompt: prompt || "default prompt",
        type: opts.type,
        res: opts.res,
        speed: opts.speed,
        style: opts.style,
        img: img
      };
      console.log("Request payload prepared:", {
        ...msg,
        img: img ? "[Image Data]" : ""
      });
      const enc = await this.enc(msg);
      if (!enc) throw new Error("Encryption failed");
      const headers = {
        "User-Agent": "okhttp/3.14.9",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        ...SpoofHead()
      };
      console.log("Sending request to API...");
      const {
        data
      } = await axios.post("https://us-central1-chatbotandroid-3894d.cloudfunctions.net/chatbotandroid", {
        data: enc
      }, {
        headers: headers
      });
      console.log("Request successful, received response");
      return data?.result || null;
    } catch (e) {
      console.error("Generation failed:", e?.message || "Unknown error");
      return null;
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
    const api = new Ideogram();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}