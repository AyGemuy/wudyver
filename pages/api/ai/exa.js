import axios from "axios";
class ExaAIClient {
  constructor() {
    this.baseURL = "https://exa.ai/search/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://exa.ai",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    };
  }
  async makeRequest(endpoint, data) {
    try {
      const url = `${this.baseURL}/${endpoint}`;
      const response = await axios.post(url, data, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`[Request Error] ${endpoint}:`, {
        url: `${this.baseURL}/${endpoint}`,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }
  async chat({
    prompt,
    messages = [],
    explore = true,
    search = true,
    ...rest
  }) {
    try {
      console.log(`Starting chat request with prompt: "${prompt}"`);
      const chatMessages = messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      const result = {
        chat: await this.makeRequest("answer", {
          messages: chatMessages,
          ...rest
        })
      };
      if (explore) {
        try {
          result.explore = await this.makeRequest("explore", {
            query: prompt,
            ...rest
          });
        } catch (error) {
          console.error("Explore request failed:", error.message);
          result.exploreError = error.message;
        }
      }
      if (search) {
        try {
          result.searchFast = await this.makeRequest("search-fast", {
            numResults: 12,
            domainFilterType: "include",
            type: "auto",
            text: true,
            density: "compact",
            moderation: false,
            query: prompt,
            useAutoprompt: true,
            resolvedSearchType: "neural",
            fastMode: false,
            rerankerType: "default",
            ...rest
          });
        } catch (error) {
          console.error("Search request failed:", error.message);
          result.searchError = error.message;
        }
      }
      console.log("Chat request completed successfully");
      return result;
    } catch (error) {
      console.error("[Chat Error] Failed to process chat request:", error.message);
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
    const client = new ExaAIClient();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}