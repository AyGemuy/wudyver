import axios from "axios";
import * as cheerio from "cheerio";
const origin = "https://smalldev.tools";
class SmallDevTools {
  constructor() {
    this.origin = origin;
    this.cookies = "";
  }
  async create({
    content,
    title = `t${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
    language = "javascript"
  }) {
    try {
      const res = await axios.post(`${this.origin}/get-share-link`, new URLSearchParams({
        content: content,
        title: title,
        language: language
      }).toString(), {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: this.origin,
          referer: `${this.origin}/share-bin`,
          "x-requested-with": "XMLHttpRequest",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const match = res.data;
      if (match) {
        return {
          shareLink: match
        };
      } else {
        throw new Error("Tidak dapat menemukan link share");
      }
    } catch (err) {
      console.error("Error saat membuat share link:", err.message);
      return null;
    }
  }
  async raw({
    id
  }) {
    try {
      const headRes = await axios.head(`${this.origin}/share-bin/${id}`, {
        headers: {
          "user-agent": "Mozilla/5.0",
          referer: `${this.origin}/share-bin`
        }
      });
      const setCookie = headRes.headers["set-cookie"];
      if (setCookie) {
        this.cookies = setCookie.map(c => c.split(";")[0]).join("; ");
      }
      const res = await axios.get(`${this.origin}/share-bin/${id}`, {
        headers: {
          "user-agent": "Mozilla/5.0",
          cookie: this.cookies,
          referer: `${this.origin}/share-bin`
        }
      });
      const $ = cheerio.load(res.data);
      const raw = $("#shared_content").text();
      if (raw) {
        return {
          raw: raw
        };
      } else {
        throw new Error("Konten tidak ditemukan");
      }
    } catch (err) {
      console.error("Error saat mengambil konten raw:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "create | raw"
      }
    });
  }
  const scraper = new SmallDevTools();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.content) {
          return res.status(400).json({
            error: `Missing required field: content (required for ${action})`
          });
        }
        result = await scraper.create(params);
        break;
      case "raw":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await scraper.raw(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: create | raw`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}