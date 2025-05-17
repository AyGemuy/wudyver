import axios from "axios";
class ChatService {
  constructor() {
    this.client = axios.create({
      baseURL: "https://arcane.getmerlin.in/v1/thread/unified",
      headers: {
        accept: "text/event-stream, text/event-stream",
        "accept-language": "id-ID,id;q=0.9",
        authorization: "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImMwYTQwNGExYTc4ZmUzNGM5YTVhZGU5NTBhMjE2YzkwYjVkNjMwYjMiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9mb3llci13b3JrIiwiYXVkIjoiZm95ZXItd29yayIsImF1dGhfdGltZSI6MTczNTcwNTA1MSwidXNlcl9pZCI6IlkxSXJxaWw3Y1dQcUlwM3RLZTY4SlY4ZDJHejIiLCJzdWIiOiJZMUlycWlsN2NXUHFJcDN0S2U2OEpWOGQyR3oyIiwiaWF0IjoxNzM1NzA1MDUxLCJleHAiOjE3MzU3MDg2NTEsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnt9LCJzaWduX2luX3Byb3ZpZGVyIjoiYW5vbnltb3VzIn19.AZthtQIBXglSSf_5bh9uCx3YSEr3xVsAzeiHwkBnRqYwm4Ig0rIscrOWgUVhKVyMPfAotCa-0LLMOwUHs3Pj2GkrCnAABBE0oTGm2S50gFQYTWW7BQYb7Wu_nPukBjuoyc7BdSx79QiOAeCLoj8rII84GNyRrLP8b_-r1oFb4j4ftS8U_-tcpGhdon4MqYgN3MJ59Lrf6A0Ss8qs389aRtnTzaw6vkY0dUXSW1aDlwF15JNtgXnP0zh60HbOIn404aBHR7gdUOzCBvEFn51Opi_PXL1m4L--lbnOcDClwbsMqUVLoAndgo9IzOJ2w6XuVBYNKH6HJx-jsttqZgQ9IA",
        "content-type": "application/json",
        origin: "https://www.getmerlin.in",
        priority: "u=1, i",
        referer: "https://www.getmerlin.in/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        "x-merlin-version": "web-merlin"
      }
    });
  }
  parseResponse(response) {
    try {
      const filteredData = response.split("\n").filter(line => line.startsWith("data:")).map(line => {
        const match = line.slice(5);
        return match ? JSON.parse(match[1])?.data.content : "";
      });
      return filteredData.join("");
    } catch (error) {
      console.error("Error parsing response:", error);
      return "";
    }
  }
  async sendChatRequest(data) {
    try {
      const response = await this.client.post("", data);
      return this.parseResponse(response.data);
    } catch (error) {
      console.error("Error sending chat request:", error);
      throw new Error("Failed to send chat request");
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    model = "gemini-1.5-flash"
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  const chatService = new ChatService();
  const requestData = {
    attachments: [],
    chatId: "307840fa-ef38-45d8-a6d7-de125ea97c11",
    language: "AUTO",
    message: {
      childId: "67ab245d-8b2a-409d-8b9e-12b799d02bbf",
      content: prompt,
      context: "",
      id: "a66b2d23-11c1-4da3-bc79-d69d6202f39f",
      parentId: "root"
    },
    metadata: {
      largeContext: false,
      proFinderMode: false
    },
    mode: "UNIFIED_CHAT",
    model: model
  };
  try {
    const result = await chatService.sendChatRequest(requestData);
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}