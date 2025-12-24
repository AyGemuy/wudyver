import axios from "axios";
import * as cheerio from "cheerio";
class ObfuscatorLol {
  constructor() {
    this.client = axios.create({
      baseURL: "https://obfuscator.lol",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://obfuscator.lol",
        pragma: "no-cache",
        referer: "https://obfuscator.lol/php-obfuscator.php",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("Proses: Klien HTTP untuk Obfuscator.lol telah diinisialisasi.");
  }
  sanitizeCode(phpCode) {
    return phpCode.replace(/<\?php|<\?|\?>/g, "").trim();
  }
  async generate({
    code,
    ...rest
  }) {
    console.log("Proses: Memulai generasi obfuscate dengan Obfuscator.lol...");
    const phpCode = code || "echo 'kode default';";
    const sanitizedCode = this.sanitizeCode(phpCode);
    if (!sanitizedCode) {
      throw new Error("Input 'code' menjadi kosong setelah menghapus tag PHP. Mohon isi dengan kode yang valid.");
    }
    console.log("Proses: Kode telah disanitasi (tag PHP dihapus).");
    try {
      const params = new URLSearchParams();
      params.append("source_code", sanitizedCode);
      console.log("Proses: Mengirim permintaan POST ke server...");
      const response = await this.client.post("/php-obfuscator.php", params);
      console.log("Proses: Respons diterima, memulai parsing HTML...");
      const $ = cheerio.load(response.data);
      const output = $("textarea#obfuscated_code").val();
      const finalResult = output ? output.trim() : null;
      if (!finalResult) {
        console.log('Peringatan: Tidak dapat menemukan konten output. Selector "textarea#obfuscated_code" mungkin gagal.');
      } else {
        console.log("Proses: Ekstraksi konten berhasil.");
      }
      return {
        result: finalResult,
        length: finalResult?.length || 0
      };
    } catch (error) {
      const errorMessage = error.response ? `Status: ${error.response.status}` : error.message;
      console.error("Terjadi kesalahan selama proses Obfuscator.lol:", errorMessage);
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
    const api = new ObfuscatorLol();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    if (error.message.includes("menjadi kosong")) {
      return res.status(400).json({
        error: error.message
      });
    }
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}