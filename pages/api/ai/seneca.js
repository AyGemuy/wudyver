import axios from "axios";
class Seneca {
  constructor() {
    this.url = "https://seneca.dylancastillo.co/ask";
  }
  async chat({
    prompt,
    ...rest
  }) {
    try {
      console.log("[Log] Memulai proses chat...");
      const text = prompt || "say hy";
      const payload = {
        question: text,
        ...rest?.params ? rest.params : rest
      };
      console.log("[Log] Mengirim payload:", payload);
      const response = await axios.post(this.url, new URLSearchParams(payload).toString(), {
        headers: rest?.headers ? rest.headers : {
          "content-type": "application/x-www-form-urlencoded",
          accept: "*/*",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K)"
        }
      });
      console.log("[Log] Respon diterima dari server.");
      const result = response?.data || "Empty response";
      return {
        result: result
      };
    } catch (err) {
      console.error("[Error] Gagal eksekusi:", err?.message);
      return {
        result: null,
        error: err?.response?.data || err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Seneca();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}