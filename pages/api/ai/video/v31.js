import fetch from "node-fetch";
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
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substr(i, 2), 16));
    }
    return Buffer.from(bytes);
  }
  _createKey() {
    const hash = createHash("sha256").update(this.KEY_STRING).digest("hex");
    return this._hexToBytes(hash);
  }
  _createIV() {
    const hash = createHash("sha256").update(this.IV_STRING).digest("hex");
    const trimmedHash = hash.substring(0, 32);
    return this._hexToBytes(trimmedHash);
  }
  _sanitizeString(text) {
    if (!text) return "";
    return text.trim().replace(/<[^>]*>/g, "");
  }
  decrypt(encryptedBase64String) {
    if (!encryptedBase64String) return "";
    const trimmed = encryptedBase64String.trim();
    if (trimmed === this.NULL_CHECK_STRING) {
      return "null";
    }
    try {
      const key = this._createKey();
      const iv = this._createIV();
      const encrypted = Buffer.from(trimmed, "base64");
      const decipher = createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString("utf8").trim();
    } catch (error) {
      return "Password is incorrect";
    }
  }
  customEncrypt(text) {
    if (!text) return "";
    const sanitized = this._sanitizeString(text);
    if (!sanitized) return "";
    try {
      const key = this._createKey();
      const iv = this._createIV();
      const cipher = createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(sanitized, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (error) {
      return "";
    }
  }
}
class TextToVideoAI {
  constructor(config) {
    this.cryptoHelper = new CryptoHelper();
    this.config = {
      clientAuthKey: "b5ec3279-3868-4780-8856-589086a169c4",
      odamobilBaseUrl: "https://api.odamobil.com/global/localization",
      replicateBaseUrl: "https://api.replicate.com/v1",
      azureSoraBaseUrl: "https://bilgi-mbesubm5-eastus2.cognitiveservices.azure.com/openai/v1/video",
      azureApiVersion: "preview",
      replicateApiKey: null,
      azureSoraKey: null,
      ...config
    };
    this.keyLoading = {
      replicate: false,
      azureSora: false
    };
  }
  async _fetchKeyFromOdamobil(keyName) {
    const url = this.config.odamobilBaseUrl;
    const encryptedKey = this.cryptoHelper.customEncrypt(keyName);
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.config.clientAuthKey
      },
      body: JSON.stringify({
        key: encryptedKey
      })
    };
    try {
      console.log(`[Odamobil] Mengambil kunci: ${keyName}`);
      const response = await fetch(url, options);
      const responseText = await response.text();
      console.log(`[Odamobil] Raw Response Status: ${response.status}`);
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`[Odamobil] Gagal parse JSON:`, responseText);
        return null;
      }
      if (data.status === "0") {
        console.error(`[Odamobil] Error dari server:`, data.message);
        return null;
      }
      if (response.status === 200) {
        const encryptedContent = data?.result?.key;
        if (!encryptedContent) {
          console.error(`[Odamobil] Respon 200 tetapi data terenkripsi kosong.`);
          return null;
        }
        const decryptedKey = this.cryptoHelper.decrypt(encryptedContent);
        if (decryptedKey && decryptedKey !== "null" && decryptedKey !== "Password is incorrect") {
          return decryptedKey;
        } else {
          console.error(`[Odamobil] Dekripsi gagal untuk ${keyName}`);
          return null;
        }
      } else {
        console.error(`[Odamobil] Gagal mengambil ${keyName}. Status: ${response.status}.`);
        return null;
      }
    } catch (error) {
      console.error(`[Odamobil] Kesalahan Jaringan saat mengambil ${keyName}:`, error.message);
      return null;
    }
  }
  async _ensureKey(provider) {
    if (provider.includes("replicate")) {
      if (!this.config.replicateApiKey && !this.keyLoading.replicate) {
        this.keyLoading.replicate = true;
        console.log(`[Auto-Key] Memuat Replicate API Key...`);
        const rKey = await this._fetchKeyFromOdamobil("sona_replicate_key");
        this.config.replicateApiKey = rKey;
        this.keyLoading.replicate = false;
        if (!rKey) {
          throw new Error("Gagal memuat Replicate API Key");
        }
        console.log(`[Auto-Key] Replicate API Key berhasil dimuat`);
      }
      return this.config.replicateApiKey;
    }
    if (provider.includes("azure")) {
      if (!this.config.azureSoraKey && !this.keyLoading.azureSora) {
        this.keyLoading.azureSora = true;
        console.log(`[Auto-Key] Memuat Azure Sora Key...`);
        const soraKey = await this._fetchKeyFromOdamobil("sona_azure_sora_key");
        this.config.azureSoraKey = soraKey;
        this.keyLoading.azureSora = false;
        if (!soraKey) {
          throw new Error("Gagal memuat Azure Sora Key");
        }
        console.log(`[Auto-Key] Azure Sora Key berhasil dimuat`);
      }
      return this.config.azureSoraKey;
    }
    return null;
  }
  _validateInput(provider, input) {
    const errors = [];
    if (!input.prompt || typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
      errors.push("Prompt harus berupa string yang tidak kosong");
    }
    if (provider.includes("replicate")) {
      if (input.quality && !["360p", "540p", "720p", "1080p"].includes(input.quality)) {
        errors.push('Quality harus salah satu dari: "360p", "540p", "720p", "1080p"');
      }
      if (input.image !== undefined && input.image !== null && typeof input.image !== "string") {
        errors.push("Image harus berupa string URL atau null/undefined");
      }
      if (input.last_frame_image !== undefined && input.last_frame_image !== null && typeof input.last_frame_image !== "string") {
        errors.push("Last frame image harus berupa string URL atau null/undefined");
      }
    }
    if (provider.includes("azure")) {
      if (input.width && (typeof input.width !== "number" || input.width <= 0)) {
        errors.push("Width harus berupa angka positif");
      }
      if (input.height && (typeof input.height !== "number" || input.height <= 0)) {
        errors.push("Height harus berupa angka positif");
      }
      if (input.n_seconds && (typeof input.n_seconds !== "number" || input.n_seconds <= 0)) {
        errors.push("n_seconds harus berupa angka positif");
      }
    }
    return errors;
  }
  _getDimensions(aspectRatio) {
    switch (aspectRatio) {
      case "16:9":
        return [854, 480];
      case "1:1":
        return [480, 480];
      case "9:16":
        return [480, 854];
      default:
        return [854, 480];
    }
  }
  getAvailableProviders() {
    return [{
      name: "replicate",
      description: "Replicate API - Pixverse v4.5 model",
      required_params: ["prompt"],
      optional_params: ["quality", "image", "last_frame_image"],
      supported_aspect_ratios: ["16:9", "1:1", "9:16"]
    }, {
      name: "azure",
      description: "Azure Sora API - OpenAI video generation",
      required_params: ["prompt"],
      optional_params: ["width", "height", "n_seconds", "aspectRatio"],
      supported_aspect_ratios: ["16:9", "1:1", "9:16"]
    }];
  }
  async generate({
    provider,
    prompt,
    id,
    aspectRatio,
    ...rest
  }) {
    if (!provider) {
      const providers = this.getAvailableProviders();
      throw new Error(`Provider harus diisi. Provider yang tersedia: ${providers.map(p => p.name).join(", ")}`);
    }
    if (!prompt && !id) throw new Error("Prompt atau ID harus diisi");
    let url;
    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    };
    switch (provider) {
      case "replicate":
        await this._ensureKey("replicate");
        url = `${this.config.replicateBaseUrl}/models/pixverse/pixverse-v4.5/predictions`;
        options.headers["Authorization"] = `Bearer ${this.config.replicateApiKey}`;
        const replicateInput = {
          prompt: prompt.trim(),
          quality: rest.quality || "720p",
          image: rest.image || undefined,
          last_frame_image: rest.last_frame_image || undefined
        };
        const replicateErrors = this._validateInput("replicate", replicateInput);
        if (replicateErrors.length > 0) {
          throw new Error(`Validasi gagal: ${replicateErrors.join(", ")}`);
        }
        if (replicateInput.image === undefined) delete replicateInput.image;
        if (replicateInput.last_frame_image === undefined) delete replicateInput.last_frame_image;
        options.body = JSON.stringify({
          input: replicateInput
        });
        break;
      case "azure":
        await this._ensureKey("azure");
        url = `${this.config.azureSoraBaseUrl}/generations/jobs?api-version=${this.config.azureApiVersion}`;
        options.headers["api-key"] = this.config.azureSoraKey;
        options.headers["Content-Type"] = "application/json";
        const [azWidth, azHeight] = this._getDimensions(aspectRatio);
        const azureInput = {
          prompt: prompt.trim(),
          width: azWidth,
          height: azHeight,
          n_seconds: rest.n_seconds || 10,
          model: "sora"
        };
        const azureErrors = this._validateInput("azure", azureInput);
        if (azureErrors.length > 0) {
          throw new Error(`Validasi gagal: ${azureErrors.join(", ")}`);
        }
        options.body = JSON.stringify(azureInput);
        break;
      default:
        const providers = this.getAvailableProviders();
        throw new Error(`Provider tidak valid: ${provider}. Provider yang tersedia: ${providers.map(p => p.name).join(", ")}`);
    }
    console.log(`Mengirimkan ${options.method} ke: ${url}`);
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status !== 202) {
        const errorText = await response.text();
        let errorMessage = `Permintaan API gagal. Status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail) {
            errorMessage += `. Detail: ${errorJson.detail}`;
          } else if (errorJson.message) {
            errorMessage += `. Pesan: ${errorJson.message}`;
          }
        } catch {
          errorMessage += `. Response: ${errorText}`;
        }
        throw new Error(errorMessage);
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error("Kesalahan dalam generate:", error.message);
      throw error;
    }
  }
  async status({
    provider,
    id,
    ...rest
  }) {
    if (!provider) {
      const providers = this.getAvailableProviders();
      throw new Error(`Provider harus diisi. Provider yang tersedia: ${providers.map(p => p.name).join(", ")}`);
    }
    if (!id) throw new Error("ID harus diisi");
    let url;
    let options = {
      method: "GET",
      headers: {}
    };
    switch (provider) {
      case "replicate":
        await this._ensureKey("replicate");
        url = `${this.config.replicateBaseUrl}/predictions/${id}`;
        options.headers["Authorization"] = `Bearer ${this.config.replicateApiKey}`;
        break;
      case "azure":
        await this._ensureKey("azure");
        url = `${this.config.azureSoraBaseUrl}/generations/jobs/${id}?api-version=${this.config.azureApiVersion}`;
        options.headers["api-key"] = this.config.azureSoraKey;
        options.headers["Content-Type"] = "application/json";
        break;
      default:
        const providers = this.getAvailableProviders();
        throw new Error(`Provider tidak valid: ${provider}. Provider yang tersedia: ${providers.map(p => p.name).join(", ")}`);
    }
    console.log(`Mengecek status di: ${url}`);
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status check gagal: ${response.status}. ${errorText}`);
      }
      const data = await response.json();
      if (provider === "azure") {
        return {
          status: data.status || null,
          id: data.id || null,
          generations: data.generations || null
        };
      }
      return data;
    } catch (error) {
      console.error("Kesalahan dalam status check:", error.message);
      throw error;
    }
  }
  async getRKey() {
    return await this._ensureKey("replicate");
  }
  async getAzureSoraKey() {
    return await this._ensureKey("azure");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      available_actions: ["generate", "status", "providers"]
    });
  }
  const api = new TextToVideoAI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.provider) {
          const providers = api.getAvailableProviders();
          return res.status(400).json({
            error: "Parameter 'provider' wajib diisi untuk action 'generate'.",
            available_providers: providers.map(p => ({
              name: p.name,
              description: p.description,
              required_params: p.required_params,
              optional_params: p.optional_params
            }))
          });
        }
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.provider) {
          const providers = api.getAvailableProviders();
          return res.status(400).json({
            error: "Parameter 'provider' wajib diisi untuk action 'status'.",
            available_providers: providers.map(p => ({
              name: p.name,
              description: p.description
            }))
          });
        }
        if (!params.id) {
          return res.status(400).json({
            error: "Parameter 'id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "providers":
        response = api.getAvailableProviders();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          available_actions: ["generate", "status", "providers"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    if (error.message.includes("Provider") && (error.message.includes("harus diisi") || error.message.includes("tidak valid"))) {
      const providers = api.getAvailableProviders();
      return res.status(400).json({
        error: error.message,
        available_providers: providers.map(p => ({
          name: p.name,
          description: p.description,
          required_params: p.required_params,
          optional_params: p.optional_params
        }))
      });
    }
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}