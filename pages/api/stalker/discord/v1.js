import axios from "axios";
import * as cheerio from "cheerio";
class RappyLookup {
  constructor() {
    this.base = "https://id.rappytv.com";
  }
  async fetch(id) {
    console.log(`[Proses] Mengambil data untuk ID: ${id}...`);
    try {
      const {
        data
      } = await axios.get(`${this.base}/${id}`, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          referer: this.base,
          "accept-language": "id-ID"
        }
      });
      return data;
    } catch (e) {
      console.log(`[Error] Gagal fetch: ${e.message}`);
      return null;
    }
  }
  parse(html) {
    console.log("[Proses] Mengekstrak informasi dari HTML...");
    try {
      const $ = cheerio.load(html || "");
      const res = $(".resulth");
      return {
        id: $(res[0])?.text()?.trim() || "n/a",
        username: $(res[1])?.text()?.trim() || "unknown",
        avatar: $(".avyimg")?.attr("src") || null,
        created: $(res[2])?.text()?.trim() || "unknown",
        badges: $('p:contains("Badges")')?.text()?.split(":")?.[1]?.trim() || "-",
        status: html ? "success" : "failed"
      };
    } catch (e) {
      console.log(`[Error] Gagal parsing: ${e.message}`);
      return {};
    }
  }
  async search({
    id,
    ...rest
  }) {
    try {
      console.log("[Proses] Memulai pencarian...");
      const html = id ? await this.fetch(id) : null;
      const data = this.parse(html);
      return {
        ...data,
        ...rest,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.log(`[Error] Search crash: ${e.message}`);
      return {
        error: true
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.id) {
    return res.status(400).json({
      error: "Parameter 'id' diperlukan"
    });
  }
  const api = new RappyLookup();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}