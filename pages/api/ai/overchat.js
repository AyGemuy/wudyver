import axios from "axios";
import crypto from "crypto";
class OverchatAPI {
  constructor() {
    this.getRandomValues = crypto.getRandomValues.bind(crypto);
    this._SU = (t, n) => {
      let r = "";
      for (let e = 0; e < 16; e++) {
        const i = t[e];
        (n || e) && e % 4 === 0 && (r += "-");
        r += (i < 16 ? "0" : "") + i.toString(16);
      }
      return r;
    };
    this.getUuidV4 = n => {
      try {
        const t = new Uint8Array(16);
        this.getRandomValues(t);
        t[8] &= 63;
        t[8] |= 128;
        t[6] &= 15;
        t[6] |= 64;
        return this._SU(t, n);
      } catch (i) {
        return "";
      }
    };
    this.deviceUUID = this.getUuidV4();
    this.deviceVersion = "1.0.44";
    this.apiKey = "";
    this.baseURL = "https://widget-api.overchat.ai/v1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: `Bearer ${this.apiKey}`,
      "cache-control": "no-cache",
      origin: "https://widget.overchat.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://widget.overchat.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-device-language": "id-ID",
      "x-device-platform": "web",
      "x-device-uuid": this.deviceUUID,
      "x-device-version": this.deviceVersion
    };
    this.userId = null;
  }
  async getId() {
    try {
      const response = await axios.get(`${this.baseURL}/auth/me`, {
        headers: this.headers
      });
      this.userId = response.data.id;
      return this.userId;
    } catch (error) {
      throw error;
    }
  }
  async createId(personaId = "best-free-ai-chat") {
    try {
      if (!this.userId) {
        await this.getId();
      }
      const response = await axios.post(`${this.baseURL}/chat/${this.userId}`, {
        personaId: personaId
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      return response.data.id;
    } catch (error) {
      throw error;
    }
  }
  async chat({
    chatId,
    prompt,
    messages,
    model = "x-ai/gpt-4.1",
    personaId = "grok-3-beta-mini",
    frequency_penalty = 0,
    max_tokens = 2048,
    presence_penalty = 0,
    stream = false,
    temperature = .5,
    top_p = .95,
    ...rest
  }) {
    try {
      if (!this.userId) {
        await this.getId();
      }
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await this.createId();
      }
      const requestData = {
        chatId: currentChatId,
        model: model,
        personaId: personaId,
        frequency_penalty: frequency_penalty,
        max_tokens: max_tokens,
        presence_penalty: presence_penalty,
        stream: stream,
        temperature: temperature,
        top_p: top_p,
        ...rest
      };
      if (prompt) {
        requestData.messages = [{
          id: crypto.randomUUID(),
          role: "user",
          content: prompt
        }];
      } else if (messages) {
        requestData.messages = messages.map(msg => ({
          id: msg.id || crypto.randomUUID(),
          role: msg.role,
          content: msg.content
        }));
      } else {
        throw new Error("Anda harus menyediakan prompt atau array messages.");
      }
      const response = await axios.post(`${this.baseURL}/chat/completions`, requestData, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      return this.processChatResponse(response.data);
    } catch (error) {
      throw error;
    }
  }
  processChatResponse(responseString) {
    const lines = responseString.trim().split("\n");
    const result = {
      result: "",
      array: []
    };
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          const dataJson = line.substring(5).trim();
          if (dataJson === "[DONE]") {
            break;
          }
          const data = JSON.parse(dataJson);
          if (data?.choices?.[0]?.delta?.content) {
            result.result += data.choices[0].delta.content;
            result.array.push(data.choices[0].delta.content);
          }
        } catch (parseError) {
          console.error("Gagal mem-parse data streaming:", parseError, line);
        }
      }
    }
    return result;
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
    const overchat = new OverchatAPI();
    const result = await overchat.chat(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}