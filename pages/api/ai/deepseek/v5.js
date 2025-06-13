import axios from "axios";
class DeepSeekAssistant {
  constructor(baseUrl = "https://deepseek-assistant.com/api", defaultModel = "V3 model") {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }
  parseChatResponse(input) {
    const lines = input.trim().split("\n");
    let result = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data: {") && trimmedLine.endsWith("}")) {
        try {
          const parsedData = JSON.parse(trimmedLine.substring(trimmedLine.indexOf("{")));
          if (parsedData?.choices?.[0]?.delta?.content !== undefined) {
            result += parsedData.choices[0].delta.content;
          }
        } catch (error) {}
      }
    }
    return {
      result: result.trim()
    };
  }
  async sendMessage({
    prompt,
    messages,
    model
  }) {
    const currentMessages = Array.isArray(messages) ? [...messages] : [];
    if (prompt) {
      currentMessages.push({
        role: "user",
        content: prompt
      });
    }
    if (!currentMessages.length) {
      console.warn("Tidak ada prompt atau pesan untuk dikirim.");
      return null;
    }
    const selectedModel = model || this.defaultModel;
    try {
      const response = await axios.post(`${this.baseUrl}/search-stream-deep-chat-testing.php`, {
        model: selectedModel,
        messages: currentMessages
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          cookie: "click_id=OS3Hz0E1yKfu4YnZNwedESMEdKEgMTzL; organic_user_deepseek_assistant_ch=%7B%22pixel%22%3A%22OS3Hz0E1yKfu4YnZNwedESMEdKEgMTzL%22%2C%22cc%22%3A%22ID%22%2C%22channel%22%3A%22organic_flag%22%7D",
          origin: "https://deepseek-assistant.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://deepseek-assistant.com/chat/?v2=2",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Linux"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
      });
      return this.parseChatResponse(response.data);
    } catch (error) {
      console.error("Terjadi kesalahan saat mengirim pesan:", error);
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
    const deepSeek = new DeepSeekAssistant();
    const response = await deepSeek.sendMessage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}