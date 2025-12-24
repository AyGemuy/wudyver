import axios from "axios";
class Gemini {
  constructor() {
    this.instance = axios.create({
      baseURL: "https://gemini.google.com/_/BardChatUi",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
      }
    });
    this.instance.interceptors.request.use(config => {
      console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      console.error("[Request Error]", error);
      return Promise.reject(error);
    });
    this.instance.interceptors.response.use(response => {
      console.log("[Response]", response.status);
      return response;
    }, error => {
      console.error("[Response Error]", error.message);
      return Promise.reject(error);
    });
  }
  async getNewCookie() {
    try {
      const params = new URLSearchParams({
        rpcids: "maGuAc",
        "source-path": "/",
        bl: "boq_assistant-bard-web-server_20250814.06_p1",
        "f.sid": "-7816331052118000090",
        hl: "en-US",
        _reqid: Math.floor(1e5 + Math.random() * 9e5),
        rt: "c"
      });
      const response = await this.instance.post(`/data/batchexecute?${params}`, "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&");
      return response?.headers?.["set-cookie"]?.[0]?.split("; ")?.[0];
    } catch (error) {
      console.error("Cookie Error:", error.message);
      throw error;
    }
  }
  async chat({
    prompt,
    chatId: previousId = null
  }) {
    try {
      if (!prompt?.trim()) throw new Error("Prompt is required");
      const {
        newResumeArray: resumeArray,
        cookie
      } = previousId ? JSON.parse(atob(previousId)) : {};
      const headers = {
        "x-goog-ext-525001261-jspb": '[1,null,null,null,"9ec249fc9ad08861",null,null,null,[4]]',
        cookie: cookie || await this.getNewCookie()
      };
      const body = new URLSearchParams({
        "f.req": JSON.stringify([null, JSON.stringify([
          [prompt],
          ["en-US"], resumeArray
        ])])
      });
      const params = new URLSearchParams({
        rpcids: "maGuAc",
        bl: "boq_assistant-bard-web-server_20250729.06_p0",
        "f.sid": "4206607810970164620",
        hl: "en-US",
        _reqid: Math.floor(1e6 + Math.random() * 9e6),
        rt: "c"
      });
      const response = await this.instance.post(`/data/assistant.lamda.BardFrontendService/StreamGenerate?${params}`, body, {
        headers: headers
      });
      const parsedData = this.parseResponse(response.data);
      const text = parsedData?.[4]?.[0]?.[1]?.[0]?.replace(/\*\*(.+?)\*\*/g, "*$1*");
      const newResumeArray = [...parsedData?.[1] || [], parsedData?.[4]?.[0]?.[0]];
      return {
        result: text || "No response text found",
        chatId: btoa(JSON.stringify({
          newResumeArray: newResumeArray,
          cookie: headers.cookie
        }))
      };
    } catch (error) {
      console.error("Ask Error:", error.message);
      throw error;
    }
  }
  parseResponse(data) {
    try {
      const match = [...data.matchAll(/^\d+\n(.+?)\n/gm)]?.reverse()?.[3]?.[1];
      return match ? JSON.parse(JSON.parse(match)?.[0]?.[2]) : null;
    } catch (error) {
      console.error("Parse Error:", error.message);
      return null;
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
    const gemini = new Gemini();
    const response = await gemini.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}