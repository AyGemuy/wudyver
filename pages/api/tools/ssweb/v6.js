import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
class AllFileTools {
  constructor() {
    this.baseURL = "https://www.allfiletools.com";
    this.uploadURL = "/tools/website-screenshot-generator/upload/";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4
    }));
  }
  async generate({
    url,
    type = "full",
    output = "buffer"
  } = {}) {
    const targetUrl = url || "https://google.com";
    console.log("[AllFileTools] Screenshoting:", targetUrl);
    try {
      await this.client.get("/website-screenshot-generator/");
      const cookies = await this.jar.getCookies(this.baseURL);
      const csrfToken = cookies.find(c => c.key === "csrftoken")?.value || "";
      const form = new FormData();
      form.append("url", targetUrl);
      form.append("screenshot_type", type || "full");
      const response = await this.client.post(this.uploadURL, form, {
        headers: {
          ...form.getHeaders(),
          Referer: `${this.baseURL}/website-screenshot-generator/`,
          "X-CSRFToken": csrfToken
        }
      });
      const data = response?.data || {};
      const base64Raw = data.screenshot || "";
      const base64Data = base64Raw.includes(",") && base64Raw.split(",")[1] || base64Raw;
      if (!data.success || !base64Data) {
        throw new Error(data.message || "Failed to generate screenshot");
      }
      const buffer = Buffer.from(base64Data, "base64");
      const mime = base64Raw.match(/data:(.*?);/) && base64Raw.match(/data:(.*?);/)[1] || "image/png";
      const result = output === "base64" && base64Data || output === "url" && base64Raw || buffer;
      return {
        success: true,
        data: result,
        mime: mime
      };
    } catch (error) {
      console.error("[AllFileTools Error]", error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Unknown error",
        code: error.response?.status
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
  const api = new AllFileTools();
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