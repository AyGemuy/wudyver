import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
class VoilaClient {
  constructor() {
    this.baseURL = "https://www.getvoila.ai/ask-ai";
    this.cookies = "";
    this.csrfToken = "";
    this.authToken = "";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID,id;q=0.9"
    };
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: this.headers
    });
  }
  async init() {
    try {
      const res = await this.axiosInstance.get("/");
      const setCookies = res.headers["set-cookie"];
      this.cookies = setCookies ? setCookies.map(c => c.split(";")[0]).join("; ") : "";
      const $ = cheerio.load(res.data);
      this.authToken = $('input[name="authenticity_token"]').val() || "";
      this.csrfToken = $('meta[name="csrf-token"]').attr("content") || "";
    } catch (error) {
      console.error("Error during init:", error);
    }
  }
  async chat({
    prompt
  }) {
    try {
      if (!this.authToken || !this.csrfToken || !this.cookies) await this.init();
      const data = qs.stringify({
        authenticity_token: this.authToken,
        "form[input]": prompt
      });
      const headers = {
        ...this.headers,
        cookie: this.cookies || "",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.getvoila.ai",
        referer: this.baseURL,
        "x-csrf-token": this.csrfToken || ""
      };
      const res = await this.axiosInstance.post("/", data, {
        headers: headers
      });
      const $ = cheerio.load(res.data);
      const result = $("div.message.assistant div.MarkdownBlock").text().trim() || "Tidak ada hasil";
      return {
        result: result
      };
    } catch (error) {
      console.error("Error during ask:", error);
      return {
        result: "Gagal mengambil respons."
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const voila = new VoilaClient();
    const response = await voila.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}