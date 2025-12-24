import axios from "axios";
import {
  EventSource
} from "eventsource";
class ScNetChat {
  constructor(modelIndex = 1) {
    this.baseURL = "https://chat.scnet.cn/api/chat";
    this.token = "38a0f9ed67be53f1dc011bc1d4762d23";
    this.models = ["DefaultModelId7B2", "DefaultModelId32B2"];
    this.modelType = this.models[modelIndex - 1] || this.models[0];
  }
  async sendMessage(query) {
    try {
      const response = await axios.post(`${this.baseURL}/Ask`, {
        modelType: this.modelType,
        query: query,
        conversationId: ""
      }, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "x-token-dasclient": this.token
        }
      });
      return response.data.code === "success" ? response.data.data.messageId : null;
    } catch (error) {
      console.error("Error sending message:", error.message);
      return null;
    }
  }
  async getMessage(messageId) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}/GetReplay?messageId=${messageId}&query=&modelType=${this.modelType}`;
      const eventSource = new EventSource(url, {
        headers: {
          "x-token-dasclient": this.token
        }
      });
      let message = "";
      let startParsing = false;
      eventSource.onmessage = event => {
        if (event.data.includes("event: replyMessageId")) {
          startParsing = true;
          return;
        }
        if (event.data.includes("event: end")) {
          eventSource.close();
          resolve(message.trim());
        }
        if (startParsing && event.data.trim() && !event.data.includes("<think>") && !event.data.includes("</think>")) {
          message += event.data + " ";
        }
      };
      eventSource.onerror = error => {
        eventSource.close();
        reject("Gagal mengambil pesan.");
      };
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    query,
    model: modelIndex = 1
  } = params;
  if (!query) return res.status(400).json({
    error: 'Paramenter "query" wajib disertakan.'
  });
  const chat = new ScNetChat(Number(modelIndex));
  const messageId = await chat.sendMessage(query);
  if (!messageId) return res.status(500).json({
    error: "Gagal mengirim pesan."
  });
  try {
    const responseMessage = await chat.getMessage(messageId);
    return res.status(200).json({
      response: responseMessage
    });
  } catch (error) {
    return res.status(500).json({
      error: error
    });
  }
}