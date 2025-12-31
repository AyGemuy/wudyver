import axios from "axios";
import qs from "qs";

class IntellipaatClient {
  constructor() {
    this.apiUrl = "https://intellipaat.com/blog/wp-admin/admin-ajax.php";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      "Referer": "https://intellipaat.com/blog/online-node-js-compiler/"
    };
  }

    async run({ code, lang = "node" }) {
    try {
      const formData = qs.stringify({
        language: lang,
        code: code,
        cmd_line_args: "",
        action: "compilerajax"
      });

      // Melakukan request ke Intellipaat
      const response = await axios.post(this.apiUrl, formData, {
        headers: this.headers,
        // Menggunakan transformResponse jika response datang sebagai string gabungan
        responseType: 'text' 
      });

      const rawData = response.data;

      /* Logika Parsing:
         Jika data berupa: {"message":"999\n"}ressplit999
         Kita split berdasarkan 'ressplit' dan ambil bagian pertama (index 0)
      */
      const jsonPart = rawData.split("ressplit")[0]; 
      const parsedJson = JSON.parse(jsonPart);

      // Ambil isi message dan bersihkan newline (\n)
      const output = parsedJson.message ? parsedJson.message.trim() : "";

      return { output };
    } catch (error) {
      console.error("Execution failed:", error.message);
      throw error;
    }
  }

}

export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;

  if (!params.code) {
    return res.status(400).json({
      error: "Parameter 'code' diperlukan"
    });
  }

  const api = new IntellipaatClient();

  try {
    const result = await api.run({
      code: params.code,
      lang: params.lang || "node"
    });

    // Mengembalikan format { output: "hasil" }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}
