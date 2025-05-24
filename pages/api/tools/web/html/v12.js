import axios from "axios";
class WebContentExtractor {
  constructor() {
    this.apiUrl = "https://yourgpt.ai/api/extractWebpageText";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      Referer: "https://yourgpt.ai/tools/webpage-content-extractor"
    };
  }
  async extract({
    url,
    format = "text",
    textOnly = false,
    ignoreLinks = false,
    includeElements = "",
    excludeElements = ""
  }) {
    if (!url) {
      throw new Error("URL parameter is required for extraction.");
    }
    const payload = {
      url: url,
      options: {
        format: format,
        textOnly: textOnly,
        ignoreLinks: ignoreLinks,
        includeElements: includeElements,
        excludeElements: excludeElements
      }
    };
    try {
      const response = await axios.post(this.apiUrl, payload, {
        headers: this.defaultHeaders
      });
      return response.data?.content;
    } catch (error) {
      console.error(`Error extracting content from ${url}:`, error.message);
      if (error.response) {
        console.error("API Response Error Status:", error.response.status);
        console.error("API Response Error Data:", error.response.data);
      }
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
    const extractor = new WebContentExtractor();
    const result = await extractor.extract(params);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
}