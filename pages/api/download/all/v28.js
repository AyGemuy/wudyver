import axios from "axios";
import * as cheerio from "cheerio";
class AioPro {
  constructor() {}
  async download({
    url
  }) {
    console.log("Mulai download:", url);
    try {
      if (!url.includes("https://")) throw new Error("Invalid url.");
      const {
        data: h
      } = await axios.get("https://allinonedownloader.pro/");
      const $ = cheerio.load(h);
      const token = $('input[name="token"]').attr("value");
      if (!token) throw new Error("Token not found.");
      const {
        data
      } = await axios.post("https://allinonedownloader.pro/wp-json/aio-dl/video-data/", new URLSearchParams({
        url: url,
        token: token
      }).toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://allinonedownloader.pro",
          referer: "https://allinonedownloader.pro/",
          "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
        }
      });
      return data;
    } catch (error) {
      console.error("Error:", error.message);
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' dibutuhkan."
    });
  }
  try {
    const api = new AioPro();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}