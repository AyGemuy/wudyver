import axios from "axios";
class GramSaver {
  constructor() {
    this.baseUrl = "https://gramsaver.com/api/";
    this.headers = {
      authority: "gramsaver.com",
      accept: "*/*",
      referer: "https://gramsaver.com/",
      "user-agent": "apitester.org Android/7.5(641)"
    };
  }
  extractId(url) {
    const regex = /(?:reel|p)\/(?<id>[A-Za-z0-9_-]+)\/?$/;
    const match = url.match(regex);
    return match?.groups?.id ?? null;
  }
  async fetchData(id) {
    try {
      const response = await axios.get(`${this.baseUrl}${id}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Request failed with status: ${error.response.status}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }
  async downloadMedia(url, maxRetries = 3, delay = 1e3) {
    const id = this.extractId(url);
    if (!id) {
      throw new Error("Invalid Instagram URL");
    }
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.fetchData(id);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      message: "No url provided"
    });
  }
  const gramSaver = new GramSaver();
  try {
    const result = await gramSaver.downloadMedia(url);
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({
      message: "Error during media download",
      error: error.message
    });
  }
}