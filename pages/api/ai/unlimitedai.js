import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class UnlimitedAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4
    }));
    this.baseUrl = "https://app.unlimitedai.chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      origin: this.baseUrl,
      referer: this.baseUrl
    };
  }
  generateUUID() {
    return crypto.randomUUID();
  }
  getTimestamp() {
    return new Date().toISOString();
  }
  async chat({
    prompt,
    messages = [],
    model = "chat-model-reasoning",
    chatId,
    ...rest
  }) {
    console.log("[UnlimitedAI] Mempersiapkan payload...");
    const activeChatId = chatId || this.generateUUID();
    const nextActionId = "40713570958bf1accf30e8d3ddb17e7948e6c379fa";
    let payloadMessages;
    if (messages?.length) {
      payloadMessages = messages.map(msg => ({
        id: msg.id || this.generateUUID(),
        role: msg.role || "user",
        content: msg.content || "",
        parts: msg.parts || [{
          type: "text",
          text: msg.content || ""
        }],
        createdAt: msg.createdAt || this.getTimestamp()
      }));
    } else {
      const userContent = prompt || "Halo";
      payloadMessages = [{
        id: this.generateUUID(),
        role: "user",
        content: userContent,
        parts: [{
          type: "text",
          text: userContent
        }],
        createdAt: this.getTimestamp()
      }, {
        id: this.generateUUID(),
        role: "assistant",
        content: "",
        parts: [{
          type: "text",
          text: ""
        }],
        createdAt: this.getTimestamp()
      }];
    }
    try {
      console.log(`[UnlimitedAI] Mengirim ${payloadMessages.length} pesan ke ID: ${activeChatId}`);
      const payload = [{
        chatId: activeChatId,
        messages: payloadMessages,
        selectedChatModel: model,
        selectedCharacter: rest.selectedCharacter || null,
        selectedStory: rest.selectedStory || null
      }];
      const response = await this.client.post(`${this.baseUrl}/id/chat/${activeChatId}`, payload, {
        headers: {
          ...this.headers,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": nextActionId,
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22id%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
          referer: `${this.baseUrl}/chat/${activeChatId}`
        },
        responseType: "text"
      });
      console.log("[UnlimitedAI] Parsing respons stream...");
      const parsedData = this.parseStream(response.data);
      return {
        result: parsedData.text || "Tidak ada teks respons.",
        chatId: activeChatId,
        model: model,
        info: {
          status: response.status,
          messageCount: payloadMessages.length,
          rawDiffsLength: parsedData.diffs?.length || 0
        }
      };
    } catch (error) {
      console.error("[UnlimitedAI] Error:", error?.message);
      return {
        result: null,
        error: error?.response?.data || error?.message,
        chatId: activeChatId
      };
    }
  }
  parseStream(rawData) {
    const lines = rawData.split("\n");
    let fullText = "";
    const diffs = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^\w+:(.*)$/);
      if (match?.[1]) {
        try {
          const content = JSON.parse(match[1]);
          const textPart = content?.diff?.[1];
          if (typeof textPart === "string") {
            fullText += textPart;
            diffs.push(textPart);
          }
        } catch {}
      }
    }
    return {
      text: fullText,
      diffs: diffs
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new UnlimitedAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}