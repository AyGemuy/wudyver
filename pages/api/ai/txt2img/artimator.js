import axios from "axios";
import * as cheerio from "cheerio";
class ArtimatorAI {
  constructor() {
    this.baseURL = "https://ai-image-generator.artimator.io";
    this.session = axios.create({
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "accept-language": "id-ID,id;q=0.9",
        origin: this.baseURL,
        referer: `${this.baseURL}/text-to-image`
      }
    });
    this.cookie = "";
  }
  async getCSRFTokenAndCookie() {
    try {
      console.log("Mengambil CSRF Token dan Cookie...");
      const {
        data,
        headers
      } = await this.session.get(`${this.baseURL}/text-to-image`);
      const $ = cheerio.load(data);
      const csrfToken = $('meta[name="csrf-token"]').attr("content");
      this.cookie = headers["set-cookie"]?.join("; ") || "";
      if (!csrfToken || !this.cookie) throw new Error("Token atau cookie tidak ditemukan!");
      this.session.defaults.headers.Cookie = this.cookie;
      console.log("CSRF Token dan Cookie berhasil didapatkan.");
      return csrfToken;
    } catch (error) {
      console.error("Gagal mengambil CSRF Token dan Cookie:", error.message);
      throw error;
    }
  }
  async create({
    prompt = "men",
    style = "anime",
    model = "sd_deliberate",
    advanced = "on",
    ratio = "portrait",
    negative = "",
    steps = "29",
    cfg = "7",
    seed = "",
    sampling = "Euler a",
    face_fix = "true",
    premium = "false",
    hyperdetalized = "false"
  } = {}) {
    try {
      console.log(`Mengirim permintaan dengan prompt: "${prompt}", style: "${style}"`);
      const csrfToken = await this.getCSRFTokenAndCookie();
      const payload = new URLSearchParams({
        authenticity_token: csrfToken,
        model: model,
        prompt: prompt,
        style: `${style}.png`,
        advanced: advanced,
        ratio: ratio,
        negative: negative,
        steps: steps,
        cfg: cfg,
        seed: seed,
        sampling: sampling,
        face_fix: face_fix,
        premium: premium,
        hyperdetalized: hyperdetalized
      });
      const response = await this.session.post(`${this.baseURL}/predictions`, payload.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const $ = cheerio.load(response.data);
      const refreshUrl = $(".flex-1[data-controller='refresh']").attr("data-refresh-url-value");
      if (!refreshUrl) throw new Error("URL refresh tidak ditemukan!");
      console.log("Permintaan berhasil dikirim, menunggu hasil...");
      return await this.pollUntilCompleted(refreshUrl);
    } catch (error) {
      console.error("Gagal membuat gambar:", error.message);
      throw error;
    }
  }
  async pollUntilCompleted(refreshUrl) {
    try {
      const url = `${this.baseURL}${refreshUrl}`;
      let attempts = 0;
      console.log("Memulai polling untuk hasil...");
      while (attempts < 30) {
        try {
          const {
            data
          } = await this.session.get(url);
          const $ = cheerio.load(data);
          if ($("[data-role='completed']").length) {
            const imageUrl = $("img.peer").attr("src");
            if (imageUrl) {
              console.log("Gambar berhasil dibuat:", imageUrl);
              return imageUrl;
            }
          }
        } catch (error) {
          console.error("Polling error:", error.message);
        }
        await new Promise(res => setTimeout(res, 1e3));
        attempts++;
        console.log(`Polling ke-${attempts}...`);
      }
      throw new Error("Gambar tidak selesai dalam waktu yang ditentukan.");
    } catch (error) {
      console.error("Gagal dalam polling hasil:", error.message);
      throw error;
    }
  }
  async getStyles() {
    try {
      console.log("Mengambil daftar style...");
      const {
        data
      } = await this.session.get(`${this.baseURL}/text-to-image`);
      const $ = cheerio.load(data);
      const styles = [];
      $("[data-styles-target='dialog'] img").each((_, el) => {
        const name = $(el).attr("data-styles-name-param");
        name && styles.push({
          name: name,
          description: $(el).attr("data-styles-description-param") || "",
          imageUrl: $(el).attr("data-styles-image-param") || ""
        });
      });
      console.log("Daftar style berhasil diambil:", styles.length, "style ditemukan.");
      return styles;
    } catch (error) {
      console.error("Gagal mengambil daftar style:", error.message);
      return [];
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const artimator = new ArtimatorAI();
    switch (action) {
      case "create":
        console.log("Membuat gambar dengan parameter:", params);
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required"
          });
        }
        return res.status(200).json({
          url: await artimator.create(params)
        });
      case "style":
        console.log("Mengambil daftar style...");
        return res.status(200).json({
          styles: await artimator.getStyles()
        });
      default:
        return res.status(400).json({
          error: "Action tidak valid"
        });
    }
  } catch (error) {
    console.error("Error API:", error.message);
    return res.status(500).json({
      error: error.message
    });
  }
}