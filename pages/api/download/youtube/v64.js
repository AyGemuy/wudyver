import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ChordMiniAPI {
  constructor() {
    this.axios = axios.create({
      baseURL: "https://www.chordmini.me/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.chordmini.me",
        priority: "u=1, i",
        referer: "https://www.chordmini.me/?ref=aier.im",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  async search({
    query,
    ...rest
  }) {
    console.log(`[LOG] Memulai proses pencarian untuk query: "${query}"`);
    try {
      console.log("[LOG] Mengirim permintaan ke /search-youtube...");
      const searchResponse = await this.axios.post("/search-youtube", {
        query: query,
        maxResults: rest.maxResults || 10
      });
      const firstResult = searchResponse?.data?.results?.[0] || {};
      const {
        id: videoId,
        title
      } = firstResult;
      if (!videoId) {
        console.log("[LOG] Tidak ada hasil yang ditemukan untuk pencarian.");
        return null;
      }
      console.log(`[LOG] Video ditemukan: "${title}" (ID: ${videoId})`);
      return await this.xtr({
        videoId: videoId,
        title: title
      });
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan selama proses pencarian:", error.message);
      return null;
    } finally {
      console.log(`[LOG] Proses pencarian untuk query: "${query}" selesai.`);
    }
  }
  async xtr({
    videoId,
    title
  }) {
    console.log(`[LOG] Memulai ekstraksi audio untuk videoId: "${videoId}"`);
    try {
      const extractResponse = await this.axios.post("/extract-audio", {
        videoId: videoId,
        forceRefresh: false,
        videoMetadata: {
          id: videoId,
          title: title
        },
        originalTitle: title
      });
      const audioUrl = extractResponse?.data?.audioUrl;
      if (!audioUrl) {
        console.log("[LOG] Gagal mendapatkan URL audio.");
        return null;
      }
      const proxyUrl = `https://www.chordmini.me/api/proxy-audio?url=${encodeURIComponent(audioUrl)}`;
      console.log("[LOG] Ekstraksi audio berhasil.");
      return {
        ...extractResponse.data,
        proxyUrl: proxyUrl
      };
    } catch (error) {
      console.error(`[ERROR] Gagal mengekstrak audio untuk videoId: ${videoId}:`, error.message);
      return null;
    } finally {
      console.log(`[LOG] Proses ekstraksi audio untuk videoId: "${videoId}" selesai.`);
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
    const downloader = new ChordMiniAPI();
    const response = await downloader.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}