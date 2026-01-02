import axios from "axios";
import * as cheerio from "cheerio";
class QuizAPI {
  constructor() {
    this.cfg = {
      base: "https://quizwiki.jovavibes.com",
      agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      modes: {
        wiki: "/wiki",
        "photo-sound": "/guess-photo-sound",
        sound: "/quiz-sound",
        image: "/image-quiz"
      }
    };
  }
  headers(extra = {}) {
    return {
      "User-Agent": this.cfg.agent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...extra
    };
  }
  async req(url) {
    try {
      console.log(`[REQ] GET ${url}`);
      const res = await axios.get(url, {
        headers: this.headers()
      });
      console.log(`[OK] Status: ${res?.status}`);
      return res?.data || null;
    } catch (err) {
      console.log(`[ERR] ${err?.message || err}`);
      return null;
    }
  }
  parseWiki($, el) {
    const id = $(el).find("td").eq(0).text().trim();
    const title = $(el).find("td").eq(1).text().trim();
    const image = $(el).find("td").eq(2).find("img").attr("src");
    const audio = $(el).find("td").eq(3).find("source").attr("src");
    const desc = $(el).find("td").eq(4).text().trim();
    return id && title ? {
      id: Number(id) || id,
      title: title,
      image: image ? `${this.cfg.base}${image}` : null,
      audio: audio ? `${this.cfg.base}${audio}` : null,
      description: desc
    } : null;
  }
  parsePhotoSound($, el) {
    const id = $(el).find("td").eq(0).text().trim();
    const silhouette = $(el).find("td").eq(1).find("img").attr("src");
    const revealed = $(el).find("td").eq(2).find("img").attr("src");
    const audio = $(el).find("td").eq(3).find("source").attr("src");
    const answer = $(el).find("td").eq(4).text().trim();
    return id && answer ? {
      id: Number(id) || id,
      silhouette: silhouette ? `${this.cfg.base}${silhouette}` : null,
      revealed: revealed ? `${this.cfg.base}${revealed}` : null,
      audio: audio ? `${this.cfg.base}${audio}` : null,
      answer: answer
    } : null;
  }
  parseSound($, el) {
    const id = $(el).find("td").eq(0).text().trim();
    const title = $(el).find("td").eq(1).text().trim();
    const audio = $(el).find("td").eq(2).find("source").attr("src");
    const options = [];
    $(el).find("td").eq(3).find("img").each((j, opt) => {
      const img = $(opt).attr("src");
      const correct = $(opt).parent().find("span").length > 0;
      if (img) {
        options.push({
          image: `${this.cfg.base}${img}`,
          correct: correct
        });
      }
    });
    return id && title ? {
      id: Number(id) || id,
      title: title,
      audio: audio ? `${this.cfg.base}${audio}` : null,
      options: options
    } : null;
  }
  parseImage($, el) {
    const id = $(el).find("td").eq(0).text().trim();
    const image = $(el).find("td").eq(1).find("img").attr("src");
    const answer = $(el).find("td").eq(3).text().trim();
    return id && answer ? {
      id: Number(id) || id,
      image: image ? `${this.cfg.base}${image}` : null,
      answer: answer
    } : null;
  }
  async generate({
    mode,
    ...rest
  }) {
    try {
      const m = mode || rest?.m || "photo-sound";
      const path = this.cfg.modes[m];
      if (!path) {
        console.log(`[GENERATE] Invalid mode: ${m}`);
        console.log(`[GENERATE] Valid modes: ${Object.keys(this.cfg.modes).join(", ")}`);
        return {
          error: true,
          message: `Invalid mode: ${m}. Valid modes: ${Object.keys(this.cfg.modes).join(", ")}`,
          result: null
        };
      }
      console.log(`[GENERATE] Mode: ${m}`);
      const html = await this.req(`${this.cfg.base}${path}`);
      if (!html) return {
        error: true,
        message: "Failed to fetch",
        result: null
      };
      const $ = cheerio.load(html);
      const data = [];
      $("tbody tr").each((i, el) => {
        let item = null;
        if (m === "wiki") item = this.parseWiki($, el);
        else if (m === "photo-sound") item = this.parsePhotoSound($, el);
        else if (m === "sound") item = this.parseSound($, el);
        else if (m === "image") item = this.parseImage($, el);
        if (item) data.push(item);
      });
      if (data.length === 0) {
        return {
          error: true,
          message: "No data found",
          result: null
        };
      }
      if (m === "wiki") {
        return {
          error: false,
          message: "Data fetched successfully",
          result: data
        };
      }
      return {
        error: false,
        message: "Data fetched successfully",
        result: data
      };
    } catch (err) {
      console.log("[GENERATE] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new QuizAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}