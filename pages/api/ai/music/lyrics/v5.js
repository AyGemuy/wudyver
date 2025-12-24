import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class SongGenerator {
  constructor(baseURL = "https://aisonggenerator.vercel.app/api/lyrics-generate") {
    this.url = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
      Referer: "https://aisonggenerator.vercel.app/",
      "Accept-Encoding": "gzip, deflate, br",
      ...SpoofHead()
    };
  }
  async generate({
    prompt,
    ...params
  } = {}) {
    try {
      const {
        data
      } = await axios.post(this.url, {
        prompt: prompt,
        ...params
      }, {
        headers: this.defaultHeaders,
        decompress: true
      });
      return data || null;
    } catch (e) {
      return {
        error: e.response?.data?.error ?? e.message,
        status: e.response?.status
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
    const songGen = new SongGenerator();
    const generated = await songGen.generate(params);
    return res.status(200).json(generated);
  } catch (error) {
    console.error("Error in API handler:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}