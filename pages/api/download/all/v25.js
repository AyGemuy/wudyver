import axios from "axios";
import CryptoJS from "crypto-js";

function sign(url) {
  console.log("Proses: Mulai enkripsi URL...");
  const key = CryptoJS.enc.Utf8.parse("qwertyuioplkjhgf");
  const encrypted = CryptoJS.AES.encrypt(url, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  const signedUrl = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  console.log("Proses: Enkripsi URL selesai.");
  return signedUrl;
}
class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.videodropper.app"
    });
    console.log("Proses: Instance ApiService berhasil dibuat.");
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`Proses: Memulai permintaan untuk URL: ${url}`);
    try {
      const signedUrl = sign(url);
      const headers = {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://fastvideosave.net",
        priority: "u=1, i",
        referer: "https://fastvideosave.net/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        url: signedUrl,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const config = {
        headers: headers,
        timeout: rest?.timeout ? rest.timeout : 3e4,
        responseType: rest?.responseType || "json",
        ...rest
      };
      console.log("Proses: Mengirim permintaan ke API...");
      const response = await this.api.get("/allinone", config);
      console.log("Proses: Respons berhasil diterima dari API.");
      return response?.data;
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat melakukan permintaan.");
      const status = error?.response?.status || "N/A";
      console.error(`Detail Error: ${error?.message} (Status: ${status})`);
      return {
        error: true,
        message: error?.message || "Terjadi kesalahan yang tidak diketahui",
        status: status
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url are required"
    });
  }
  try {
    const downloader = new ApiService();
    const response = await downloader.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}