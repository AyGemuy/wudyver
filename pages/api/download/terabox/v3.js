import axios from "axios";
class TeraboxDownloader {
  constructor() {
    this.apiKeys = ["c673a06fd0msh318123d49dcfa79p134a66jsn6a48c0800a01", "85e5ce0958mshc3dd2e4b8600408p1ef230jsncba0cc13c7f3", "452e0ac1f5mshfc0ab50beeb55e0p15b98djsn687513ed817b", "a9eadc36camsh3287f3b3a05615ep16535djsnef1f74fc7e39"];
    this.apiHost = "terabox-downloader-direct-download-link-generator.p.rapidapi.com";
    this.baseUrl = `https://${this.apiHost}/fetch`;
  }
  async download({
    url
  }) {
    for (const apiKey of this.apiKeys) {
      try {
        const response = await axios.post(this.baseUrl, {
          url: url
        }, {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": this.apiHost
          }
        });
        return response.data;
      } catch (error) {
        console.error(`Error dengan API Key ${apiKey}:`, error.message);
      }
    }
    throw new Error("Semua API key gagal digunakan");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TeraboxDownloader();
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