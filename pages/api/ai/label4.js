import axios from "axios";
import https from "https";
import crypto from "crypto";
class WaterBot {
  constructor() {
    this.base = "https://37.187.99.30";
    this.path = "/waterbot/api/v1.0/chat";
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
    console.log("[WaterBot] Initialized");
  }
  genId() {
    const buf = crypto.randomBytes(12);
    return buf.toString("base64").replace(/[+/=]/g, m => m === "+" ? "-" : m === "/" ? "_" : "").substring(0, 22);
  }
  async chat({
    prompt,
    ...rest
  }) {
    const sid = rest.sid || this.genId();
    const url = `${this.base}${this.path}`;
    console.log("[Chat] Start");
    console.log(`[Chat] SID: ${sid}`);
    try {
      const res = await axios({
        method: "POST",
        url: url,
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: this.base,
          Pragma: "no-cache",
          Referer: `${this.base}/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "X-Session-Id": sid,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          ...rest.headers
        },
        data: {
          prompt: prompt
        },
        httpsAgent: this.agent
      });
      console.log("[Chat] Done");
      const result = res?.data || "";
      return {
        result: result,
        sid: sid
      };
    } catch (err) {
      console.error("[Chat] Error:", err?.message || err);
      return {
        result: null,
        sid: sid,
        error: err?.response?.data || err?.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new WaterBot();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}