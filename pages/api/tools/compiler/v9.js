import axios from "axios";
class OnePercent {
  constructor() {
    this.api = "https://www.onepercent.club/api/compile/";
    this.ua = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
  }
  log(msg, err = false) {
    const time = new Date().toLocaleTimeString();
    console[err ? "error" : "log"](`[${time}] ${msg}`);
  }
  async req(url, body) {
    try {
      const {
        data
      } = await axios.post(url, new URLSearchParams(body), {
        headers: {
          "User-Agent": this.ua,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      return data;
    } catch (e) {
      this.log(`Req Error: ${e.message}`, true);
      return null;
    }
  }
  async run({
    code,
    lang = "javascript",
    ...rest
  }) {
    this.log("Initializing compilation...");
    try {
      if (!code) throw new Error("Code parameter is empty");
      const safeLang = (lang || "javascript").toLowerCase().replace(/\+/g, "%2B").replace(/#/g, "%23");
      const targetUrl = `${this.api}${safeLang}`;
      this.log(`Endpoint: ${targetUrl}`);
      const res = await this.req(targetUrl, {
        code: code,
        ...rest
      });
      const output = res?.Output ?? res ?? "No output received";
      this.log("Execution done.");
      return {
        language: safeLang.replace(/%2B/g, "+").replace(/%23/g, "#"),
        status: res ? "success" : "failed",
        result: output
      };
    } catch (e) {
      this.log(e.message, true);
      return {
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }
  const api = new OnePercent();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}