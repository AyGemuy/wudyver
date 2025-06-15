import apiConfig from "@/configs/apiConfig";
import axios from "axios";
class HTMLToImageConverter {
  constructor() {
    this.pasteBaseURL = `https://${apiConfig.DOMAIN_URL}/api/tools/paste/v1`;
    this.screenshotAPI = "https://backup15.terasp.net/api/screenshot";
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
    width = 1280,
    height = 900,
    format = "png",
    waitTime = 1e3,
    isFullPage = false,
    dismissModals = false
  } = {}) {
    try {
      const uploadResult = await this.uploadHTML(html);
      if (uploadResult && uploadResult.key) {
        const targetUrl = `${this.pasteBaseURL}?action=get&key=${uploadResult.key}&output=html`;
        const screenshotUrl = `${this.screenshotAPI}?resX=${width}&resY=${height}&outFormat=${format}&waitTime=${waitTime}&isFullPage=${isFullPage}&dismissModals=${dismissModals}&url=${encodeURIComponent(targetUrl)}`;
        return {
          url: screenshotUrl
        };
      } else {
        console.warn("Failed to get key after HTML upload. Cannot generate image URL.");
        return {
          url: null
        };
      }
    } catch (error) {
      console.error("Error generating image URL:", error);
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