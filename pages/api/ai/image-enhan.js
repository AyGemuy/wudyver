import axios from "axios";
import crypto from "crypto";
class ImageEnchanter {
  constructor() {
    this.baseUrl = "https://api.imageenhan.com";
    this.sessionToken = null;
    this.website = "imageenhan";
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*"
      }
    });
    this.api.interceptors.request.use(config => {
      const dynamicHeaders = this.buildHeaders(config.dynamicHeaderOptions);
      config.headers = {
        ...config.headers,
        ...dynamicHeaders
      };
      if (this.sessionToken && config.url !== "/api/account/login") {
        config.headers["Authorization"] = this.sessionToken;
      } else if (config.url === "/api/account/login") {
        delete config.headers["Authorization"];
      }
      delete config.dynamicHeaderOptions;
      console.log(`[INTERCEPTOR REQUEST] Method: ${config.method.toUpperCase()}, URL: ${config.url}, Headers:`, config.headers);
      return config;
    }, error => {
      console.error("[INTERCEPTOR REQUEST ERROR]", error);
      return Promise.reject(error);
    });
    this.api.interceptors.response.use(response => {
      console.log(`[INTERCEPTOR RESPONSE] URL: ${response.config.url}, Status: ${response.status}, Data:`, response.data);
      return response;
    }, error => {
      console.error(`[INTERCEPTOR RESPONSE ERROR] URL: ${error.config?.url}, Status: ${error.response?.status}, Data:`, error.response?.data || error.message);
      return Promise.reject(error);
    });
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(options = {}) {
    const ip = this.randomCryptoIP();
    const requestId = this.randomID(8);
    return {
      "Accept-Language": "id-ID,id;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Priority: "u=1, i",
      "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "X-Forwarded-For": ip,
      "X-Real-Ip": ip,
      "X-Request-Id": requestId,
      Origin: options.origin || "https://www.imageenhan.com",
      Referer: options.referer || "https://www.imageenhan.com/",
      "Sec-Fetch-Site": options.secFetchSite || "same-site",
      "Sec-Fetch-Dest": options.secFetchDest || "empty",
      "Sec-Fetch-Mode": options.secFetchMode || "cors"
    };
  }
  async makeRequest(method, url, data = {}, headerOptions = {}) {
    try {
      console.log(`[REQUEST CALL] ${method.toUpperCase()} ${url}`);
      console.log(`[REQUEST CALL DATA]`, data);
      const response = await this.api.request({
        method: method,
        url: url,
        data: data,
        dynamicHeaderOptions: headerOptions
      });
      return response.data;
    } catch (error) {
      console.error(`[ERROR CATCH] ${method.toUpperCase()} ${url}:`, error.message);
      throw error;
    }
  }
  async initSession() {
    console.log("[INFO] Menginisialisasi sesi dan mendapatkan token...");
    try {
      const response = await this.makeRequest("post", "/api/account/login", {
        platform: "guest",
        device: {},
        website: this.website
      }, {
        secFetchSite: "same-site",
        referer: "https://www.imageenhan.com/",
        origin: "https://www.imageenhan.com"
      });
      if (response.code === 200 && response.result && response.result.token) {
        this.sessionToken = response.result.token;
        console.log("[INFO] Sesi berhasil diinisialisasi. Token didapatkan.");
        return true;
      } else {
        console.error("[ERROR] Gagal mendapatkan token sesi:", response.message);
        return false;
      }
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan saat inisialisasi sesi:", error.message);
      return false;
    }
  }
  async pollTaskStatus(actionId, interval = 3e3, maxAttempts = 60) {
    console.log(`[INFO] Memulai polling untuk action ID: ${actionId}`);
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await this.makeRequest("get", `/api/action/info?action_id=${actionId}&website=${this.website}`, {}, {
          secFetchSite: "same-site",
          referer: "https://www.imageenhan.com/",
          origin: "https://www.imageenhan.com"
        });
        if (response.code === 200 && response.result) {
          const {
            status,
            percent,
            response: actionResponse,
            request: actionRequest
          } = response.result;
          console.log(`[POLLING] Action ID: ${actionId}, Status: ${status}, Progress: ${(percent * 100).toFixed(2)}%`);
          if (status === "success") {
            console.log(`[POLLING SUCCESS] Task selesai untuk action ID: ${actionId}`);
            const parsedRequest = typeof actionRequest === "string" ? JSON.parse(actionRequest) : actionRequest;
            const parsedResponse = typeof actionResponse === "string" ? JSON.parse(actionResponse) : actionResponse;
            return {
              ...response.result,
              request: parsedRequest,
              response: parsedResponse
            };
          } else if (status === "failed" || status === "error") {
            console.error(`[POLLING FAILED] Task gagal untuk action ID: ${actionId}. Komentar: ${response.result.comments}`);
            throw new Error(`Task failed: ${response.result.comments}`);
          }
        } else {
          console.warn(`[POLLING WARNING] Respon tidak sesuai format untuk action ID: ${actionId}`, response);
        }
      } catch (error) {
        console.error(`[POLLING ERROR] Terjadi kesalahan saat polling action ID ${actionId}:`, error.message);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    console.error(`[POLLING TIMEOUT] Polling mencapai batas maksimum percobaan untuk action ID: ${actionId}`);
    throw new Error("Polling timed out.");
  }
  async txt2img({
    prompt,
    style = "ghibli",
    width = 512,
    height = 1024,
    ...rest
  }) {
    if (!this.sessionToken) {
      console.log("[INFO] Token sesi tidak ditemukan. Mencoba menginisialisasi sesi...");
      const sessionInitialized = await this.initSession();
      if (!sessionInitialized) {
        throw new Error("Gagal menginisialisasi sesi. Tidak dapat melanjutkan txt2img.");
      }
    }
    console.log("[INFO] Memulai proses text-to-image...");
    try {
      const initialResponse = await this.makeRequest("post", "/api/image/text-to-image-v2", {
        prompt: prompt,
        style: style,
        width: width,
        height: height,
        website: this.website,
        ...rest
      }, {
        secFetchSite: "same-site",
        referer: "https://www.imageenhan.com/",
        origin: "https://www.imageenhan.com"
      });
      if (initialResponse.code === 200 && initialResponse.actionId) {
        console.log(`[SUCCESS] txt2img berhasil memulai. Action ID: ${initialResponse.actionId}`);
        return await this.pollTaskStatus(initialResponse.actionId);
      } else {
        console.error("[ERROR] txt2img gagal:", initialResponse.message);
        throw new Error(initialResponse.message || "txt2img request failed.");
      }
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan saat txt2img:", error.message);
      throw error;
    }
  }
  async img2img({
    imageUrl,
    style = "ghibli",
    ...rest
  }) {
    if (!this.sessionToken) {
      console.log("[INFO] Token sesi tidak ditemukan. Mencoba menginisialisasi sesi...");
      const sessionInitialized = await this.initSession();
      if (!sessionInitialized) {
        throw new Error("Gagal menginisialisasi sesi. Tidak dapat melanjutkan img2img.");
      }
    }
    console.log("[INFO] Memulai proses image-to-image...");
    try {
      const initialResponse = await this.makeRequest("post", "/api/image/image-to-image", {
        imageUrl: imageUrl,
        style: style,
        website: this.website,
        ...rest
      }, {
        secFetchSite: "same-site",
        referer: "https://www.imageenhan.com/",
        origin: "https://www.imageenhan.com"
      });
      if (initialResponse.code === 200 && initialResponse.actionId) {
        console.log(`[SUCCESS] img2img berhasil memulai. Action ID: ${initialResponse.actionId}`);
        return await this.pollTaskStatus(initialResponse.actionId);
      } else {
        console.error("[ERROR] img2img gagal:", initialResponse.message);
        throw new Error(initialResponse.message || "img2img request failed.");
      }
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan saat img2img:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "chat | image"
      }
    });
  }
  const api = new ImageEnchanter();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await api[action](params);
        break;
      case "img2img":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await api[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}