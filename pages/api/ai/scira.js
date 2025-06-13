import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class SciraChat {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true
    }));
    this.config = {
      baseURL: "https://scira.app/api/chat",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://scira.app",
        priority: "u=1, i",
        referer: "https://scira.app/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  async getFileInfo(fileUrl) {
    try {
      const response = await axios.head(fileUrl);
      const contentDisposition = response.headers["content-disposition"];
      const nameMatch = contentDisposition ? contentDisposition.match(/filename="(.+?)"/) : null;
      return {
        name: nameMatch ? nameMatch[1] : fileUrl.split("/").pop(),
        contentType: response.headers["content-type"] || "application/octet-stream",
        size: parseInt(response.headers["content-length"]) || 0
      };
    } catch (error) {
      console.error("Gagal mendapatkan info file:", error.message);
      return null;
    }
  }
  async sendMessage({
    prompt: message,
    model = "scira-sonnet",
    fileUrl = null
  }) {
    try {
      let attachment = null;
      if (fileUrl) {
        const fileInfo = await this.getFileInfo(fileUrl);
        if (fileInfo) {
          attachment = [{
            name: fileInfo.name,
            contentType: fileInfo.contentType,
            url: fileUrl,
            size: fileInfo.size
          }];
        }
      }
      const payload = {
        id: Date.now().toString(36),
        messages: [{
          role: "user",
          content: message,
          parts: [{
            type: "text",
            text: message
          }],
          ...attachment ? {
            experimental_attachments: attachment
          } : {}
        }],
        model: model,
        group: "web"
      };
      const {
        data
      } = await this.client.post(this.config.baseURL, payload, {
        headers: this.config.headers
      });
      return data.split("\n").filter(v => v.startsWith('0:"')).map(v => JSON.parse(`"${v.slice(3, -1)}"`)).join("") || null;
    } catch (error) {
      return console.error("Error:", error.response?.data || error.message), null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) return res.status(400).json({
    error: "Prompt tidak boleh kosong"
  });
  try {
    const chatbot = new SciraChat();
    const response = await chatbot.sendMessage(params);
    return response ? res.json({
      result: response
    }) : res.status(500).json({
      error: "Gagal mengirim prompt"
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}