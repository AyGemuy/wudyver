import axios from "axios";
class ImgKitsEnhancer {
  async download({
    url,
    upscale = 4
  }) {
    try {
      const apiUrl = `https://usa.imgkits.com/api/ai/chaofen?bucket=californian&img=${encodeURIComponent(url)}&upscale=${upscale}`;
      const {
        data
      } = await axios.get(apiUrl);
      return data;
    } catch (error) {
      throw new Error("Gagal meningkatkan gambar: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const enhancer = new ImgKitsEnhancer();
  try {
    const data = await enhancer.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}