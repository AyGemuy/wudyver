import axios from "axios";
class PhpMinifyObfuscator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://php-minify.com/php-obfuscator",
      headers: {
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://php-minify.com",
        pragma: "no-cache",
        referer: "https://php-minify.com/php-obfuscator/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    });
    console.log("Proses: Klien HTTP untuk php-minify telah diinisialisasi.");
  }
  async _getToken() {
    console.log("Proses: Memulai permintaan untuk mendapatkan CSRF token...");
    const params = new URLSearchParams();
    params.append("acceptCookies", "1");
    const response = await this.client.post("/index.php", params, {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01"
      }
    });
    if (response.data && response.data.success && response.data.data) {
      console.log("Proses: CSRF token berhasil didapatkan.");
      return response.data.data;
    } else {
      throw new Error("Gagal mendapatkan CSRF token dari server.");
    }
  }
  async generate({
    code,
    ...rest
  }) {
    console.log("Proses: Memulai generasi obfuscate dengan php-minify...");
    const phpCode = code || "<?php echo 'kode default'; ?>";
    try {
      const csrfToken = await this._getToken();
      const obfuscateParams = new URLSearchParams();
      obfuscateParams.append("csrfToken", csrfToken);
      obfuscateParams.append("sourceCode", phpCode);
      obfuscateParams.append("evalMode", "0");
      console.log("Proses: Mengirim kode untuk di-obfuscate...");
      const response = await this.client.post("/index.php", obfuscateParams, {
        headers: {
          accept: "text/html, */*; q=0.01"
        }
      });
      if (typeof response.data === "string" && response.data.length > 0) {
        const finalResult = response.data.slice(1).trim();
        console.log("Proses: Obfuscate berhasil, output telah dibersihkan.");
        return {
          result: finalResult,
          length: finalResult.length
        };
      } else {
        throw new Error("Menerima respons yang tidak valid atau kosong dari server.");
      }
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Terjadi kesalahan selama proses php-minify:", errorMessage);
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
    const api = new PhpMinifyObfuscator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}