import axios from "axios";
import qs from "qs";
class IntellipaatClient {
  constructor() {
    this.apiUrl = "https://intellipaat.com/blog/wp-admin/admin-ajax.php";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
      Referer: "https://intellipaat.com/blog/online-node-js-compiler/"
    };
  }
  async run({
    code,
    lang = "node"
  }) {
    try {
      const formData = qs.stringify({
        language: lang,
        code: code,
        cmd_line_args: "",
        action: "compilerajax"
      });
      const response = await axios.post(this.apiUrl, formData, {
        headers: this.headers,
        responseType: "text"
      });
      const rawData = response.data;
      const jsonPart = rawData.split("ressplit")[0];
      const parsedJson = JSON.parse(jsonPart);
      const output = parsedJson.message ? parsedJson.message.trim() : "";
      return {
        output: output
      };
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
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}