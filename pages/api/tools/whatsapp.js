import axios from "axios";
import https from "https";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
class WhatsClient {
  constructor() {
    this.config = this.init_config();
    const httpsAgent = new https.Agent({
      keepAlive: true
    });
    const baseHeaders = {
      "User-Agent": "WhatsApp/2.25.24.23 Android/15 Device/realme-RMX3890",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip"
    };
    this.whatsappApiClient = axios.create({
      baseURL: "https://graph.whatsapp.com/graphql",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/json"
      },
      httpsAgent: httpsAgent
    });
    this.bingApiClient = axios.create({
      baseURL: "https://www.bingapis.com/api/v6/images",
      headers: baseHeaders,
      httpsAgent: httpsAgent
    });
  }
  init_config() {
    try {
      const password = apiConfig.PASSWORD;
      const encryptedData = "3eZOQ9nsi8RYF3u+vFHrxGlbTG4+Uft04RzEBJFZsb5ULBzxsoizhYsGU5zoYXwqFaf9l/YGWc50ek4we5bGL1LvWI/qh3spgocUrBMW9dm2pEAblr5FeEy77Mf0HKCWARdJpyKnU2Agm2Ur57xtQI17dYJUqAuUgHo4pVqTIHyQMmtfJfIkYACDn9tY07Q6XR/I2xhA7+BKd0j4PDxJY4vxtryEuzUUdJM4Htx4dvv7J3vZR+Nw7CIdzlRV/tKWsyL1l1UWyHTxyHCj5WiyjdlNrYeNFlat4Kb6v9xBjBpsoNjBQjt99YcEWEqOV+Vdnq/bxIicdEGO+XWFyof/4FX+tK+XyTdqc65NzHcemhdXY4UopgiL+iYjntAgBvuyTzLHdOZT/J4LTaIEymkW6O31+qry6M/GwWSNbo5arshynkT56atrp2t4Md83i+oKy8c++B76XD5iGyGSrjM/ABP/G/DmMvawEwfY0LaabX5h76OximGiB5D/UewJtaFVozGLoWvwnXvT+fnnNz/DAvwu4nY/RVJltZgIJ9k51/FZJEdnFrnU3pgn3BJ8chPha8y8ppY/mWzy1faYdYxEDUwqdnRF9OhA9zarADpSP2Mi+JSP7HUYjprhMlLmpDyQNbU/a8WdKG1QwtZnjjxbgXHhtZiM6ON4OPV/lFIuZabKoatICqmPmFpUIzKW+vd3Y8s1utMVPxfaB2NKEs3fYw==";
      const combined = CryptoJS.enc.Base64.parse(encryptedData);
      const salt = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
      const iv = CryptoJS.lib.WordArray.create(combined.words.slice(4, 8));
      const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(8));
      const derivedKey = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1e3,
        hasher: CryptoJS.algo.SHA256
      });
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertext
      });
      const decrypted = CryptoJS.AES.decrypt(cipherParams, derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) throw new Error("Decryption failed");
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error("Decryption error:", error.message);
      return null;
    }
  }
  async run({
    tool,
    ...rest
  }) {
    switch (tool) {
      case "ai-search":
        return await this._ai_search(rest);
      case "ai-image":
        return await this._ai_image(rest);
      case "image-search":
        return await this._search_image(rest);
      default:
        throw new Error(`Alat tidak dikenal: "${tool}". Pilihan yang tersedia: 'ai-search', 'ai-image', 'image-search'.`);
    }
  }
  async _ai_search({
    query,
    ...rest
  }) {
    if (!query) throw new Error('Properti "query" diperlukan untuk alat "ai-search".');
    const payload = {
      variables: {
        include_intro_video: false,
        page_size: 10,
        ...rest,
        query: query
      },
      access_token: this.config.aiSearch.accessToken,
      doc_id: this.config.aiSearch.docId,
      lang: "id_ID",
      "Content-Type": "application/json"
    };
    try {
      console.log(`Menjalankan 'ai-search' dengan query: "${query}"...`);
      const response = await this.whatsappApiClient.post("/", payload);
      console.log("'ai-search' berhasil!");
      return response.data;
    } catch (error) {
      this._handleError(error, "ai-search");
    }
  }
  async _ai_image({
    prompt,
    ...rest
  }) {
    if (!prompt) throw new Error('Properti "prompt" diperlukan untuk alat "ai-image".');
    const payload = {
      variables: {
        params: {
          num_images: 4,
          ...rest,
          prompt: prompt
        },
        add_square_auto_cropped_uri: false,
        intents_surface: "WHATSAPP"
      },
      app_id: this.config.aiImage.appId,
      access_token: this.config.aiImage.accessToken,
      doc_id: this.config.aiImage.docId,
      lang: "id_ID",
      "Content-Type": "application/json"
    };
    try {
      console.log(`Menjalankan 'ai-image' dengan prompt: "${prompt}"...`);
      const response = await this.whatsappApiClient.post("/", payload);
      console.log("'ai-image' berhasil!");
      return response.data;
    } catch (error) {
      this._handleError(error, "ai-image");
    }
  }
  async _search_image({
    query,
    ...rest
  }) {
    if (!query) throw new Error('Properti "query" diperlukan untuk alat "image-search".');
    const params = {
      SafeSearch: "Strict",
      aspect: "Square",
      mkt: "en-US",
      offset: 0,
      count: 50,
      ...rest,
      q: query,
      appid: this.config.bingImage.appId
    };
    try {
      console.log(`Menjalankan 'image-search' dengan query: "${query}"...`);
      const response = await this.bingApiClient.get("/search", {
        params: params
      });
      console.log("'image-search' berhasil!");
      return response.data;
    } catch (error) {
      this._handleError(error, "image-search");
    }
  }
  _handleError(error, functionName) {
    console.error(`Terjadi kesalahan saat menjalankan ${functionName}:`);
    if (error.response) {
      console.error("Data Error:", error.response.data);
      console.error("Status Error:", error.response.status);
    } else if (error.request) {
      console.error("Request Error: Permintaan dibuat tetapi tidak ada respons yang diterima.");
    } else {
      console.error("Error:", error.message);
    }
    throw error;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.tool) {
    return res.status(400).json({
      error: "Tool are required"
    });
  }
  try {
    const client = new WhatsClient();
    const response = await client.run(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}