import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class Outcast {
  constructor() {
    this.baseURL = "https://outcast.ai/tools/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://outcast.ai",
      referer: "https://outcast.ai/tools/youtube-video-summarizer",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async req(endpoint, data) {
    try {
      console.log(`[req] ${endpoint}`);
      const res = await axios.post(`${this.baseURL}${endpoint}`, data, {
        headers: this.headers
      });
      console.log(`[req] Status:`, res?.status || "unknown");
      return res?.data;
    } catch (err) {
      console.error(`[req] Error:`, err?.message || "unknown");
      throw err;
    }
  }
  async transcript(url) {
    try {
      console.log("[transcript] URL:", url);
      const res = await this.req("/get-youtube-transcript", {
        videoUrl: url
      });
      const success = res?.success || false;
      const data = res?.data || [];
      console.log("[transcript] Items:", data?.length || 0);
      return success ? data : null;
    } catch (err) {
      console.error("[transcript] Failed:", err?.message || "unknown");
      return null;
    }
  }
  async summary(transcript) {
    try {
      console.log("[summary] Transcript length:", transcript?.length || 0);
      const res = await this.req("/generate-yt-summary", {
        transcript: transcript
      });
      const success = res?.success || false;
      const data = res?.data || "";
      console.log("[summary] Output length:", data?.length || 0);
      return success ? data : null;
    } catch (err) {
      console.error("[summary] Failed:", err?.message || "unknown");
      return null;
    }
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[generate] Starting...");
      const trans = await this.transcript(url);
      if (!trans) {
        console.error("[generate] No transcript");
        return null;
      }
      const text = trans.map(t => t?.text || "").join(" ");
      console.log("[generate] Text length:", text?.length || 0);
      const result = await this.summary(trans);
      if (!result) {
        console.error("[generate] No summary");
        return null;
      }
      console.log("[generate] Completed");
      return {
        summary: result,
        transcript: trans,
        text: text,
        count: trans?.length || 0
      };
    } catch (err) {
      console.error("[generate] Error:", err?.message || "unknown");
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const client = new Outcast();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}