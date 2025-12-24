import axios from "axios";
import * as cheerio from "cheerio";
class TelegramSticker {
  constructor() {
    this.client = axios.create({
      headers: {
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/5.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Google Chrome";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
    this.baseUrl = "https://tlgrm.eu";
  }
  async getDetails(item) {
    const detailUrl = `${this.baseUrl}/stickers/${item.link}`;
    try {
      console.log(`[Proses] Mengambil detail untuk stiker: "${item.name}"`);
      const response = await this.client.get(detailUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
        }
      });
      const $ = cheerio.load(response.data);
      const title = $(".stickerpack-header__title__name")?.text()?.trim() || "Judul Tidak Ditemukan";
      const stickers = [];
      $(".sticker-pack-preview__item").each((index, element) => {
        const stickerUrl = $(element).attr("href");
        if (stickerUrl) {
          stickers.push(`${this.baseUrl}${stickerUrl}`);
        }
      });
      console.log(`[Sukses] Berhasil mendapatkan ${stickers.length} stiker dari "${title}"`);
      return {
        ...item,
        title: title,
        stickers_total: stickers.length,
        stickers: stickers
      };
    } catch (error) {
      console.error(`[Gagal] Tidak dapat mengambil detail untuk ${detailUrl}. Error: ${error.message}`);
      return {
        ...item,
        title: "Gagal Memuat Detail",
        stickers_total: 0,
        stickers: []
      };
    }
  }
  async search({
    query,
    limit = 5,
    detail = true,
    ...rest
  }) {
    if (!query) {
      throw new Error("Paramenter 'query' wajib diisi.");
    }
    try {
      console.log(`[Mulai] Pencarian stiker dengan query: "${query}"`);
      const mainPageResponse = await this.client.get(`${this.baseUrl}/stickers`);
      const html = mainPageResponse.data;
      const configMatch = html.match(/window\.config = Object\.freeze\((.*?)\);/);
      const configString = configMatch ? configMatch[1] : "{}";
      const config = JSON.parse(configString);
      const apiKey = config?.typesense_api_key || null;
      const apiHost = config?.typesense_host || null;
      if (!apiKey || !apiHost) {
        throw new Error("API Key atau Typesense Host tidak ditemukan di halaman utama.");
      }
      console.log("[Info] Konfigurasi API berhasil diekstrak.");
      const searchUrl = `${apiHost}/collections/stickers/documents/search`;
      const searchParams = new URLSearchParams({
        q: query,
        query_by: "tokenized_name,tags",
        per_page: limit,
        ...rest
      }).toString();
      console.log(`[Proses] Mengirim permintaan ke API Typesense...`);
      const searchResponse = await this.client.get(`${searchUrl}?${searchParams}`, {
        headers: {
          accept: "*/*",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/`,
          "x-typesense-api-key": apiKey
        }
      });
      const hits = searchResponse.data?.hits ?? [];
      console.log(`[Info] Ditemukan ${searchResponse.data?.found || 0} total hasil, mengambil ${hits.length}.`);
      let results = hits.map(hit => ({
        name: hit.document?.name,
        link: hit.document?.link,
        installs: hit.document?.installs || 0
      }));
      if (detail) {
        console.log("[Proses] Mengambil detail untuk semua hasil (secara sekuensial)...");
        const detailedResults = [];
        for (const item of results) {
          const detailItem = await this.getDetails(item);
          detailedResults.push(detailItem);
        }
        results = detailedResults;
      }
      console.log("[Selesai] Proses pencarian berhasil.");
      return results;
    } catch (error) {
      console.error(`[Error] Terjadi kesalahan fatal selama proses pencarian: ${error.message}`);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const sticker = new TelegramSticker();
    const response = await sticker.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}