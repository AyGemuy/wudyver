import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class BrainlyScraper {
  constructor() {
    this.htmlProxyUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v12`;
    this.brainlyBaseApiUrl = "https://brainly.com/bff/answer-experience-web/api/v1/search";
    this.axiosInstance = axios.create({});
  }
  async search({
    query,
    limit = 5,
    market = "id",
    ...customParams
  }) {
    try {
      let brainlyApiUrl = `${this.brainlyBaseApiUrl}?query=${encodeURIComponent(query)}&limit=${limit}&market=${market}`;
      for (const key in customParams) {
        if (Object.prototype.hasOwnProperty.call(customParams, key)) {
          brainlyApiUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(customParams[key])}`;
        }
      }
      const proxyRequestUrl = `${this.htmlProxyUrl}?url=${encodeURIComponent(brainlyApiUrl)}`;
      const response = await this.axiosInstance.get(proxyRequestUrl);
      if (!response.data) return [];
      let parsedResult;
      if (typeof response.data === "object") {
        parsedResult = response.data;
      } else {
        try {
          parsedResult = JSON.parse(response.data);
        } catch (jsonError) {
          console.error("Error parsing JSON from Brainly API response:", jsonError.message);
          return [];
        }
      }
      return parsedResult || [];
    } catch (error) {
      console.error("Error during Brainly search:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const brainlyScraper = new BrainlyScraper();
    const response = await brainlyScraper.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}