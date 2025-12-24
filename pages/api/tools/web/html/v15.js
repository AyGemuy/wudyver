import axios from "axios";
import * as cheerio from "cheerio";
class NinjasClient {
  constructor() {
    this.baseURL = "https://www.internetmarketingninjas.com/tools/html-source-viewer/";
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        Referer: "https://www.internetmarketingninjas.com/tools/html-source-viewer/"
      },
      decompress: true
    });
    console.log("NinjasClient: Axios instance created for HTML Source Viewer proxy.");
  }
  async getHtmlSource({
    url: targetUrl
  }) {
    const params = {
      go: 1,
      url: targetUrl,
      toolsubmit: "Get Source"
    };
    console.log(`NinjasClient: Attempting to fetch HTML source for ${targetUrl} via proxy.`);
    try {
      const response = await this.axiosInstance.get("", {
        params: params
      });
      console.log(`NinjasClient: Successfully fetched HTML for ${targetUrl}. Status: ${response.status}`);
      const $ = cheerio.load(response.data);
      const extractedSourceCode = $('textarea[name="textarea"]').val();
      if (extractedSourceCode) {
        console.log(`NinjasClient: Successfully extracted source code for ${targetUrl}.`);
        return extractedSourceCode;
      } else {
        console.warn(`NinjasClient: Textarea with name="textarea" not found or empty for ${targetUrl}.`);
        return null;
      }
    } catch (error) {
      console.error(`NinjasClient: Error fetching or parsing HTML source for ${targetUrl}:`, error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).send("URL is required");
  }
  try {
    const imnClient = new NinjasClient();
    const result = await imnClient.getHtmlSource(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
}