import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import FormData from "form-data";
class SimpleTools {
  constructor() {
    this.baseURL = "https://tools.simpletools.nl";
    this.apiURL = "/index.php";
    this.agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false,
      ciphers: "ALL"
    });
    this.client = axios.create({
      baseURL: this.baseURL,
      httpsAgent: this.agent,
      timeout: 6e4,
      headers: {
        Connection: "keep-alive"
      }
    });
  }
  async generate({
    url,
    output = "buffer"
  } = {}) {
    const targetUrl = url || "https://x.com";
    console.log("[SimpleTools] Attempting SSL Handshake & Generation:", targetUrl);
    try {
      const landing = await this.client.get("/url-to-png.html");
      const rawCookies = landing.headers["set-cookie"] || [];
      const cookieHeader = rawCookies.map(c => c.split(";")[0]).join("; ");
      const form = new FormData();
      form.append("module", "tools");
      form.append("task", "tool-detail");
      form.append("tool_file", "url-to-png");
      form.append("do", "list_save");
      form.append("url", targetUrl);
      const response = await this.client.post(this.apiURL, form, {
        headers: {
          ...form.getHeaders(),
          Cookie: cookieHeader,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `${this.baseURL}/url-to-png.html`
        }
      });
      const json = response?.data || {};
      const htmlContent = json.returnactions_target_element_value || "";
      if (!htmlContent) throw new Error(json.msg || "Server returned empty response");
      const $ = cheerio.load(htmlContent);
      const rawPath = $('a[href$=".png"]').attr("href") || "";
      const downloadUrl = rawPath.startsWith("http") && rawPath || rawPath && `${this.baseURL}${rawPath}` || null;
      if (!downloadUrl) throw new Error("PNG Link not found");
      const imageRes = await this.client.get(downloadUrl, {
        responseType: "arraybuffer",
        headers: {
          Cookie: cookieHeader
        }
      });
      const buffer = Buffer.from(imageRes?.data || "");
      const mime = imageRes?.headers["content-type"] || "image/png";
      const finalData = output === "base64" && buffer.toString("base64") || output === "url" && downloadUrl || buffer;
      return {
        success: true,
        data: finalData,
        mime: mime
      };
    } catch (error) {
      const errorMsg = error.code === "ECONNRESET" ? "TLS Handshake Failed/Connection Reset" : error.message;
      console.error("[SimpleTools Error]", errorMsg);
      return {
        success: false,
        error: errorMsg,
        data: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SimpleTools();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}