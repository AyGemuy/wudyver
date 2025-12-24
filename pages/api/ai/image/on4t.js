import axios from "axios";
import * as cheerio from "cheerio";
class On4tClient {
  constructor() {
    this.cookies = "";
    this.csrfToken = "";
    this.headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "content-type": "application/x-www-form-urlencoded"
    };
    this.client = axios.create({
      withCredentials: true
    });
  }
  async initSession() {
    try {
      console.log("Memulai sesi...");
      const url = "https://on4t.com/id/teks-ke-gambar";
      const response = await this.client.get(url, {
        headers: this.headers
      });
      const setCookies = response.headers["set-cookie"];
      this.cookies = setCookies?.map(c => c.split(";")[0]).join("; ") || "";
      console.log(this.cookies);
      const $ = cheerio.load(response.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content") || "";
      console.log(this.csrfToken);
      this.headers["cookie"] = this.cookies;
      this.headers["X-CSRF-TOKEN"] = this.csrfToken;
      this.headers["origin"] = "https://on4t.com";
      this.headers["referer"] = "https://on4t.com/id/teks-ke-gambar";
      console.log("Sesi berhasil diinisialisasi.");
    } catch (error) {
      console.error("Gagal inisialisasi sesi:", error.message);
    }
  }
  async generateImage({
    prompt = "Gunung dan langit biru"
  }) {
    try {
      await this.initSession();
      console.log("Mengirim prompt:", prompt);
      const url = "https://on4t.com/id/pembuat-gambar-ai/generate";
      const params = new URLSearchParams();
      params.append("prompt", prompt);
      let result = null;
      while (!result?.id) {
        const response = await this.client.post(url, params.toString(), {
          headers: this.headers
        });
        result = response.data;
        if (!result?.id) {
          console.log("ID belum ada, menunggu...");
          await new Promise(r => setTimeout(r, 2e3));
        }
      }
      console.log("ID ditemukan:", result.id);
      return await this.waitForResult(result.id);
    } catch (error) {
      console.error("Gagal membuat gambar:", error.message);
      return null;
    }
  }
  async waitForResult(id, maxMinutes = 1, delayMs = 2e3) {
    console.log(`Mulai polling untuk ID: ${id}`);
    const maxAttempts = Math.floor(maxMinutes * 60 * 1e3 / delayMs);
    let attempt = 1;
    while (attempt <= maxAttempts) {
      const result = await this.pollResult(id);
      if (result?.status === "success") {
        console.log("Hasil ditemukan:", result);
        return {
          url: `https://on4t.com${result.imageUrl}`
        };
      }
      console.log(`Percobaan ke-${attempt} belum selesai. Status: ${result?.status}. Menunggu...`);
      attempt++;
      await new Promise(r => setTimeout(r, delayMs));
    }
    console.warn("Polling berakhir tanpa hasil setelah 1 menit.");
    return null;
  }
  async pollResult(id) {
    try {
      const url = "https://on4t.com/id/pembuat-gambar-ai/fetch";
      const params = new URLSearchParams();
      params.append("id", id);
      const response = await this.client.post(url, params.toString(), {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Gagal polling:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const on4t = new On4tClient();
    const response = await on4t.generateImage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}