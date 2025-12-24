import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Correkt {
  constructor(userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36") {
    this.userAgent = userAgent;
    this.baseUrl = "https://correkt.ai/api/api";
  }
  async getCsrfToken() {
    try {
      const url = `https://${apiConfig.DOMAIN_URL}/api/tools/playwright`;
      const headers = {
        accept: "*/*",
        "content-type": "application/json",
        "user-agent": "Postify/1.0.0"
      };
      const data = {
        code: `
          const { chromium } = require('playwright');
          async function getcookie() {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto('https://correkt.ai/', { waitUntil: 'networkidle' });
            const cookies = await page.context().cookies();
            const csrftoken = cookies.find(cookie => cookie.name === 'csrftoken');
            await browser.close();
            console.log(csrftoken ? csrftoken.value : 'csrftoken not found');
          }
          getcookie();
        `,
        language: "javascript"
      };
      const response = await axios.post(url, data, {
        headers: headers
      });
      return response.data.output || null;
    } catch (error) {
      console.error("Error running playwright code:", error);
      throw error;
    }
  }
  async search(payload) {
    try {
      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) {
        throw new Error("CSRF Token is required but not found");
      }
      const url = `${this.baseUrl}/unauthenticated-search`;
      const data = {
        content: payload?.content || "wibu",
        media: payload?.media || null,
        chat_id: payload?.chat_id || "",
        model: payload?.model || "correkt",
        tz_offset: payload?.tz_offset || -28800,
        location: payload?.location || null,
        latest_messages: payload?.latest_messages || [],
        model_options: {
          maxTokens: payload?.maxTokens || 8192,
          systemPrompt: payload?.systemPrompt || "",
          temperature: payload?.temperature || .7,
          topK: payload?.topK || 1e3,
          topP: payload?.topP || 1
        },
        search_options: {
          site: payload?.site || [],
          negative_site: payload?.negative_site || [],
          region: payload?.region || "",
          language: payload?.language || "",
          verbatim: payload?.verbatim || "",
          from: payload?.from || "",
          to: payload?.to || "",
          inurl: payload?.inurl || "",
          intitle: payload?.intitle || "",
          safe: payload?.safe || "active",
          location: payload?.location || false,
          searchPrompt: payload?.searchPrompt || "",
          num: payload?.num || 7
        }
      };
      const headers = this._getHeaders(csrfToken);
      const response = await axios.post(url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error in unauthenticated search:", error);
      throw error;
    }
  }
  async serp(payload) {
    try {
      const csrfToken = await this.getCsrfToken();
      if (!csrfToken) {
        throw new Error("CSRF Token is required but not found");
      }
      const url = `${this.baseUrl}/serp`;
      const data = {
        query: payload?.query || "wibu",
        reply_id: payload?.reply_id || "",
        location: payload?.location || null,
        search_options: {
          site: payload?.site || [],
          negative_site: payload?.negative_site || [],
          region: payload?.region || "",
          language: payload?.language || "",
          verbatim: payload?.verbatim || "",
          from: payload?.from || "",
          to: payload?.to || "",
          inurl: payload?.inurl || "",
          intitle: payload?.intitle || "",
          safe: payload?.safe || "active",
          location: payload?.location || false,
          searchPrompt: payload?.searchPrompt || "",
          num: payload?.num || 7
        }
      };
      const headers = this._getHeaders(csrfToken);
      const response = await axios.post(url, data, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error("Error in serp search:", error);
      throw error;
    }
  }
  _getHeaders(csrfToken) {
    return {
      accept: "application/json",
      "content-type": "application/json",
      "X-CSRFToken": csrfToken,
      "User-Agent": this.userAgent,
      referer: "https://correkt.ai/",
      cookie: `csrftoken=${csrfToken};`
    };
  }
}
export default async function handler(req, res) {
  const korrekt = new Correkt();
  const requestData = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...payload
  } = requestData;
  try {
    let result;
    switch (action) {
      case "search":
        result = await korrekt.search(payload);
        break;
      case "serp":
        result = await korrekt.serp(payload);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({
      error: error.message
    });
  }
}