import axios from "axios";
import https from "https";
class ThinkAny {
  constructor() {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: true
    });
    this.baseURL = "https://thinkany.ai";
    this.cookies = {};
    this.nextTree = null;
  }
  genId() {
    return Math.random().toString(36).substring(2, 15);
  }
  async initData({
    prompt = "apa yang kamu pikirkan?",
    mode = "search",
    model = "gpt-4o-mini",
    source = "all"
  }) {
    const url = `${this.baseURL}/search?q=${encodeURIComponent(prompt)}&mode=${mode}&model=${model}&source=${source}&_rsc=j028k`;
    const initialCookie = `NEXT_LOCALE=en; __Host-authjs.csrf-token=${this.genId()}%7C${this.genId()}`;
    try {
      const res = await axios.get(url, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          cookie: initialCookie
        },
        httpsAgent: this.httpsAgent
      });
      if (res.headers["set-cookie"]) res.headers["set-cookie"].forEach(c => {
        const [n, v] = c.split(";")[0].split("=");
        this.cookies[n] = v;
      });
      if (res.headers["next-router-state-tree"]) this.nextTree = res.headers["next-router-state-tree"];
      return res.data;
    } catch (e) {
      console.error("Search Error:", e);
      throw e;
    }
  }
  parseChat(rawString) {
    const lines = rawString.split("\n");
    const result = {
      content: "",
      other: []
    };
    const chunks = [];
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const jsonString = line.slice(5).trim();
        if (jsonString) {
          try {
            const jsonData = JSON.parse(jsonString);
            if (jsonData?.choices?.[0]?.delta?.content) chunks.push(jsonData.choices[0].delta.content);
            else if (jsonData?.answer !== undefined) result.answer = jsonData.answer;
            else if (jsonData?.conversation?.answer !== undefined) result.answer = jsonData.conversation.answer;
            else if (jsonData) result.other.push(jsonData);
          } catch {}
        }
      }
    }
    result.content = chunks.join("");
    return result;
  }
  async chat({
    prompt = "apa yang kamu pikirkan?",
    model = "gpt-4o-mini",
    mode = "search",
    source = "all",
    conv_uuid = this.genId(),
    uuid = this.genId()
  }) {
    await this.initData({
      prompt: prompt,
      mode: mode,
      model: model,
      source: source
    });
    const data = {
      conv_uuid: conv_uuid,
      uuid: uuid,
      role: "user",
      content: prompt,
      llm_model: model,
      locale: "en",
      mode: mode,
      source: "all",
      target_msg_uuid: "",
      action: "init_search"
    };
    try {
      const res = await axios.post(`${this.baseURL}/api/chat/completions`, data, {
        headers: {
          "content-type": "application/json",
          origin: "https://thinkany.ai",
          referer: `https://thinkany.ai/search?q=${encodeURIComponent(prompt)}&mode=${mode}&model=${model}&source=all`,
          cookie: Object.keys(this.cookies).map(k => `${k}=${this.cookies[k]}`).join("; "),
          "next-router-state-tree": this.nextTree
        },
        httpsAgent: this.httpsAgent
      });
      return this.parseChat(res.data);
    } catch (e) {
      console.error("Chat Error:", e);
      throw e;
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
    const api = new ThinkAny();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}