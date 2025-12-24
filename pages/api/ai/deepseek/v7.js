import axios from "axios";
import ApiKey from "@/configs/api-key";
class DeepseekChat {
  constructor() {
    this.keyList = ApiKey.deepseek;
  }
  async chat({
    model = "deepseek-chat",
    prompt = "",
    messages = [],
    stream = false,
    ...rest
  }) {
    const requestId = Date.now();
    const startTime = Date.now();
    let finalMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      finalMessages = [...messages];
      if (prompt) {
        finalMessages.push({
          role: "user",
          content: prompt
        });
      }
    } else {
      finalMessages = [{
        role: "user",
        content: prompt || "hi"
      }];
    }
    console.log(`[${requestId}] Chat request started`, {
      model: model,
      messagesCount: finalMessages.length,
      stream: stream
    });
    const body = {
      model: model,
      messages: finalMessages,
      temperature: rest?.temp ?? .7,
      stream: stream,
      ...rest
    };
    let lastError = null;
    for (const rawKey of this.keyList) {
      try {
        const currentApiKey = rawKey;
        console.log(`[${requestId}] Attempting with key: ${rawKey.substring(0, 10)}...`);
        const response = await axios.post("https://api.deepseek.com/v1/chat/completions", body, {
          headers: {
            Authorization: currentApiKey,
            "Content-Type": "application/json"
          },
          responseType: stream ? "stream" : "json"
        });
        console.log(`[${requestId}] Response success with status ${response.status}`);
        let result = "";
        let finishReason = null;
        let usage = {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        };
        if (stream) {
          const streamData = response.data;
          let buffer = "";
          for await (const chunk of streamData) {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            for (const line of lines.slice(0, -1)) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.substring(6).trim();
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed?.choices?.[0]?.delta;
                  if (delta?.content) result += delta.content;
                  if (parsed?.choices?.[0]?.finish_reason) finishReason = parsed.choices[0].finish_reason;
                  if (parsed?.usage) usage = parsed.usage;
                } catch (e) {}
              }
            }
            buffer = lines[lines.length - 1] || "";
          }
          if (!finishReason) finishReason = "stop";
        } else {
          const data = response.data;
          result = data?.choices?.[0]?.message?.content || "";
          finishReason = data?.choices?.[0]?.finish_reason || null;
          if (data?.usage) usage = data.usage;
        }
        const duration = Date.now() - startTime;
        return {
          result: result,
          model: model,
          finish_reason: finishReason,
          usage: usage,
          duration_ms: duration,
          request_id: requestId,
          streamed: stream
        };
      } catch (error) {
        lastError = error;
        console.warn(`[${requestId}] Key failed. Status: ${error.response?.status}`);
        continue;
      }
    }
    const duration = Date.now() - startTime;
    throw {
      error: true,
      message: "All API keys failed. Last error: " + lastError?.message,
      duration_ms: duration,
      request_id: requestId
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const hasPrompt = params.prompt && params.prompt.trim().length > 0;
  const hasMessages = Array.isArray(params.messages) && params.messages.length > 0;
  if (!hasPrompt && !hasMessages) {
    return res.status(400).json({
      error: "Please provide either a 'prompt' or 'messages' array."
    });
  }
  try {
    const api = new DeepseekChat();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}