import axios from "axios";
import * as cheerio from "cheerio";
class Obfuscator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://www.r57shell.net",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.r57shell.net",
        pragma: "no-cache",
        referer: "https://www.r57shell.net/obfuscator.php",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("Proses: Klien HTTP telah diinisialisasi.");
  }
  async generate({
    code,
    ...rest
  }) {
    console.log("Proses: Memulai generasi obfuscate...");
    const phpCode = code || "<?php echo 'kode default'; ?>";
    try {
      const params = new URLSearchParams();
      params.append("code", phpCode);
      params.append("submit", "Submit");
      console.log("Proses: Mengirim permintaan POST ke server...");
      const response = await this.client.post("/obfuscator.php", params);
      console.log("Proses: Respons diterima, memulai parsing HTML...");
      const $ = cheerio.load(response.data);
      const output = $('textarea[name="code_output"]')?.val();
      const finalResult = output ? output.trim() : null;
      console.log("Proses: Ekstraksi konten berhasil.");
      return {
        result: finalResult,
        length: finalResult?.length || 0
      };
    } catch (error) {
      console.error("Terjadi kesalahan selama proses:", error.message);
      return {
        result: null,
        length: 0
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.code) {
    return res.status(400).json({
      error: "Input 'code' wajib diisi."
    });
  }
  try {
    const api = new Obfuscator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}