import axios from "axios";
class JawaApi {
  constructor() {
    console.log("--- Proses: Instansiasi JawaApi. Siap memanggil API.");
  }
  async translate({
    text,
    from = "indo",
    to = "jawa"
  } = {}) {
    console.log(`\n--- Proses: Memulai terjemahan dari ${from} ke ${to}...`);
    try {
      if (!text) throw new Error("Text is required.");
      const languageMap = {
        indo: "id",
        jawa: "jw",
        "krama-lugu": "kl",
        "krama-alus": "ka",
        ngoko: "ng"
      };
      const fromCode = languageMap[from];
      const toCode = languageMap[to];
      if (!fromCode || !toCode) {
        const invalidLang = !fromCode ? `'from' (${from})` : `'to' (${to})`;
        throw new Error(`Invalid language code: ${invalidLang}.`);
      }
      if (fromCode === "id" && toCode === "id") throw new Error("Tidak bisa terjemah dari indo ke indo.");
      if (fromCode === "jw" && toCode !== "id") throw new Error("Terjemahan dari jawa HANYA bisa ke indo.");
      const url = "https://api.translatejawa.id/translate";
      const {
        data
      } = await axios.post(url, {
        text: text?.trim(),
        from: fromCode,
        to: toCode
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "application/json",
          origin: "https://aksarajawa.id",
          referer: "https://aksarajawa.id/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const result = data?.result || "Terjemahan gagal didapatkan atau kosong.";
      const statusLog = result.length > 0 ? "Sukses" : "Gagal (Hasil Kosong)";
      console.log(`--- Proses: Terjemahan ${statusLog}.`);
      return data;
    } catch (error) {
      console.error("--- Proses: Gagal dalam terjemahan.");
      throw new Error(error.response?.data?.message || error.message || "Terjadi kesalahan tidak terduga.");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new JawaApi();
  try {
    const data = await api.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}