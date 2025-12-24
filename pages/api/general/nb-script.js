import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class NbScraper {
  constructor() {
    this.tokenApiUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    this.actionApiUrl = "https://www.nbscript.dpdns.org/api/action";
    this.siteKey = "0x4AAAAAABCAE83MHbXKdiIT";
    this.referer = "https://www.nbscript.dpdns.org/";
  }
  async request(config) {
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error("Error during request:", error.message);
      throw error;
    }
  }
  async getTurnstileToken(url = this.referer) {
    try {
      const response = await this.request({
        method: "GET",
        url: this.tokenApiUrl,
        params: {
          sitekey: this.siteKey,
          url: url
        }
      });
      return response.token;
    } catch (error) {
      console.error("Failed to get Turnstile token:", error.message);
      throw error;
    }
  }
  async submitRequest({
    name = "",
    email = "",
    website = "",
    description = ""
  } = {}) {
    try {
      const turnstileToken = await this.getTurnstileToken();
      const postData = {
        action: "submitRequest",
        turnstileToken: turnstileToken,
        name: name,
        email: email,
        website: website,
        description: description
      };
      const response = await this.request({
        method: "POST",
        url: this.actionApiUrl,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
          Referer: this.referer
        },
        data: postData
      });
      return response;
    } catch (error) {
      console.error("Failed to submit request:", error.message);
      throw error;
    }
  }
  async getFolders() {
    try {
      const headers = {
        accept: "*/*",
        "content-type": "application/json"
      };
      const response = await this.request({
        method: "POST",
        url: this.actionApiUrl,
        headers: headers,
        data: {
          action: "getFolders"
        }
      });
      return response;
    } catch (error) {
      console.error("Failed to get folders:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "submit | folder"
      }
    });
  }
  const nbScraper = new NbScraper();
  try {
    let result;
    switch (action) {
      case "submit":
        if (!params.name || !params.email || !params.website || !params.description) {
          return res.status(400).json({
            error: `Missing required fields for ${action}`,
            required: {
              name: "string",
              email: "string",
              website: "string",
              description: "string"
            },
            received: params
          });
        }
        result = await nbScraper.submitRequest(params);
        break;
      case "folder":
        result = await nbScraper.getFolders();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: submit | folder`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}