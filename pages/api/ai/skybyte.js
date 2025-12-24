import fetch from "node-fetch";
import fakeUserAgent from "fake-useragent";
import crypto from "crypto";
class ChatSkyByte {
  constructor() {
    this.baseUrl = "https://chat1.lnf2.skybyte.me/api/chat-process";
    this.headers = {
      "User-Agent": fakeUserAgent()
    };
  }
  generateRandomHeader() {
    return crypto.randomBytes(4).join(".");
  }
  async chat(prompt = "Pak", systemMessage = "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.", temperature = .8, top_p = 1) {
    const payload = {
      prompt: prompt,
      options: {},
      systemMessage: systemMessage || "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
      temperature: parseFloat(temperature),
      top_p: parseFloat(top_p)
    };
    const headers = {
      ...this.headers,
      "X-Forwarded-For": this.generateRandomHeader(),
      Referer: "https://chat1.lnf2.skybyte.me/#/chat/1002"
    };
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const responseText = await response.text();
      return responseText.trim().split("\n").map(msg => JSON.parse(msg)?.detail?.choices[0]?.delta?.content).join("");
    } catch (error) {
      throw new Error(`Failed to fetch from ChatSkyByte API: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt = "Pak",
      systemMessage,
      temperature = .8,
      top_p = 1
  } = req.method === "GET" ? req.query : req.body;
  const chatSkyByte = new ChatSkyByte();
  try {
    const response = await chatSkyByte.chat(prompt, systemMessage ? systemMessage : "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.", temperature, top_p);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}