import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ChatAI {
  constructor() {
    this.baseURL = "http://api.chatai.click/v1/chat2";
    this.headers = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; RMX3890 Build/UKQ1.230917.001)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/x-www-form-urlencoded",
      ...SpoofHead()
    };
    this.templates = {
      1: "653b5fd1003600001b005769",
      2: "653b5fe4003600001b005773",
      3: "653b5fd5003600001b00576c"
    };
  }
  genId() {
    return Math.floor(1e14 + Math.random() * 9e14).toString();
  }
  async chat({
    prompt,
    template = 1,
    ...rest
  }) {
    try {
      const templateId = this.templates[template] || this.templates[1];
      const data = new URLSearchParams();
      data.append("chatModel", "3");
      data.append("p2", prompt);
      data.append("phoneId", this.genId());
      data.append("messageId", this.genId());
      data.append("packageName", "com.demo.aigirlfriend");
      data.append("templateId", templateId);
      data.append("message", prompt);
      Object.keys(rest).forEach(key => {
        data.append(key, rest[key]);
      });
      const response = await axios.post(`${this.baseURL}/chatTemplate`, data, {
        headers: this.headers
      });
      return this.parseResponse(response.data);
    } catch (error) {
      console.error("Chat error:", error.message);
      throw error;
    }
  }
  parseResponse(responseData) {
    if (typeof responseData === "object" && !Array.isArray(responseData)) {
      return {
        result: responseData?.result || "",
        metadata: responseData
      };
    }
    if (typeof responseData === "string") {
      const result = {
        content: "",
        id: "",
        model: "",
        created: 0,
        service_tier: "",
        system_fingerprint: null,
        finish_reason: null,
        role: "",
        obfuscation: [],
        chunks: []
      };
      let position = 0;
      while (position < responseData.length) {
        const dataStart = responseData.indexOf("data: {", position);
        if (dataStart === -1) break;
        let braceCount = 0;
        let jsonEnd = -1;
        for (let i = dataStart + 6; i < responseData.length; i++) {
          if (responseData[i] === "{") braceCount++;
          if (responseData[i] === "}") {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
        if (jsonEnd === -1) break;
        const jsonStr = responseData.substring(dataStart + 6, jsonEnd);
        try {
          const chunk = JSON.parse(jsonStr);
          result.chunks.push(chunk);
          result.id = result.id || chunk?.id || "";
          result.model = result.model || chunk?.model || "";
          result.created = result.created || chunk?.created || 0;
          result.service_tier = result.service_tier || chunk?.service_tier || "";
          result.system_fingerprint = result.system_fingerprint || chunk?.system_fingerprint || null;
          const content = chunk?.choices?.[0]?.delta?.content;
          if (content) {
            result.content += content;
          }
          const role = chunk?.choices?.[0]?.delta?.role;
          if (role && !result.role) {
            result.role = role;
          }
          const finishReason = chunk?.choices?.[0]?.finish_reason;
          if (finishReason) {
            result.finish_reason = finishReason;
          }
          const obfuscation = chunk?.obfuscation;
          if (obfuscation) {
            result.obfuscation.push(obfuscation);
          }
        } catch (e) {}
        position = jsonEnd;
      }
      return {
        result: result.content,
        metadata: {
          id: result.id,
          model: result.model,
          created: result.created,
          service_tier: result.service_tier,
          system_fingerprint: result.system_fingerprint,
          finish_reason: result.finish_reason,
          role: result.role,
          obfuscation: result.obfuscation,
          total_chunks: result.chunks.length
        }
      };
    }
    return {
      result: responseData,
      metadata: {}
    };
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
    const chat = new ChatAI();
    const response = await chat.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}