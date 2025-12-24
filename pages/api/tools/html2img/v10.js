import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  Blob,
  FormData
} from "formdata-node";
class HtmlUploader {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios);
    this.client.defaults.jar = this.jar;
    this.client.defaults.withCredentials = true;
    this.csrfToken = "";
    this.cookies = "";
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "user-agent": "Mozilla/5.0",
      "retry-after": "5"
    };
  }
  async getCsrfToken() {
    try {
      const response = await this.client.get("https://www.vertopal.com/en/upload/uploader");
      const cookies = response.headers["set-cookie"] || [];
      this.csrfToken = cookies.find(cookie => cookie.startsWith("csrftoken="))?.split("=")[1]?.split(";")[0] || "";
      this.cookies = cookies.map(cookie => cookie.split(";")[0]).join("; ");
      console.log("CSRF Token:", this.csrfToken);
    } catch (error) {
      console.error("Error getting CSRF token:", error);
    }
  }
  getHeaders(extra = {}) {
    return {
      ...this.baseHeaders,
      cookie: this.cookies,
      "x-csrftoken": this.csrfToken,
      ...extra
    };
  }
  async uploadHtml(htmlContent) {
    await this.getCsrfToken();
    const fileName = `${Date.now()}${Math.floor(Math.random() * 1e4)}.html`;
    const blob = new Blob([Buffer.from(htmlContent, "utf-8")], {
      type: "text/html"
    });
    const formData = new FormData();
    formData.append("src_format__dst_format", "html:|png:");
    formData.append("method", "browse");
    formData.append("browse", blob, fileName);
    try {
      const {
        data
      } = await this.client.post("https://www.vertopal.com/upload", formData, {
        headers: this.getHeaders({
          "content-type": "multipart/form-data",
          origin: "https://www.vertopal.com",
          referer: "https://www.vertopal.com/en/convert/html-to-png",
          ...formData.headers
        })
      });
      console.log("Upload Response:", data);
      return {
        ...data,
        fileName: fileName
      };
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    }
  }
  async getPreview() {
    try {
      const {
        data
      } = await this.client.get("https://www.vertopal.com/en/preview", {
        headers: this.getHeaders({
          referer: "https://www.vertopal.com/en/convert/html-to-png",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": "Android",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        })
      });
      const parts = data.split("/preview/file/");
      if (parts.length > 1) {
        const fileName = parts[1].split('"')[0];
        return {
          url: `https://www.vertopal.com/preview/file/${fileName}`
        };
      }
      return null;
    } catch (error) {
      console.error("Preview request failed:", error);
      return null;
    }
  }
  async convertHTMLToImage({
    html
  }) {
    try {
      const result = await this.uploadHtml(html);
      const preview = await this.getPreview();
      return {
        ...result,
        ...preview
      };
    } catch (error) {
      console.error("Error uploading HTML:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new HtmlUploader();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}