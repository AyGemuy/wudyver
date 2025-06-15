import axios from "axios";
class GoOnlineToolsClient {
  constructor() {
    this.baseURL = "https://cors.goonlinetools.com";
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
        Referer: "https://goonlinetools.com/source-code-viewer/"
      },
      decompress: true
    });
    console.log("GoOnlineToolsClient: Axios instance created for CORS proxy.");
  }
  async getProxiedContent({
    url: targetUrl
  }) {
    const encodedTargetUrl = encodeURIComponent(targetUrl);
    const fullPath = `/?${encodedTargetUrl}`;
    console.log(`GoOnlineToolsClient: Attempting to fetch content for ${targetUrl} via proxy.`);
    try {
      const response = await this.axiosInstance.get(fullPath);
      console.log(`GoOnlineToolsClient: Successfully fetched content for ${targetUrl}. Status: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error(`GoOnlineToolsClient: Error fetching content for ${targetUrl}:`, error.response ? error.response.data : error.message);
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
    const goOnlineClient = new GoOnlineToolsClient();
    const result = await goOnlineClient.getProxiedContent(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
}