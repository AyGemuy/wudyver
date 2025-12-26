import axios from "axios";
class PinDownloader {
  constructor() {
    this.endpoint = "https://pinterest.bubiapps.com/api.php";
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("[Proses] Memulai permintaan download...");
      const targetUrl = url || rest?.link || "";
      const config = rest?.config ? rest.config : {};
      console.log(`[Proses] Mengirim parameter link: ${targetUrl}`);
      const params = new URLSearchParams();
      params.append("link", targetUrl);
      const res = await axios.post(this.endpoint, params, config);
      const result = res?.data || {
        status: "failed"
      };
      console.log("[Proses] Request berhasil diselesaikan.");
      return result;
    } catch (err) {
      console.error(`[Error] Terjadi kesalahan: ${err?.response?.data || err?.message || "Unknown Error"}`);
      return null;
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