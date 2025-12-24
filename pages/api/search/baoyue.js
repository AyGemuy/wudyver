import axios from "axios";
class Baoyue {
  constructor() {
    this.url = "https://api.baoyueai.com/ai_search";
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log("[Log] Memulai pencarian...");
      const text = query || "人工智能";
      const p = rest?.page ? rest.page : 1;
      const ps = rest?.page_size ? rest.page_size : 6;
      const st = rest?.search_type ? rest.search_type : 2;
      console.log(`[Log] Mencari: "${text}" | Page: ${p}`);
      const res = await axios.get(this.url, {
        params: {
          query: text,
          page: p,
          page_size: ps,
          search_type: st,
          ...rest?.extra
        },
        headers: rest?.headers ? rest.headers : {
          accept: "application/json, text/plain, */*",
          "app-type": "6",
          origin: "https://h5.baoyueai.com",
          referer: "https://h5.baoyueai.com/",
          v: "1.0.0",
          token: "",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
        }
      });
      console.log("[Log] Respon berhasil diterima.");
      const result = res?.data?.data || {
        message: "No data"
      };
      return {
        result: result
      };
    } catch (err) {
      console.error("[Error] Gagal:", err?.message);
      return {
        result: null,
        error: err?.response?.data || err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new Baoyue();
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