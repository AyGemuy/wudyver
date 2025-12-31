import axios from "axios";
import {
  createDecipheriv,
  createCipheriv,
  createHash
} from "crypto";
class CryptoHelper {
  constructor() {
    this.KEY_STRING = "pX7!j&Kd#2q9*zL5@vRtM8bWcE4sA6yU";
    this.IV_STRING = "N3$fZ7pQ9@xT4vB2";
    this.NULL_CHECK_STRING = "jNAfDbKLlqL/BVZ1TUnrtA==";
  }
  _hexToBytes(hexString) {
    return Buffer.from(hexString, "hex");
  }
  _createKey() {
    const hash = createHash("sha256").update(this.KEY_STRING).digest("hex");
    return this._hexToBytes(hash);
  }
  _createIV() {
    const hash = createHash("sha256").update(this.IV_STRING).digest("hex");
    return this._hexToBytes(hash.substring(0, 32));
  }
  decrypt(encryptedBase64String) {
    if (!encryptedBase64String || encryptedBase64String.trim() === this.NULL_CHECK_STRING) return "null";
    try {
      const decipher = createDecipheriv("aes-256-cbc", this._createKey(), this._createIV());
      let decrypted = decipher.update(Buffer.from(encryptedBase64String.trim(), "base64"));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString("utf8").trim();
    } catch (error) {
      return "decryption_failed";
    }
  }
  customEncrypt(text) {
    if (!text) return "";
    try {
      const cipher = createCipheriv("aes-256-cbc", this._createKey(), this._createIV());
      let encrypted = cipher.update(text.trim(), "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (error) {
      return "";
    }
  }
}
class AzureSora {
  constructor() {
    this.crypto = new CryptoHelper();
    this.apiKey = null;
    this.config = {
      clientAuth: "b5ec3279-3868-4780-8856-589086a169c4",
      endpoints: {
        localization: "https://api.odamobil.com/global/localization",
        azure: "https://bilgi-mbesubm5-eastus2.cognitiveservices.azure.com/openai/v1/video"
      }
    };
  }
  _log(level, msg, ctx = "SORA") {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${ctx}] ${msg}`);
  }
  async _getKey() {
    if (this.apiKey) return this.apiKey;
    try {
      this._log("info", "Fetching Sora API Key");
      const response = await axios.post(this.config.endpoints.localization, {
        key: this.crypto.customEncrypt("sona_azure_sora_key")
      }, {
        headers: {
          "Content-Type": "application/json",
          Authorization: this.config.clientAuth
        }
      });
      const decrypted = this.crypto.decrypt(response.data?.result?.key);
      if (decrypted && decrypted !== "null") {
        this.apiKey = decrypted;
        return decrypted;
      }
    } catch (e) {
      this._log("error", `Key recovery failed: ${e.message}`);
    }
    return null;
  }
  async generate({
    prompt = "",
    aspectRatio = "16:9",
    ...rest
  }) {
    const result = {
      success: false,
      mode: "sora",
      data: null,
      error: null
    };
    try {
      if (!prompt) throw new Error("Prompt is required");
      const apiKey = await this._getKey();
      const dims = {
        "16:9": [854, 480],
        "1:1": [480, 480],
        "9:16": [480, 854]
      } [aspectRatio] || [854, 480];
      this._log("info", "Initiating Sora Generation");
      const response = await axios.post(`${this.config.endpoints.azure}/generations/jobs?api-version=preview`, {
        prompt: prompt,
        width: dims[0],
        height: dims[1],
        model: "sora",
        ...rest
      }, {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey
        }
      });
      result.data = response.data;
      result.success = !!result.data && !result.data.error;
    } catch (e) {
      result.error = e.response?.data?.error?.message || e.message;
      this._log("error", result.error);
    }
    return result;
  }
  async status({
    task_id: id = ""
  }) {
    const result = {
      success: false,
      mode: "sora",
      data: null,
      error: null
    };
    try {
      if (!id) throw new Error("Task ID is required");
      const apiKey = await this._getKey();
      this._log("info", `Checking Sora status for ID: ${id}`);
      const response = await axios.get(`${this.config.endpoints.azure}/generations/jobs/${id}?api-version=preview`, {
        headers: {
          "api-key": apiKey
        }
      });
      let data = response.data;
      if (data?.status === "succeeded" && data?.generations?.[0]?.id) {
        this._log("info", "Generation Succeeded. Downloading video content...");
        const vidId = data.generations[0].id;
        const vidResponse = await axios.get(`${this.config.endpoints.azure}/generations/${vidId}/content/video?api-version=preview`, {
          headers: {
            "api-key": apiKey
          },
          responseType: "arraybuffer"
        });
        data.base64 = Buffer.from(vidResponse.data).toString("base64");
      }
      result.data = data;
      result.success = true;
    } catch (e) {
      result.error = e.response?.data?.error?.message || e.message;
      this._log("error", result.error);
    }
    return result;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status"]
    });
  }
  const api = new AzureSora();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'"
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'"
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}