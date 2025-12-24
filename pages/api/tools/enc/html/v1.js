import axios from "axios";
import * as cheerio from "cheerio";
class HtmlEncryptor {
  constructor() {
    this.baseUrl = "https://www.smartgb.com";
    this.formUrl = `${this.baseUrl}/free_encrypthtml.php`;
    this.encryptUrl = `${this.formUrl}?do=crypt`;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      Referer: this.formUrl,
      Origin: this.baseUrl,
      "Content-Type": "application/x-www-form-urlencoded"
    };
  }
  async getInitData() {
    try {
      const res = await axios.get(this.formUrl, {
        headers: this.headers
      });
      const $ = cheerio.load(res.data);
      const defaultLevel = $('input[name="s"]:checked').val() || "extended";
      const ch = $('input[name="ch"]').val();
      return {
        defaultLevel: defaultLevel,
        ch: ch
      };
    } catch (err) {
      console.error("InitData Error:", err.message);
      throw err;
    }
  }
  async encrypt({
    html,
    level
  }) {
    try {
      const {
        defaultLevel,
        ch
      } = await this.getInitData();
      const security = level || defaultLevel;
      const formData = new URLSearchParams();
      formData.append("h", html);
      formData.append("s", security);
      formData.append("ch", ch);
      formData.append("Skicka", "Encrypt HTML");
      const res = await axios.post(this.encryptUrl, formData, {
        headers: this.headers
      });
      const $ = cheerio.load(res.data);
      const encryptedHtml = $('textarea[name="Textruta"]').text();
      return encryptedHtml || null;
    } catch (err) {
      console.error("Encrypt Error:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.html) {
    return res.status(400).json({
      error: "html are required"
    });
  }
  try {
    const encryptor = new HtmlEncryptor();
    const response = await encryptor.encrypt(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}