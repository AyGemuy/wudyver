import axios from "axios";
class ScribdAPI {
  constructor() {
    this.baseURL = "https://documents-api.dialguiba1994.workers.dev";
    this.headers = {
      authority: "documents-api.dialguiba1994.workers.dev",
      "user-agent": "Postify/1.0.0"
    };
  }
  isValid(url) {
    return /^https?:\/\/[^\s/]+scribd\.com\/(?:doc|document)\/\d{2,}/i.test(url);
  }
  async download({
    url,
    key = ""
  }) {
    if (!url?.trim()) return {
      status: false,
      code: 400,
      result: {
        error: "Invalid Scribd document link."
      }
    };
    if (!this.isValid(url)) return {
      status: false,
      code: 400,
      result: {
        error: "Invalid URL format. Example: 'https://www.scribd.com/document/123456/...'"
      }
    };
    try {
      const cookie = await this.getCookie(url, key);
      if (!cookie) return {
        status: false,
        code: 400,
        result: {
          error: "Failed to retrieve authentication cookie."
        }
      };
      const downloadResult = await this.processDownload(url, cookie);
      if (downloadResult.status) {
        const viewResult = await this.view(downloadResult.result.documentUrl);
        return {
          ...downloadResult,
          result: {
            ...downloadResult.result,
            viewData: viewResult.result
          }
        };
      }
      return downloadResult;
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Unable to access the document."
        }
      };
    }
  }
  async getCookie(url, key) {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate-document`, {
        url: url
      }, {
        headers: this.headers
      });
      const cookies = response.headers["set-cookie"] || [];
      return cookies.find(cookie => cookie.includes("TEMPORAL_KEY=")) || key;
    } catch {
      return null;
    }
  }
  async processDownload(url, cookie) {
    try {
      const response = await axios.post(`${this.baseURL}/api/generate-document`, {
        url: url
      }, {
        headers: {
          ...this.headers,
          cookie: cookie
        }
      });
      return response.data ? {
        status: true,
        code: 200,
        result: response.data
      } : {
        status: false,
        code: 400,
        result: {
          error: "No response from server."
        }
      };
    } catch {
      return {
        status: false,
        code: 500,
        result: {
          error: "Error processing the document."
        }
      };
    }
  }
  async view(doc) {
    if (!doc?.trim()) return {
      status: false,
      code: 400,
      result: {
        error: "Invalid document ID."
      }
    };
    try {
      const response = await axios.get(`${this.baseURL}/api/view-document/${doc}`, {
        headers: this.headers
      });
      return response.data ? {
        status: true,
        code: 200,
        result: response.data
      } : {
        status: false,
        code: 400,
        result: {
          error: "No response from server."
        }
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          error: "Unable to access the document."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const scribd = new ScribdAPI();
  try {
    const data = await scribd.download(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}