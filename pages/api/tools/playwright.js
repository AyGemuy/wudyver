import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class PlaywrightAPI {
  constructor() {
    this.url = `https://${apiConfig.DOMAIN_KOYEB}/playwright`;
    this._url = `https://${apiConfig.DOMAIN_KOYEB}/playwright/v2`;
    this.headers = {
      "Content-Type": "application/json"
    };
    this.defaultTimeout = 3e5;
  }
  async execute(params) {
    const {
      code,
      timeout,
      ...rest
    } = params;
    if (!code) throw new Error("Code diperlukan.");
    const times = timeout ?? this.defaultTimeout;
    const payload = {
      code: code,
      timeout: times,
      ...rest
    };
    const isValid = res => res?.data && res?.data?.output;
    try {
      console.log(`[PlaywrightAPI] Mencoba Primary Endpoint...`);
      const response = await axios.post(this.url, payload, {
        headers: this.headers,
        timeout: times + 5e3
      });
      if (!isValid(response)) {
        throw new Error("Primary sukses secara HTTP tapi data/output kosong.");
      }
      console.log(`[PlaywrightAPI] Eksekusi Primary berhasil.`);
      return response.data;
    } catch (error) {
      console.warn(`[PlaywrightAPI] Primary gagal/tidak lengkap. Mencoba Fallback v2... Reason: ${error.message}`);
      try {
        const _response = await axios.post(this._url, payload, {
          headers: this.headers,
          timeout: times + 5e3
        });
        if (!isValid(_response)) {
          console.error(`[PlaywrightAPI] Fallback v2 juga tidak memberikan data/output.`);
          return _response.data || {
            error: "Semua endpoint gagal memberikan output."
          };
        }
        console.log(`[PlaywrightAPI] Eksekusi Fallback v2 berhasil.`);
        return _response.data;
      } catch (fallbackError) {
        console.error(`[PlaywrightAPI] Fallback Error:`, fallbackError.response?.data || fallbackError.message);
        if (fallbackError.response) {
          return fallbackError.response.data;
        } else {
          throw new Error(`Semua endpoint gagal: ${fallbackError.message}`);
        }
      }
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  try {
    const playwright = new PlaywrightAPI();
    const result = await playwright.execute(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[Handler] Error catch:`, error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}