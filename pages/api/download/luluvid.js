import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
class Luluvdo {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://luluvid.com/"
    };
    this.proxies = ["https://cors.luckydesigner.workers.dev/?", "https://cors.vaportrade.net/", "https://cors.eu.org/"];
  }
  log(level, message, metadata = {}) {
    const timestamp = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Makassar"
    });
    console.log(`[${timestamp}] [LULUVDO] [${level.toUpperCase()}] ${message}`, metadata);
  }
  async download({
    url,
    output = "json"
  }) {
    const startTime = Date.now();
    this.log("INFO", `Memulai proses untuk URL: ${url}`);
    const idMatch = url.match(/(?:\/[de])\/([a-zA-Z0-9_-]+)/);
    const id = idMatch?.[1];
    if (!id) {
      this.log("ERROR", "Invalid URL: ID tidak ditemukan");
      throw new Error("Invalid URL: ID not found");
    }
    this.log("INFO", `ID yang diekstrak: ${id}`);
    const client = axios.create({
      headers: this.headers,
      withCredentials: true,
      timeout: 15e3
    });
    const availableProxies = [...this.proxies].sort(() => .5 - Math.random());
    this.log("INFO", `Memulai percobaan dengan ${availableProxies.length} proxy yang tersedia.`);
    for (const proxyUrl of availableProxies) {
      this.log("INFO", `Mencoba dengan proxy: ${proxyUrl}`);
      try {
        const formLink = `https://luluvid.com/d/${id}_h`;
        const getResponse = await client.get(`${proxyUrl}${formLink}`, {
          headers: this.headers
        });
        const $ = cheerio.load(getResponse.data);
        const formResult = new FormData();
        const formFields = {};
        $("form#F1 input, Form#F1 input").each((_, el) => {
          const name = $(el).attr("name");
          const value = $(el).attr("value") || $(el).val();
          if (name && value) {
            formResult.append(name, value);
            formFields[name] = value;
          }
        });
        if (!formFields.hash) {
          this.log("WARN", `Gagal mendapatkan form valid (hash missing) dengan proxy ini. Mencoba proxy berikutnya...`);
          continue;
        }
        this.log("INFO", "Form valid ditemukan, mengirimkan permintaan POST...");
        const postResponse = await client.post(`${proxyUrl}${formLink}`, formResult, {
          headers: {
            ...this.headers,
            ...formResult.getHeaders()
          }
        });
        const postData = postResponse.data;
        if (postData.includes("g-recaptcha")) {
          this.log("WARN", `reCAPTCHA terdeteksi dengan proxy ini. Mencoba proxy berikutnya...`);
          continue;
        }
        const $$ = cheerio.load(postData);
        const result = {
          proxy_used: proxyUrl,
          size: $$("table tr:nth-child(1) td:nth-child(2)").text().trim() || "N/A",
          bytes: $$("table tr:nth-child(2) td:nth-child(2)").text().trim() || "N/A",
          ip: $$("table tr:nth-child(3) td:nth-child(2)").text().trim() || "N/A",
          link: $$("a.btn.btn-gradient.submit-btn").attr("href") || "N/A",
          expired: $$("div.text-center.text-danger").text().trim() || "N/A"
        };
        if (result.link && result.link !== "N/A") {
          this.log("INFO", `Link unduhan berhasil ditemukan: ${result.link}`);
          let media = null;
          if (output === "file") {
            this.log("INFO", "Mengunduh file...");
            const {
              data: buffer,
              headers
            } = await client.get(result.link, {
              headers: {
                Referer: formLink,
                "X-Forwarded-For": result.ip
              },
              responseType: "arraybuffer"
            });
            media = {
              buffer: Buffer.from(buffer),
              contentType: headers["content-type"] || "application/octet-stream",
              fileName: result.link.split("/").pop() || "downloaded_file"
            };
            this.log("INFO", "File berhasil diunduh.");
          }
          const totalDuration = Date.now() - startTime;
          this.log("INFO", "Proses selesai", {
            totalDuration: `${totalDuration}ms`
          });
          return media ? {
            ...result,
            ...media
          } : result;
        } else {
          this.log("WARN", "Gagal menemukan link unduhan dengan proxy ini. Mencoba proxy berikutnya...");
        }
      } catch (error) {
        this.log("ERROR", `Terjadi kesalahan dengan proxy ${proxyUrl}: ${error.message}. Mencoba proxy berikutnya...`);
      }
    }
    this.log("ERROR", "Semua proxy yang tersedia telah gagal.");
    throw new Error("Failed to download after trying all available proxies.");
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      output = "json"
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      console.log("[API HANDLER] [ERROR] URL tidak diberikan");
      return res.status(400).json({
        error: "URL parameter is required"
      });
    }
    if (!url.includes("lulu")) {
      return res.status(400).json({
        error: "Invalid URL. Only luluvid.com URLs are supported."
      });
    }
    const luluvdo = new Luluvdo();
    const result = await luluvdo.download({
      url: url,
      output: output
    });
    switch (output) {
      case "file":
        if (result.buffer) {
          res.setHeader("Content-Type", result.contentType);
          res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
          return res.status(200).send(result.buffer);
        }
        return res.status(500).json({
          error: "Failed to retrieve file buffer."
        });
      case "json":
      default:
        return res.status(200).json({
          success: true,
          result: result
        });
    }
  } catch (error) {
    console.error(`[API HANDLER] [ERROR] Gagal memproses permintaan: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}