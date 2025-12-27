import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class RedNote {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "text/x-component",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "text/plain;charset=UTF-8",
        "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22id%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%2Cnull%2Cnull%5D",
        origin: "https://downloadrednote.com",
        referer: "https://downloadrednote.com/id",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
      }
    }));
    this.nextAction = "40a16d2425655b0d6b30cd6456cfa22a787b2e925c";
  }
  parse(rawText) {
    try {
      const lines = rawText.split("\n");
      for (let line of lines) {
        if (line.includes('{"data":')) {
          const jsonStr = line.substring(line.indexOf("{"));
          return JSON.parse(jsonStr);
        }
      }
      return null;
    } catch (e) {
      console.error("[Parser Error]", e.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log(`[RedNote] Memproses URL: ${url}`);
      const response = await this.client.post("https://downloadrednote.com/id", JSON.stringify([url]), {
        headers: {
          "next-action": this.nextAction
        }
      });
      const parsedData = this.parse(response.data);
      if (!parsedData || !parsedData.data) {
        return {
          success: false,
          message: "Gagal mengambil data, format response tidak dikenal."
        };
      }
      const media = parsedData.data;
      return {
        success: true,
        ...media
      };
    } catch (error) {
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
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
  const api = new RedNote();
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