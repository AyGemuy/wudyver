import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class AICreate {
  constructor() {
    this.baseUrl = "https://aicreate.com/wp-admin/admin-ajax.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://aicreate.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://aicreate.com/logo-maker/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async generateLogo({
    name,
    description,
    style,
    color,
    slogan,
    output = "html",
    apiVersion = "v5"
  }) {
    const formData = new URLSearchParams();
    formData.append("business-name", name);
    formData.append("description", description);
    formData.append("style", style);
    formData.append("color[]", color);
    formData.append("slogan", slogan);
    formData.append("content_type", "logo");
    formData.append("action", "generate_html");
    console.log("[INFO] Mengirim permintaan ke AICreate...");
    try {
      const response = await axios.post(this.baseUrl, formData.toString(), {
        headers: this.headers
      });
      console.log("[SUCCESS] Respons API AICreate:", response.data);
      if (response.data.success && response.data.data) {
        if (output === "url") {
          console.log("[INFO] Mengirim HTML ke API html2img untuk mendapatkan URL...");
          return await this.convertHtmlToImageUrl(response.data.data, apiVersion);
        } else if (output === "html") {
          console.log("[INFO] Kembaliakan HTML...");
          return {
            status: true,
            data: response.data.data
          };
        } else {
          return {
            status: false,
            error: "Output tidak valid."
          };
        }
      } else {
        return {
          status: false,
          error: "Logo gagal dibuat."
        };
      }
    } catch (error) {
      console.error("[ERROR] Gagal mengirim permintaan:", error.message);
      return {
        status: false,
        error: "Gagal memproses permintaan."
      };
    }
  }
  async convertHtmlToImageUrl(htmlContent, apiVersion) {
    const html2imgUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/html2img/${apiVersion}`;
    try {
      const response = await axios.post(html2imgUrl, {
        html: htmlContent
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("[SUCCESS] Respons API html2img:", response.data);
      if (response.data && response.data.url) {
        return {
          status: true,
          url: response.data.url
        };
      } else {
        return {
          status: false,
          error: "Gagal mengonversi HTML ke gambar."
        };
      }
    } catch (error) {
      console.error("[ERROR] Gagal mengkonversi HTML ke gambar:", error.message);
      return {
        status: false,
        error: "Gagal mengkonversi HTML ke gambar."
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const aiCreate = new AICreate();
  try {
    const data = await aiCreate.generateLogo(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}