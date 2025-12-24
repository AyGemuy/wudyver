import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class UncoverAPI {
  constructor() {
    this.baseURL = "https://uncovr.app";
    this.backendURL = "https://backend.uncovr.app";
    this.sessionToken = null;
    this.jwtToken = null;
    this.userId = null;
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ...SpoofHead()
    };
  }
  async init() {
    console.log("Starting initialization process...");
    try {
      console.log("Attempting anonymous sign-in...");
      const authResponse = await axios.post(`${this.baseURL}/api/auth/sign-in/anonymous`, {}, {
        headers: this.headers
      });
      this.sessionToken = authResponse.data.token;
      this.userId = authResponse.data.user.id;
      console.log("Anonymous sign-in successful:", {
        token: this.sessionToken,
        userId: this.userId,
        email: authResponse.data.user.email
      });
      console.log("Attempting to get JWT token...");
      const tokenResponse = await axios.get(`${this.baseURL}/api/auth/token`, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.sessionToken}`
        }
      });
      this.jwtToken = tokenResponse.data.token;
      console.log("JWT token obtained successfully:", this.jwtToken);
      return true;
    } catch (error) {
      console.error("Initialization failed:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      return false;
    }
  }
  async getSession() {
    console.log("Fetching session information...");
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/get-session`, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.sessionToken}`
        }
      });
      console.log("Session information retrieved successfully");
      return response.data;
    } catch (error) {
      console.error("Get session failed:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return null;
    }
  }
  async chat({
    prompt: message,
    ...options
  }) {
    console.log("Initializing API...");
    const initialized = await this.init();
    if (!initialized) {
      console.log("Failed to initialize API");
      return;
    }
    console.log("Getting session info...");
    const session = await this.getSession();
    console.log("Session:", session);
    if (!this.jwtToken && !this.sessionToken) {
      console.error("Attempted to send message without initialization");
      throw new Error("Not initialized. Call init() first.");
    }
    console.log("Preparing message payload...");
    const defaultOptions = {
      enabledMCPs: {},
      userSettings: {
        allowLocationalSignals: true,
        allowSearchDataCollection: false,
        customisation: {
          enabled: false,
          nickname: "",
          lifeRole: "",
          ai_traits_prompt: "",
          extra_instructions: ""
        },
        controlLevel: "normal",
        newChatDefaultModel: "last_used",
        newChatDefaultImageModel: "flux-schnell"
      },
      ai_config: {
        models: {
          chat: "gemini-2-flash",
          image_generation: "flux-schnell"
        },
        enabledCoreTools: [],
        temperature: .5,
        reasoningEffort: "default",
        globalMode: "chat",
        imageSize: "1:1"
      },
      mode: "normal",
      proposedNewAssistantId: this.generateId(),
      message: {
        id: this.generateId(),
        role: "user",
        parts: [{
          type: "text",
          text: message
        }]
      }
    };
    const payload = {
      ...defaultOptions,
      ...options
    };
    console.log("Message payload prepared:", payload);
    try {
      console.log("Sending message to backend...");
      const response = await axios.post(`${this.backendURL}/chat`, payload, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${this.jwtToken || this.sessionToken}`,
          Origin: this.baseURL,
          Referer: `${this.baseURL}/`
        },
        responseType: "stream"
      });
      console.log("Message sent, parsing stream response...");
      return await this.parseStreamResponse(response.data);
    } catch (error) {
      console.error("Send message failed:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }
  async parseStreamResponse(stream) {
    console.log("Starting to parse stream response...");
    return new Promise((resolve, reject) => {
      let fullResponse = "";
      let messageData = {
        stream: {},
        chunks: []
      };
      stream.on("data", chunk => {
        try {
          const chunkStr = chunk.toString();
          console.log("Received data chunk from stream");
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                console.log("Parsed stream data:", data);
                messageData.chunks.push(data);
                if (data.type) {
                  if (!messageData.stream[data.type]) {
                    messageData.stream[data.type] = [];
                  }
                  messageData.stream[data.type].push(data);
                }
                if (data.type === "text-delta" && data.id === "0") {
                  fullResponse += data.delta;
                }
                if (data.type === "finish") {
                  messageData.response = fullResponse;
                  console.log("Stream parsing completed successfully");
                  resolve(messageData);
                  return;
                }
              } catch (parseError) {
                console.error("Error parsing stream data line:", {
                  error: parseError.message,
                  line: line
                });
              }
            }
          }
        } catch (chunkError) {
          console.error("Error processing data chunk:", chunkError);
        }
      });
      stream.on("end", () => {
        console.log("Stream ended");
        if (!messageData.response) {
          messageData.response = fullResponse;
        }
        resolve(messageData);
      });
      stream.on("error", error => {
        console.error("Stream error occurred:", error);
        reject(error);
      });
    });
  }
  generateId() {
    try {
      console.log("Generating ID...");
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      console.log("ID generated:", result);
      return result;
    } catch (error) {
      console.error("Failed to generate ID:", error);
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
    const api = new UncoverAPI();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}