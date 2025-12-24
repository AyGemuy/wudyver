import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
import SpoofHead from "@/lib/spoof-head";
class ElevenMusicAI {
  constructor() {
    this.baseUrl = "https://elevenmusicai.app/lyrics-generator";
    this.cookieJar = [];
    this.csrfToken = null;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
        Referer: this.baseUrl,
        "Accept-Encoding": "gzip, deflate, br",
        ...SpoofHead()
      },
      decompress: true
    });
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        this.cookieJar = this.cookieJar.concat(setCookie);
      }
      return response;
    }, error => {
      return Promise.reject(error);
    });
    this.client.interceptors.request.use(config => {
      if (this.cookieJar.length > 0) {
        config.headers.Cookie = this.cookieJar.join("; ");
      }
      return config;
    });
  }
  async #fetchCSRFToken() {
    try {
      const response = await this.client.get("/");
      const $ = cheerio.load(response.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content");
      if (!this.csrfToken) {
        throw new Error("CSRF token not found in page");
      }
      return this.csrfToken;
    } catch (error) {
      console.error("CSRF token fetch failed:", error.message);
      throw error;
    }
  }
  async generate({
    prompt,
    _token = null,
    ...params
  } = {}) {
    try {
      const csrfToken = _token || await this.#fetchCSRFToken();
      const payload = qs.stringify({
        prompt: prompt || "generated lyrics: Unlock a limitless journey of creativity and inspiration.",
        _token: csrfToken,
        ...params
      });
      const {
        data
      } = await this.client.post("/", payload);
      return data.data || null;
    } catch (error) {
      return {
        error: error.response?.data?.message ?? error.message,
        status: error.response?.status
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "POST" ? req.body : req.query;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const elevenAI = new ElevenMusicAI();
    const generated = await elevenAI.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}