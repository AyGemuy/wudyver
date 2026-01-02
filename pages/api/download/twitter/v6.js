import axios from "axios";
class Tweeload {
  constructor() {
    this.url = "https://tweeload.aculix.net/status/";
    this.key = "cKMQlY4jGCflOStlN3UfnWCxLQSb5GL7UPjPJ3jGS5fkno1Jaf";
    this.ua = "okhttp/4.9.0";
  }
  async download({
    url
  }) {
    console.log(`[⏳] Fetching: ${url}`);
    try {
      const {
        data
      } = await axios.get(this.url, {
        params: {
          url: url
        },
        headers: {
          Authorization: this.key,
          "User-Agent": this.ua
        }
      });
      return data;
    } catch (e) {
      console.error(`[❌] Err: ${e?.response?.statusText || e?.message || "Unknown"}`);
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
  const api = new Tweeload();
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