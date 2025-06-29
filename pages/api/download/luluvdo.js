import axios from "axios";
import * as cheerio from "cheerio";
import fakeUa from "fake-useragent";
import {
  FormData
} from "formdata-node";
class Luluvdo {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async download(url, output = "json") {
    try {
      console.log(`[LOG] Memulai proses untuk URL: ${url}`);
      const idMatch = url.match(/(?:\/[de])\/([a-zA-Z0-9_-]+)/);
      const id = idMatch?.[1];
      if (!id) throw new Error("Invalid URL: ID not found");
      const client = axios.create({
        headers: {
          "User-Agent": fakeUa()
        },
        withCredentials: true
      });
      console.log(`[LOG] Mengambil form dari halaman: https://luluvdo.com/d/${id}_h`);
      let formResult;
      do {
        const isLink = `https://luluvdo.com/d/${id}_h`;
        const {
          data: pageData
        } = await client.get(`${isLink}`, {
          headers: this.headers
        });
        const $ = cheerio.load(pageData);
        formResult = new FormData();
        $("form#F1 input").each((_, el) => {
          const name = $(el).attr("name");
          const value = $(el).val();
          if (name && value) formResult.append(name, value);
        });
        console.log(`[LOG] Form yang diambil: ${JSON.stringify([ ...formResult ])}`);
        if (!formResult.has("hash")) {
          console.log("[LOG] Form tidak valid, mencoba lagi...");
          await new Promise(resolve => setTimeout(resolve, 2e3));
        }
      } while (!formResult.has("hash"));
      console.log("[LOG] Form berhasil diambil, mengirimkan permintaan untuk mendapatkan link unduhan");
      let result;
      do {
        const {
          data: postData
        } = await client.post(`https://luluvdo.com/d/${id}_h`, formResult);
        const $$ = cheerio.load(postData);
        result = {
          size: $$("table tr:nth-child(1) td:nth-child(2)").text().trim() || "N/A",
          bytes: $$("table tr:nth-child(2) td:nth-child(2)").text().trim() || "N/A",
          ip: $$("table tr:nth-child(3) td:nth-child(2)").text().trim() || "N/A",
          link: $$("a.btn.btn-gradient.submit-btn").attr("href") || "N/A",
          expired: $$("div.text-center.text-danger").text().trim() || "N/A"
        };
        console.log(`[LOG] Hasil: ${JSON.stringify(result)}`);
        if (result.link === "N/A") {
          console.log("[LOG] Link unduhan belum tersedia, mencoba lagi...");
          await new Promise(resolve => setTimeout(resolve, 2e3));
        }
      } while (result.link === "N/A");
      console.log(`[LOG] Link unduhan berhasil ditemukan: ${result.link}`);
      let media = null;
      if (output === "file") {
        console.log("[LOG] Mengunduh file...");
        const {
          data: buffer,
          headers
        } = await client.get(result.link, {
          headers: {
            Referer: `https://luluvdo.com/d/${id}_h`,
            "X-Forwarded-For": result.ip
          },
          responseType: "arraybuffer"
        });
        media = {
          buffer: Buffer.from(buffer),
          contentType: headers["content-type"] || "application/octet-stream",
          fileName: result.link.split("/").pop() || "downloaded_file"
        };
        console.log("[LOG] File berhasil diunduh");
      }
      return media ? {
        ...result,
        ...media
      } : result;
    } catch (error) {
      console.error(`[ERROR] Proses gagal: ${error.message}`);
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url,
      output = "json"
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      console.log("[ERROR] URL tidak diberikan");
      return res.status(400).json({
        error: "URL is required"
      });
    }
    const luluvdo = new Luluvdo();
    const result = await luluvdo.download(url, output);
    switch (output) {
      case "file":
        if (result.buffer) {
          console.log("[LOG] Mengirim file sebagai respon");
          res.setHeader("Content-Type", result.contentType);
          res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
          return res.status(200).send(result.buffer);
        }
        break;
      case "json":
      default:
        console.log("[LOG] Mengirimkan hasil dalam format JSON");
        return res.status(200).json({
          result: result
        });
    }
    console.error("[ERROR] Terjadi kesalahan tak terduga");
    return res.status(500).json({
      error: "Unexpected error occurred"
    });
  } catch (error) {
    console.error(`[ERROR] Gagal memproses permintaan: ${error.message}`);
    return res.status(500).json({
      error: error.message
    });
  }
}