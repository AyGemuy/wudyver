import axios from "axios";
class PinDownloader {
  constructor() {
    this.base = "https://pinterest-downloader-download-pinterest-image-video-and-reels.p.rapidapi.com";
    this.key = "0b54688e52msh9f5155a08141c69p1073e8jsnc51fa988e886";
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[Process] Memulai fetch: ${url || "No URL"}`);
    try {
      const target = url || "";
      if (!target.includes("pin.it")) throw new Error("Invalid URL Pinterest");
      const cfg = {
        headers: {
          "content-type": "application/json",
          "x-rapidapi-host": this.base.split("//")[1],
          "x-rapidapi-key": this.key,
          ...rest?.headers
        },
        params: {
          url: target,
          ...rest?.params
        }
      };
      console.log("[Process] Mengirim request ke API...");
      const res = await axios.get(`${this.base}/pins/info`, cfg);
      const result = res?.data?.data ? res.data.data : {
        error: "Data empty"
      };
      console.log("[Success] Data berhasil didapatkan");
      return result;
    } catch (err) {
      console.error(`[Error] Terjadi kesalahan: ${err?.message || "Unknown Error"}`);
      throw err;
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
  const api = new PinDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}