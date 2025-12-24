import axios from "axios";
import * as cheerio from "cheerio";
const origin = "https://pastes.fmhy.net";
class PastesFMHY {
  constructor() {
    this.origin = origin;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID",
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Site": "same-origin"
    };
  }
  async create({
    content
  }) {
    try {
      const res = await axios.post(`${this.origin}/api`, {
        content: content
      }, {
        headers: {
          ...this.headers,
          Accept: "*/*",
          "Content-Type": "application/json",
          Origin: this.origin,
          Referer: `${this.origin}/`,
          Priority: "u=1, i",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors"
        }
      });
      const data = res.data;
      if (data && data.id) {
        return {
          id: data.id,
          url: `${this.origin}/${data.id}`
        };
      } else {
        throw new Error("Gagal mendapatkan ID paste dari respons API");
      }
    } catch (err) {
      console.error("Error saat membuat paste:", err.message);
      return null;
    }
  }
  async raw({
    id
  }) {
    try {
      const cleanId = id.replace(`${this.origin}/`, "").replace("/", "");
      const res = await axios.get(`${this.origin}/${cleanId}`, {
        headers: {
          ...this.headers,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Priority: "u=0, i",
          Referer: `${this.origin}/`,
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
        }
      });
      const $ = cheerio.load(res.data);
      let raw = $("main.content > div").text().trim();
      if (!raw) {
        raw = $("main.content p").text().trim();
      }
      if (raw) {
        return {
          id: cleanId,
          raw: raw
        };
      } else {
        throw new Error("Konten tidak ditemukan dalam elemen HTML");
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
  const scraper = new PastesFMHY();
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
    if (!result) {
      return res.status(500).json({
        error: "Operation failed or returned null"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}