import axios from "axios";
class TeraboxDownloader {
  constructor() {
    this.config = {
      base: "https://tera2.sylyt93.workers.dev",
      endpoint: "/info",
      pattern: /(?:\/s\/|surl=)([a-zA-Z0-9_-]+)/i,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://www.kauruka.com",
        referer: "https://www.kauruka.com/",
        "sec-ch-ua": `"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"`,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": `"Android"`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 15e3,
      maxRedirects: 0
    };
    this.client = axios.create({
      baseURL: this.config.base,
      timeout: this.config.timeout,
      maxRedirects: this.config.maxRedirects,
      validateStatus: status => status >= 200 && status < 400,
      headers: {
        "user-agent": this.config.headers["user-agent"]
      }
    });
  }
  async download({
    url,
    ...rest
  }) {
    if (!(url = typeof url === "string" ? url.trim() : "")) {
      throw new Error("URL must be a non-empty string.");
    }
    console.log("start:", url);
    try {
      const {
        pattern,
        endpoint,
        headers
      } = this.config;
      const match = url.match(pattern);
      if (!match?.[1]) {
        throw new Error("SURL tidak ditemukan. Pastikan URL mengandung /s/xxxx atau surl=xxxx");
      }
      const surl = match[1];
      console.log("surl:", surl);
      console.log("fetching info...");
      const {
        data
      } = await this.client.get(endpoint, {
        headers: headers,
        params: {
          s: surl
        },
        ...rest
      });
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Respons API tidak valid: objek diharapkan.");
      }
      console.log("success:", Object.keys(data).join(", "));
      return data;
    } catch (e) {
      const msg = e.response?.data?.message ?? e.message ?? "Unknown error";
      console.error("fail:", msg);
      throw new Error(msg);
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
  const api = new TeraboxDownloader();
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