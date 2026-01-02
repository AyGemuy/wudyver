import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class QuizAPI {
  constructor() {
    this.cfg = {
      base: "https://webquiz.net",
      api: "https://webquiz.net/api",
      agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
  }
  headers(extra = {}) {
    return {
      "User-Agent": this.cfg.agent,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      Referer: `${this.cfg.base}/`,
      "Sec-Ch-Ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      ...extra
    };
  }
  async init() {
    try {
      await this.client.get(this.cfg.base, {
        headers: this.headers()
      });
      return true;
    } catch (err) {
      return false;
    }
  }
  async req(url, opts = {}) {
    try {
      const cookies = await this.jar.getCookies(this.cfg.base);
      if (cookies.length === 0) await this.init();
      const res = await this.client.request({
        url: url,
        method: "GET",
        headers: this.headers(opts.headers),
        ...opts
      });
      return res?.data || null;
    } catch (err) {
      console.log(`[REQ-ERROR] ${err.message} -> ${url}`);
      throw err;
    }
  }
  async getDaily({
    take,
    type,
    filter
  }) {
    const url = `${this.cfg.api}/v2/quiz?type=${type}&filter=${filter}&take=${take}`;
    return await this.req(url);
  }
  async getDetail(id, lang) {
    const url = `${this.cfg.api}/stats/detail/${id}?lang=${lang}`;
    const data = await this.req(url, {
      headers: {
        Referer: `${this.cfg.base}/en/quiz/${id}-quiz`
      }
    });
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      ...item
    }));
  }
  async generate({
    take = 2,
    ...rest
  }) {
    const type = rest.type || "daily";
    const filter = rest.filter || "today";
    const lang = rest.lang || "en";
    const mode = (rest.mode || "all").toLowerCase();
    const collectedImages = [];
    const collectedAudios = [];
    console.log(`[START] Scraping (Take: ${take}, Type: ${type}, Mode: ${mode})...`);
    try {
      let dailyData = [];
      try {
        dailyData = await this.getDaily({
          take: take,
          type: type,
          filter: filter
        });
      } catch (e) {
        console.log(`[ERROR-LIST] ${e.message}`);
        return {
          error: true,
          message: "Gagal mengambil daftar kuis."
        };
      }
      if (!dailyData || !Array.isArray(dailyData) || dailyData.length === 0) {
        return {
          error: true,
          message: "List kuis kosong.",
          result: {}
        };
      }
      console.log(`[INFO] Found ${dailyData.length} quizzes.`);
      for (const quiz of dailyData) {
        try {
          console.log(`[STEP 2] Processing ID: ${quiz.id}...`);
          const details = await this.getDetail(quiz.id, lang);
          if (details && details.length > 0) {
            for (const item of details) {
              if (item.type === "image") {
                collectedImages.push(item);
              } else if (item.type === "audio") {
                collectedAudios.push(item);
              }
            }
          }
        } catch (errDetail) {
          console.log(`[ERROR-DETAIL] ID ${quiz.id}: ${errDetail.message}`);
        }
      }
      const finalResult = {};
      if (mode === "all" || mode === "image") {
        finalResult.image = collectedImages;
      }
      if (mode === "all" || mode === "audio") {
        finalResult.audio = collectedAudios;
      }
      console.log(`[FINISH] Images: ${collectedImages.length}, Audios: ${collectedAudios.length}`);
      return {
        error: false,
        message: "Generate success",
        stats: {
          quizzes_processed: dailyData.length,
          total_images: collectedImages.length,
          total_audios: collectedAudios.length
        },
        result: finalResult
      };
    } catch (errGlobal) {
      console.log(`[FATAL] ${errGlobal.message}`);
      return {
        error: true,
        message: errGlobal.message,
        result: {}
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