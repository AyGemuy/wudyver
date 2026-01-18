import axios from 'axios';
import crypto from 'crypto';

class InLoader {
  constructor() {
    this.pkg = 'story.saver.reels.downloader';
    this.ua = 'okhttp/4.12.0';
    this.base = 'https://inload.app/api';
    // Generate device id unik
    this.devId = crypto.randomBytes(16).toString('hex');
    this.token = '';
  }

  // Fungsi registrasi
  async reg() {
    try {
      console.log(`[LOG] Auth Device: ${this.devId}`);
      const body = {
        platform: "A",
        package_name: this.pkg,
        version: "18.0.0",
        device_id: this.devId
      };

      const { data } = await axios.post(`${this.base}/register`, body, {
        headers: { 'User-Agent': this.ua, 'package-name': this.pkg }
      });

      this.token = data?.data?.token || '';
      return this.token;
    } catch (e) {
      console.log(`[ERR] Reg failed: ${e.message}`);
      return null;
    }
  }

  // Fungsi fetch dengan custom payload via spread
  async get(link, customPayload = {}) {
    try {
      console.log(`[LOG] Requesting API for: ${link.slice(0, 30)}...`);
      
      // Menggabungkan default payload dengan customPayload (...rest)
      const body = {
        device_id: this.devId,
        token: this.token,
        link: link,
        referer: "video",
        locale: "en",
        ...customPayload // SPREAD di sini untuk custom body payload
      };

      const { data } = await axios.post(`${this.base}/app-fetch`, body, {
        headers: { 'User-Agent': this.ua, 'package-name': this.pkg }
      });

      return data?.data || {};
    } catch (e) {
      console.log(`[ERR] Fetch failed: ${e.message}`);
      return {};
    }
  }

  // Fungsi utama download
  async download({ url, ...rest }) {
    try {
      const target = url || rest?.link || '';
      if (!target) throw new Error("URL is required");

      // Cek token (Logic OR & Ternary)
      this.token = this.token ? this.token : await this.reg();
      
      // Kirim rest ke fungsi get agar masuk ke body payload
      const { media, ...info } = await this.get(target, rest);

      // Parsing result: spread item agar data media lengkap
      const result = [media].filter(Boolean).map(item => ({
        ...item, // SPREAD item agar semua field API (url, type, thumb, dll) masuk
        timestamp: Date.now()
      }));

      console.log(`[LOG] Process Done. Result count: ${result.length}`);

      return {
        result,
        ...info, // Metadata dari API
      };

    } catch (e) {
      console.log(`[ERR] Download process error: ${e.message}`);
      return { result: [], error: e.message };
    }
  }
}

export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new InLoader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}