import axios from "axios";
import * as cheerio from "cheerio";
const origin = "https://pasteboy.com";
class Pasteboy {
  constructor() {
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async create({
    content
  }) {
    try {
      const postData = new URLSearchParams({
        content: content
      });
      const res = await axios.post(origin, postData.toString(), {
        headers: {
          ...this.headers,
          "content-type": "application/x-form-urlencoded",
          origin: origin,
          referer: `${origin}/`
        }
      });
      const $ = cheerio.load(res.data);
      const rawUrl = $("#rawUrl").text();
      if (rawUrl) {
        const id = rawUrl.split("/").pop().replace(".txt", "");
        return {
          url: rawUrl,
          id: id
        };
      } else {
        throw new Error("Gagal mendapatkan URL hasil simpan.");
      }
    } catch (err) {
      console.error("Error Pasteboy Create:", err.message);
      return null;
    }
  }
  async raw({
    id
  }) {
    try {
      const cleanId = id.includes(".txt") ? id : `${id}.txt`;
      const targetUrl = `${origin}/r/${cleanId}`;
      const res = await axios.get(targetUrl, {
        headers: {
          ...this.headers,
          "sec-fetch-site": "none"
        }
      });
      if (res.data) {
        return {
          raw: res.data
        };
      } else {
        throw new Error("Konten tidak ditemukan.");
      }
    } catch (err) {
      console.error("Error Pasteboy Raw:", err.message);
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
      available_actions: ["create", "raw"]
    });
  }
  const scraper = new Pasteboy();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.content) {
          return res.status(400).json({
            error: "Field 'content' is required for create"
          });
        }
        result = await scraper.create(params);
        break;
      case "raw":
        if (!params.id) {
          return res.status(400).json({
            error: "Field 'id' is required for raw"
          });
        }
        result = await scraper.raw(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Use 'create' or 'raw'.`
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