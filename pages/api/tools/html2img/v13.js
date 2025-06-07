import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HTMLToImageConverter {
  constructor() {
    this.pasteBaseURL = `https://${apiConfig.DOMAIN_URL}/api/tools/paste/v1`;
    this.urlboxRenderURL = "https://urlbox.com/api/render";
  }
  async uploadHTML(htmlString, title = "HTML2IMG") {
    try {
      const response = await axios.post(this.pasteBaseURL, {
        action: "create",
        title: title,
        content: htmlString
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading HTML:", error);
      throw error;
    }
  }
  encodeURL(url) {
    return encodeURIComponent(url);
  }
  async convertHTMLToImage({
    html,
    width = 1440,
    height = 1024,
    full_page = false,
    selector = "",
    dark_mode = false,
    hide_cookie_banners = true,
    format = "png"
  } = {}) {
    try {
      const uploadResult = await this.uploadHTML(html);
      if (uploadResult && uploadResult.key) {
        const rawContentURL = `${this.pasteBaseURL}?action=get&key=${uploadResult.key}&output=html`;
        const requestData = {
          url: rawContentURL,
          width: width,
          height: height,
          full_page: full_page,
          selector: selector,
          dark_mode: dark_mode,
          hide_cookie_banners: hide_cookie_banners,
          format: format
        };
        const headers = {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
          Referer: "https://urlbox.com/"
        };
        const response = await axios.post(this.urlboxRenderURL, requestData, {
          headers: headers
        });
        if (response.data && response.data.screenshotUrl) {
          return {
            url: response.data.screenshotUrl
          };
        } else {
          console.warn("Failed to get screenshot URL from Urlbox response:", response.data);
          return {
            url: null
          };
        }
      } else {
        console.warn("Failed to get key after HTML upload. Cannot generate image URL using Urlbox.");
        return {
          url: null
        };
      }
    } catch (error) {
      console.error("Error generating image URL using Urlbox:", error);
      return {
        url: null
      };
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
    const converter = new HTMLToImageConverter();
    const result = await converter.convertHTMLToImage(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}