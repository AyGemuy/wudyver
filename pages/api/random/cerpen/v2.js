import axios from "axios";
class CerpenAPI {
  constructor() {
    this.url = "https://files.catbox.moe/qgk527.json";
  }
  async getData() {
    try {
      console.log("[Proses] Mengambil data dari server...");
      const res = await axios.get(this.url);
      return res?.data || [];
    } catch (err) {
      console.log("[Error] Gagal mengambil data:", err?.message || "Unknown Error");
      return [];
    }
  }
  rnd(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  async search({
    title,
    ...rest
  }) {
    try {
      console.log("[Proses] Mencari cerpen...");
      const data = await this.getData();
      if (data.length === 0) return {
        status: false,
        msg: "Data empty"
      };
      const searchTitle = title?.toLowerCase() || "";
      const filtered = searchTitle ? data.filter(item => item?.title?.toLowerCase().includes(searchTitle)) : [];
      const result = filtered.length > 0 ? filtered[0] : this.rnd(data);
      console.log(`[Proses] Berhasil menemukan: ${result?.title}`);
      return {
        status: true,
        result: result
      };
    } catch (err) {
      console.log("[Error] Terjadi kesalahan pada fungsi cerpen");
      return {
        status: false,
        error: err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new CerpenAPI();
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