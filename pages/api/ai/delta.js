import fetch from "node-fetch";
class DeltaAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://copycode-delta.vercel.app"
    };
  }
  async handleRequest(action, query) {
    try {
      switch (action) {
        case "chat":
          return await this.fetchApi("/api/openAimcq", {
            question: query.question || "Apa itu AI",
            model: query.model || "gpt-3.5-turbo"
          });
        case "code":
          return await this.fetchApi("/api/code", {
            question: query.question || "Apa itu AI",
            language: query.language || "JavaScript",
            inputFormat: query.inputFormat || "",
            outputFormat: query.outputFormat || "",
            example: query.example || "",
            codeSnippet: query.codeSnippet || "",
            constraints: query.constraints || "",
            model: query.model || "gpt-4o-mini"
          });
        case "imggen":
          return await this.fetchApi("/api/imggen", {
            prompt: query.prompt || "",
            size: query.size || "1024x1024",
            n: query.n ? parseInt(query.n, 10) : 1
          });
        case "llama":
          return await this.fetchApi("/api/llama", {
            question: query.question || ""
          });
        case "recheck":
          return await this.fetchApi("/api/recheck", {
            question: query.question || "Apa itu AI",
            language: query.language || "JavaScript",
            inputFormat: query.inputFormat || "",
            outputFormat: query.outputFormat || "",
            example: query.example || "",
            codeSnippet: query.codeSnippet || "",
            constraints: query.constraints || "",
            error: query.error || ""
          });
        case "runCode":
          return await this.fetchApi("/api/runCode", {
            question: query.question || "Apa itu AI",
            code: query.code || "",
            input: query.input || ""
          });
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
    } catch (error) {
      throw new Error(`Error handling request: ${error.message}`);
    }
  }
  async fetchApi(endpoint, payload) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Error fetching API: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action = "chat", ...query
  } = req.method === "GET" ? req.query : req.body;
  const deltaApi = new DeltaAPI("https://copycode-delta.vercel.app");
  try {
    const result = await deltaApi.handleRequest(action, query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}