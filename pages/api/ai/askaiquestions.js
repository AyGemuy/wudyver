import axios from "axios";
class ApiService {
  constructor(config = {}) {
    this.baseURL = config?.baseURL || "https://pjfuothbq9.execute-api.us-east-1.amazonaws.com";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://askaiquestions.net",
      priority: "u=1, i",
      referer: "https://askaiquestions.net/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    console.log(`[LOG] ApiService initialized for baseURL: ${this.baseURL}`);
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    console.log("[LOG] Initiating chat request...");
    const endpoint = rest?.endpoint || "get-summary";
    const url = `${this.baseURL}/${endpoint}`;
    const payload = {
      website: "ask-ai-questions",
      ...rest,
      messages: messages?.length ? messages : [{
        role: "system",
        content: "You are an expert assistant that helps users understand, summarize, and extract information.\n- Always answer in the same language as the user's question.\n- If the user asks for a summary, provide a concise, clear summary using Markdown (headings, bullet points, bold, italics as needed).\n- If the user asks a specific question, answer it based on the information provided, citing sources or quoting as appropriate.\n- If the user asks for an explanation, provide a clear, accessible explanation.\n- If the user asks for a list, extract and present the relevant information in a structured way.\n- If you do not have enough information to answer, politely say so."
      }, {
        role: "user",
        content: prompt || "Soo"
      }]
    };
    const headers = {
      ...this.defaultHeaders,
      ...rest?.headers
    };
    try {
      console.log(`[LOG] Sending POST request to: ${url}`);
      console.log("[LOG] Request Payload:", JSON.stringify(payload, null, 2));
      const response = await axios.post(url, payload, {
        headers: headers
      });
      console.log("[LOG] Received successful response from server.");
      return response?.data;
    } catch (error) {
      console.error("[LOG] An error occurred during the API request.");
      if (error.response) {
        console.error(`[LOG] Server responded with status: ${error.response.status}`);
        console.error("[LOG] Response data:", error.response.data);
      } else if (error.request) {
        console.error("[LOG] No response received from server.");
      } else {
        console.error("[LOG] Error setting up the request:", error.message);
      }
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
    const api = new ApiService();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}