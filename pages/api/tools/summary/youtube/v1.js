import axios from "axios";
import {
  FormData
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class RecapioGPT {
  constructor(apiKey = "") {
    this.apiKey = apiKey;
    this.baseURL = "https://api.recapiogpt.com/summary";
  }
  getRandomUserAgent() {
    const userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
  getRandomDeviceFingerprint() {
    return Math.random().toString(36).substring(2, 18);
  }
  async generate({
    url,
    length = "medium-3-paragraphs",
    tone = "creative",
    style = "creative",
    lang = "Indonesian"
  }) {
    try {
      const form = new FormData();
      form.append("type", "url");
      form.append("outputLength", length);
      form.append("voiceTone", tone);
      form.append("writingStyle", style);
      form.append("language", lang);
      form.append("customInstructions", "Futuristic");
      form.append("source", url);
      const response = await axios.post(this.baseURL, form, {
        headers: {
          ...form.headers,
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9",
          authorization: this.apiKey ? `Bearer ${this.apiKey}` : "",
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "multipart/form-data",
          origin: "https://app.recapiogpt.com",
          pragma: "no-cache",
          referer: "https://app.recapiogpt.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": this.getRandomUserAgent(),
          "x-app-language": "en",
          "x-device-fingerprint": this.getRandomDeviceFingerprint(),
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          ...SpoofHead()
        }
      });
      return response.data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
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
    const client = new RecapioGPT();
    const response = await client.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}