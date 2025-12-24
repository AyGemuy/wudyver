import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const origin = "https://katb.in";
class Katbin {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.headers = {
      authority: "katb.in",
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
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async create({
    content
  }) {
    try {
      const getRes = await this.client.get(origin, {
        headers: this.headers
      });
      const $get = cheerio.load(getRes.data);
      const csrfToken = $get('input[name="_csrf_token"]').val();
      if (!csrfToken) {
        throw new Error("Gagal mengambil CSRF Token");
      }
      const postData = new URLSearchParams({
        _csrf_token: csrfToken,
        "paste[content]": content
      });
      const postRes = await this.client.post(origin, postData.toString(), {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded",
          origin: origin,
          referer: `${origin}/`,
          priority: "u=0, i"
        },
        maxRedirects: 5
      });
      const finalUrl = postRes.request.res.responseUrl;
      if (finalUrl && finalUrl !== origin + "/") {
        return {
          url: finalUrl,
          id: finalUrl.split("/").pop()
        };
      } else {
        throw new Error("Gagal membuat paste, redirect tidak terjadi.");
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
      const targetUrl = `${origin}/${id}`;
      const res = await this.client.get(targetUrl, {
        headers: {
          ...this.headers,
          referer: `${origin}/`
        }
      });
      const $ = cheerio.load(res.data);
      const rawContent = $("code.break-word").text();
      if (rawContent) {
        return {
          raw: rawContent
        };
      } else {
        throw new Error("Konten tidak ditemukan atau ID salah");
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
  const scraper = new Katbin();
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