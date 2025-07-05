import axios from "axios";
import https from "https";
import crypto from "crypto";
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false
});
const CDN_BASE = "https://cdn.remusic.ai";
const POLLING_TIMEOUT_MS = 3e4;
class RemusicAI {
  constructor(baseUrl = "https://remusic.ai", pollIntervalMs = 3e3) {
    this.baseUrl = baseUrl;
    this.httpsAgent = httpsAgent;
    this.pollIntervalMs = pollIntervalMs;
    this.pollTimeoutMs = POLLING_TIMEOUT_MS;
  }
  randomCryptoIP() {
    return crypto.randomBytes(4).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    const requestId = this.randomID(8);
    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      pragma: "no-cache",
      "cache-control": "no-cache",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-fetch-site": "none",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      priority: "u=1, i",
      "X-Forwarded-For": ip,
      "X-Real-IP": ip,
      "X-Request-ID": requestId,
      ...extra
    };
    console.log(`[Request ID: ${requestId}] Headers dibangun:`, headers);
    return headers;
  }
  async pollMusicStatus(songId, requestId) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/api/v1/ai-music/music/${songId}`, {
        headers: this.buildHeaders(),
        httpsAgent: this.httpsAgent
      });
      console.log(`[Request ID: ${requestId}] [Song ID: ${songId}] Status polling:`, data);
      return data;
    } catch (error) {
      console.error(`[Request ID: ${requestId}] [Song ID: ${songId}] Gagal polling status:`, error);
      throw error;
    }
  }
  async waitForMusicCompletion(songId, requestId) {
    const startTime = Date.now();
    console.log(`[Request ID: ${requestId}] [Song ID: ${songId}] Memulai polling dengan timeout ${this.pollTimeoutMs / 1e3} detik.`);
    while (Date.now() - startTime < this.pollTimeoutMs) {
      try {
        const result = await this.pollMusicStatus(songId, requestId);
        if (result?.data?.audio_url && result?.data?.image_url) {
          console.log(`[Request ID: ${requestId}] [Song ID: ${songId}] Polling berhasil! Audio dan gambar tersedia.`);
          return {
            ...result.data,
            audio_url: `${CDN_BASE}${result.data.audio_url}`,
            image_url: `${CDN_BASE}${result.data.image_url}`,
            image_large_url: `${CDN_BASE}${result.data.image_large_url}`
          };
        } else if (result?.data?.status === "failed") {
          console.error(`[Request ID: ${requestId}] [Song ID: ${songId}] Pembuatan musik gagal:`, result.data);
          return result.data;
        } else if (result?.data?.percentage) {
          console.log(`[Request ID: ${requestId}] [Song ID: ${songId}] Progres: ${result.data.percentage}%`);
        } else {
          console.log(`[Request ID: ${requestId}] [Song ID: ${songId}] Status: ${result?.data?.status || "Memproses..."}`);
        }
      } catch (error) {
        console.error(`[Request ID: ${requestId}] [Song ID: ${songId}] Kesalahan saat polling:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
    console.log(`[Request ID: ${requestId}] [Song ID: ${songId}] Batas waktu polling tercapai.`);
    return {
      song_id: songId,
      status: "timeout"
    };
  }
  async generateMusic({
    time = 30,
    prompt = "Generate a pleasant melody.",
    supp = 3
  } = {}) {
    const requestId = this.randomID(8);
    try {
      const {
        data: initialResponse
      } = await axios.post(`${this.baseUrl}/api/v1/ai-music/music`, {
        duration: time,
        prompt: prompt,
        supplier: supp
      }, {
        headers: this.buildHeaders(),
        httpsAgent: this.httpsAgent
      });
      const songId = initialResponse?.data?.[0]?.song_id;
      if (songId) {
        console.log(`[Request ID: ${requestId}] Memulai pembuatan musik untuk Song ID: ${songId}`);
        return await this.waitForMusicCompletion(songId, requestId);
      } else {
        console.error(`[Request ID: ${requestId}] Gagal mendapatkan song_id:`, initialResponse?.data);
        return null;
      }
    } catch (error) {
      console.error(`[Request ID: ${requestId}] Gagal menghasilkan musik:`, error);
      throw error;
    }
  }
  async getTask({
    taskId: id
  }) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/api/v1/ai-music/music/${id}`, {
        headers: this.buildHeaders(),
        httpsAgent: this.httpsAgent
      });
      console.log(`[Task ID: ${id}] Status tugas:`, data);
      return data;
    } catch (error) {
      console.error(`[Task ID: ${id}] Gagal mendapatkan status tugas:`, error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const reMusic = new RemusicAI();
  switch (action) {
    case "create":
      if (!params.prompt) {
        return res.status(400).json({
          message: "No prompt provided"
        });
      }
      try {
        const song = await reMusic.generateMusic(params);
        if (!song) return res.status(500).json({
          error: "Gagal membuat lagu"
        });
        return res.status(200).json(song);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    case "status":
      if (!params.taskId) {
        return res.status(400).json({
          message: "No taskId provided"
        });
      }
      try {
        const musicStatus = await reMusic.getTask(params);
        if (!musicStatus) return res.status(500).json({
          error: "Gagal mengambil daftar lagu"
        });
        return res.status(200).json(musicStatus);
      } catch (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    default:
      return res.status(400).json({
        error: "Action tidak valid. Gunakan ?action=create atau ?action=status"
      });
  }
}