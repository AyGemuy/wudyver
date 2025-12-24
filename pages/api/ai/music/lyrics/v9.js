import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class AetheraLyrics {
  constructor() {
    this.baseUrl = "https://marketing-tools.aethera.ai/api/tools/lyrics-generator";
    this.cookieJar = new Map();
    this.client = axios.create({
      baseURL: "https://marketing-tools.aethera.ai",
      headers: this.getBaseHeaders()
    });
    this.setupInterceptors();
  }
  getBaseHeaders() {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://marketing-tools.aethera.ai",
      priority: "u=1, i",
      referer: "https://marketing-tools.aethera.ai/tools/lyrics-generator",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  setupInterceptors() {
    this.client.interceptors.response.use(response => {
      const setCookieHeaders = response.headers["set-cookie"];
      if (setCookieHeaders) {
        setCookieHeaders.forEach(header => {
          const [cookie] = header.split(";");
          const [name, value] = cookie.split("=");
          this.cookieJar.set(name, value);
        });
      }
      return response;
    });
    this.client.interceptors.request.use(config => {
      if (this.cookieJar.size > 0) {
        config.headers.Cookie = [...this.cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
      }
      return config;
    });
  }
  async generate({
    prompt,
    genre = "pop",
    mood,
    ...otherParams
  }) {
    try {
      if (this.cookieJar.size === 0) {
        await this.client.get("/tools/lyrics-generator");
      }
      const response = await this.client.post("/api/tools/lyrics-generator", {
        prompt: prompt || "default prompt text",
        settings: {
          genre: genre,
          mood: mood,
          ...otherParams,
          structure: "verse-chorus"
        }
      });
      return {
        success: true,
        result: response.data,
        metadata: {
          prompt: prompt,
          genre: genre,
          mood: mood,
          ...otherParams,
          timestamp: new Date().toISOString()
        },
        status: response.status
      };
    } catch (error) {
      return {
        error: error.response?.data?.message || error.message,
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
    const generator = new AetheraLyrics();
    const generated = await generator.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}