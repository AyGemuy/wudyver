import axios from "axios";
import ApiKey from "@/configs/api-key";
class Pixabay {
  constructor() {
    this.apikey = ApiKey.pixabay;
  }
  url(t) {
    return t === "video" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
  }
  async search({
    type = "image",
    query,
    ...rest
  }) {
    const start = Date.now();
    const endpoint = this.url(type);
    const q = query || "";
    let lastError = null;
    console.log(`[Pixabay] Searching: "${q}" (${type})...`);
    for (const key of this.apikey) {
      try {
        const maskKey = key.slice(0, 4) + "***";
        console.log(`[Pixabay] Trying key: ${maskKey}`);
        const res = await axios.get(endpoint, {
          params: {
            key: key,
            q: encodeURIComponent(q),
            ...rest
          }
        });
        console.log(`[Pixabay] Success with key ${maskKey} (${Date.now() - start}ms)`);
        return {
          status: true,
          ...res?.data
        };
      } catch (err) {
        console.warn(`[Pixabay] Key ${key.slice(0, 4)}*** failed: ${err?.message}`);
        lastError = err;
      }
    }
    console.error(`[Pixabay] All keys failed.`);
    return {
      status: false,
      msg: lastError?.response?.data || "All API keys failed or limit exceeded.",
      result: []
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new Pixabay();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}