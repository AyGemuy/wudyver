import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Screenshoter {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        origin: "https://www.screenshotmachine.com",
        referer: "https://www.screenshotmachine.com/"
      }
    }));
  }
  async generate({
    url,
    output = "buffer",
    ...rest
  }) {
    try {
      console.log(`[1/3] Memulai inisialisasi sesi untuk: ${url}`);
      await this.http.post("https://www.screenshotmachine.com/", new URLSearchParams({
        url: url,
        device: rest.device || "desktop",
        full: rest.full || "on",
        cacheLimit: rest.cacheLimit || 0
      }).toString());
      console.log("[2/3] Meminta token capture...");
      const {
        data: cap
      } = await this.http.post("https://www.screenshotmachine.com/capture.php", new URLSearchParams({
        url: url,
        device: rest.device || "desktop",
        full: rest.full || "on",
        cacheLimit: 0
      }).toString(), {
        headers: {
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const fileLink = cap?.link || null;
      if (!fileLink || cap?.status !== "success") throw new Error("Gagal mendapatkan link download");
      console.log(`[3/3] Mengunduh hasil: ${fileLink}`);
      const res = await this.http.get(`https://www.screenshotmachine.com/${fileLink}`, {
        responseType: "arraybuffer"
      });
      const buffer = res?.data || Buffer.alloc(0);
      const mime = res?.headers["content-type"] || "image/jpeg";
      const finalResult = output === "base64" ? buffer.toString("base64") : output === "url" ? `https://www.screenshotmachine.com/${fileLink}` : buffer;
      return {
        data: finalResult,
        mime: mime
      };
    } catch (err) {
      console.error(`[Error] Terjadi kesalahan:`, err?.message);
      return {
        result: null,
        mime: null,
        error: err?.message
      };
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
  const api = new Screenshoter();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}