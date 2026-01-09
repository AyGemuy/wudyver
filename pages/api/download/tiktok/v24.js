import axios from "axios";
class TTDL {
  constructor() {
    this.heads = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://ttdownloader.site",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.base = "https://api.ttdownloader.site";
  }
  log(msg) {
    console.log(`[LOG] ${new Date().toLocaleTimeString()} -> ${msg}`);
  }
  async get(path, params) {
    try {
      this.log(`Requesting: ${path}`);
      const res = await axios.get(path, {
        baseURL: this.base,
        headers: this.heads,
        params: params
      });
      return res?.data || null;
    } catch (e) {
      this.log(`Error: ${e?.message || "Unknown error"}`);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    const target = url ? url : "";
    if (!target) {
      this.log("URL is missing");
      return {
        success: false,
        msg: "No URL provided"
      };
    }
    const q = {
      url: target,
      minimal: rest.minimal || false
    };
    const data = await this.get("/api", q);
    if (data?.data) {
      this.log("Success fetching data");
      return data;
    } else {
      this.log("Failed or empty response");
      return {
        success: false
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
  const api = new TTDL();
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