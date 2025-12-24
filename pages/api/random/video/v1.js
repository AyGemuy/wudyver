import axios from "axios";
class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: "https://011.video"
    });
    console.log("ApiService diinisialisasi...");
  }
  async media_list() {
    console.log("Memulai pengambilan daftar media...");
    try {
      const response = await this.api.get("/Vi/US/file-list.txt", {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://011.video/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("Berhasil mendapatkan data...");
      const dataText = response?.data;
      const lines = dataText ? dataText.split("\n") : [];
      const result = lines.map(line => line.trim()).filter(line => line).map(line => `https://011.video/Vi/US/${line.replace(/\\/g, "/")}`);
      console.log("Berhasil memproses data.");
      return {
        result: result
      };
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil data:", error.message);
      return {
        result: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  try {
    const api = new ApiService();
    const response = await api.media_list();
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}