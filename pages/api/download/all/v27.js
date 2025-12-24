import axios from "axios";
class OneDl {
  constructor() {}
  async download({
    url
  }) {
    console.log("Mulai download:", url);
    try {
      if (!url.includes("https://")) throw new Error("Invalid url.");
      const {
        data
      } = await axios.post("https://onedownloader.net/search", new URLSearchParams({
        query: encodeURIComponent(url)
      }).toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://onedownloader.net",
          referer: "https://onedownloader.net/",
          "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      return data.data;
    } catch (error) {
      console.error("Error:", error.message);
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' dibutuhkan."
    });
  }
  try {
    const api = new OneDl();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}