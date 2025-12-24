import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: "https://www.genbaz.io/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.genbaz.io",
        priority: "u=1, i",
        referer: "https://www.genbaz.io/canvas?generator=ai-image-generator",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    console.log("ApiService diinisialisasi");
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log("\nMemulai proses generate...");
    try {
      const subject = prompt || "a beautiful landscape";
      const style = rest.style ? rest.style : "Realistic";
      const details = rest.options?.details || "high quality";
      const payload = {
        style: style,
        subject: subject,
        details: details
      };
      console.log("Mengirim data:", payload);
      const response = await this.api.post("/generate/ai-image-generator", payload);
      console.log("Proses berhasil, respons diterima.");
      return response?.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error("Terjadi kesalahan:", errorMessage);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new ApiService();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}