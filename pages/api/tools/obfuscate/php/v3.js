import axios from "axios";
import * as cheerio from "cheerio";
const VALID_OPTIONS = ["Weak Obfuscation", "Medium Level Obfuscation", "Strong Obfuscation", "High Level Obfuscation"];
class PrinshToolsObfuscator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://tools.prinsh.com",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://tools.prinsh.com",
        pragma: "no-cache",
        referer: "https://tools.prinsh.com/home/?tools=obfuscate",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        cookie: "VISITOR=mobile; BROWSER=Google%20Chrome"
      }
    });
    console.log("Proses: Klien HTTP untuk Prinsh Tools telah diinisialisasi.");
  }
  async generate({
    code,
    option = "Strong Obfuscation",
    ...rest
  }) {
    console.log(`Proses: Memulai generasi obfuscate... Opsi yang dipilih: "${option}"`);
    if (!VALID_OPTIONS.includes(option)) {
      throw new Error(`Opsi '${option}' tidak valid. Opsi yang tersedia adalah: ${VALID_OPTIONS.join(", ")}`);
    }
    const phpCode = code || "<?php echo 'kode default'; ?>";
    try {
      const params = new URLSearchParams();
      params.append("php", phpCode);
      params.append("option", option);
      params.append("submit", "Submit");
      console.log("Proses: Mengirim permintaan POST ke server...");
      const response = await this.client.post("/home/?tools=obfuscate", params);
      console.log("Proses: Respons diterima, memulai parsing HTML...");
      const $ = cheerio.load(response.data);
      const output = $("textarea:not([name])").val();
      const finalResult = output ? output.trim() : null;
      if (!finalResult) {
        console.log("Peringatan: Tidak dapat menemukan konten output. Mungkin struktur HTML telah berubah.");
      } else {
        console.log("Proses: Ekstraksi konten berhasil.");
      }
      return {
        result: finalResult,
        length: finalResult?.length || 0
      };
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Terjadi kesalahan selama proses Prinsh Tools:", errorMessage);
      throw new Error(errorMessage);
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
    const api = new PrinshToolsObfuscator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message.startsWith("Opsi")) {
      return res.status(400).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}