import axios from "axios";
import {
  randomUUID,
  randomInt
} from "crypto";
class InstaSaver {
  constructor() {
    this.userAgent = "okhttp/4.12.0";
    this.baseUrl = "https://saverapi.com";
    this.headers = {
      "User-Agent": this.userAgent,
      "Accept-Encoding": "gzip"
    };
  }
  cleanUrl(rawUrl) {
    try {
      const urlObj = new URL(rawUrl);
      urlObj.search = "";
      return urlObj.toString();
    } catch (e) {
      return rawUrl;
    }
  }
  mkToken() {
    const uuid = randomUUID();
    const time = Date.now();
    const rand = randomInt(0, 9e5);
    return `${uuid}/${time}-${rand}`;
  }
  async download({
    url,
    ...rest
  }) {
    const finalUrl = this.cleanUrl(url || "");
    if (!finalUrl) return {
      error: "URL is required"
    };
    if (url !== finalUrl) {
      console.log(`[LOG] Cleaning URL parameters...`);
      console.log(`      Raw:   ${url}`);
      console.log(`      Clean: ${finalUrl}`);
    }
    const token = this.mkToken();
    console.log(`[LOG] Token: ${token}`);
    try {
      const payload = {
        type: "post",
        link: finalUrl,
        ...rest
      };
      console.log(`[LOG] Processing: ${finalUrl}`);
      const response = await axios.post(`${this.baseUrl}/insta.php`, payload, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          token: token
        }
      });
      const data = response?.data || null;
      const status = data && !data.error ? "Success" : "Failed/Empty";
      console.log(`[LOG] Result: ${status}`);
      return data || {
        error: "No data received"
      };
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Network Error";
      console.error(`[ERR] Execution failed: ${msg}`);
      return {
        error: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new InstaSaver();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}