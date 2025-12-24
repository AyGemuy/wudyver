import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class TubeOnAI {
  constructor() {
    this.baseURL = "https://web.tubeonai.com/api/public";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://tubeonai.com",
      referer: "https://tubeonai.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async fetch(url, opts = {}) {
    try {
      console.log("[fetch] Request:", opts?.data || "GET");
      const res = await axios({
        url: url,
        ...opts
      });
      console.log("[fetch] Response:", res?.status || "unknown");
      return res?.data;
    } catch (err) {
      console.error("[fetch] Error:", err?.message || "unknown error");
      throw err;
    }
  }
  async summarize({
    url,
    detail = "Detailed",
    tone = "Neutral",
    lang = "en-US",
    userId = "newsletter_15988"
  }) {
    try {
      console.log("[summarize] URL:", url);
      const data = {
        tool_name: "web-page-summarizer",
        url: url,
        detail_level: detail,
        tone: tone,
        language: lang,
        user_id: userId,
        link_or_id: url
      };
      const res = await this.fetch(`${this.baseURL}/summarize`, {
        method: "POST",
        headers: this.headers,
        data: data
      });
      console.log("[summarize] Success:", res?.success || false);
      return res?.data || res;
    } catch (err) {
      console.error("[summarize] Failed:", err?.message || "unknown");
      return null;
    }
  }
  parse(raw = "") {
    try {
      console.log("[parse] Raw length:", raw?.length || 0);
      const lines = (raw || "").split("\n");
      const chunks = [];
      let json = null;
      for (const line of lines) {
        const trimmed = line?.trim() || "";
        if (trimmed.startsWith("0:")) {
          const val = trimmed.slice(2)?.replace(/^"(.*)"$/, "$1") || "";
          chunks.push(val);
        } else if (trimmed.startsWith("e:") || trimmed.startsWith("d:")) {
          const jsonStr = trimmed.slice(2) || "{}";
          try {
            json = JSON.parse(jsonStr);
          } catch (e) {
            console.warn("[parse] Invalid JSON:", e?.message || "error");
          }
        }
      }
      const text = chunks.join("");
      console.log("[parse] Text length:", text?.length || 0);
      return {
        text: text || "",
        meta: json || {},
        usage: json?.usage || null,
        finish: json?.finishReason || "unknown"
      };
    } catch (err) {
      console.error("[parse] Error:", err?.message || "unknown");
      return {
        text: "",
        meta: {},
        usage: null,
        finish: "error"
      };
    }
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[generate] Starting...");
      const info = await this.summarize({
        url: url,
        ...rest
      });
      if (!info) {
        console.error("[generate] No summary data");
        return null;
      }
      const summaryId = info?.id || "unknown";
      const transcript = info?.transcript || "";
      const detail = rest?.detail || "detailed";
      const tone = rest?.tone || "neutral";
      const lang = rest?.lang || "en-US";
      const userId = rest?.userId || "newsletter_15988";
      console.log("[generate] Summary ID:", summaryId);
      const payload = {
        summary_id: summaryId,
        transcript: transcript,
        detail_level: detail,
        tone_name: tone,
        language: lang,
        user_id: userId,
        prompt: rest?.prompt || ""
      };
      const res = await axios({
        url: `${this.baseURL}/generate-summary`,
        method: "POST",
        headers: {
          ...this.headers,
          accept: "*/*"
        },
        data: payload,
        responseType: "text"
      });
      const raw = res?.data || "";
      const parsed = this.parse(raw);
      console.log("[generate] Completed");
      return {
        summary: parsed?.text || "",
        metadata: info,
        usage: parsed?.usage,
        finish: parsed?.finish
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
    const client = new TubeOnAI();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}