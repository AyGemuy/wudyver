import fetch from "node-fetch";
class DippyChat {
  constructor(baseUrl = "https://chatapi.dippy.ai/chat/v2/chat", headers = {}) {
    this.baseUrl = baseUrl;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.dippy.ai/chats/-43840",
      ...headers
    };
  }
  async sendMessage(params = {}) {
    const defaultParams = {
      character_id: 43840,
      streaming: 1,
      system_message: "continue",
      uuid: "a3b40ac8-a27c-4d63-a0f4-ed9b1300f801",
      image_supported: true,
      from_home_screen: 0,
      user_message: "hh",
      llm_type: "basic",
      start_one: "*you stayed silent. Or should you say something..?* Uhm hi enzo.",
      start_two: "It was the day after your guys' wedding. It was around 11 pm. You were in the bedroom sitting on the bed looking at your phone. enzo came in and didn't even look at you, he just sat down with his back facing you."
    };
    const mergedParams = new URLSearchParams({
      ...defaultParams,
      ...params
    });
    try {
      const response = await fetch(`${this.baseUrl}?${mergedParams}`, {
        headers: this.headers
      });
      const text = await response.text();
      return this.parseData(text);
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }
  parseData(rawData) {
    const lines = rawData.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(6).trim());
    if (!lines.length) return null;
    try {
      return JSON.parse(lines.pop());
    } catch (error) {
      console.error("Parsing error:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    ...params
  } = req.query;
  if (!prompt) return res.status(400).json({
    error: 'Parameter "prompt" wajib diisi'
  });
  try {
    const chat = new DippyChat();
    const response = await chat.sendMessage({
      user_message: prompt,
      ...params
    });
    if (!response) return res.status(500).json({
      error: "Failed to parse response"
    });
    return res.status(200).json(response);
  } catch {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}