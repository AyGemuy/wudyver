import axios from "axios";
class SmallSeoToolsAI {
  constructor() {
    this.baseUrl = "https://smallseotools.ai";
    this.apiUrl = `${this.baseUrl}/index.php`;
    this.cookie = "";
  }
  async getSessionCookie() {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });
      const setCookie = response.headers["set-cookie"] || [];
      this.cookie = setCookie.map(c => c.split(";")[0]).join("; ");
      return this.cookie;
    } catch (error) {
      console.error("Gagal mendapatkan cookie sesi:", error.message);
      return null;
    }
  }
  async generateContent({
    experience = "Indonesian",
    prompt: profession = "sebutkan 5 hewan",
    engine = "OpenAI",
    model = "gpt-4o-mini",
    token = 2600,
    temp = .1,
    top = 1,
    fp = 0,
    pp = 0,
    stop = ""
  }) {
    if (!this.cookie) await this.getSessionCookie();
    try {
      const params = new URLSearchParams({
        wpaicg_stream: "yes",
        personexperience: experience,
        personprofession: profession,
        model_provider: model,
        engine: engine,
        max_tokens: token,
        temperature: temp,
        top_p: top,
        frequency_penalty: fp,
        presence_penalty: pp,
        stop: stop,
        post_title: "Article Writing AI Tool",
        id: "2050",
        source_stream: "form",
        nonce: "8e710de302"
      });
      const headers = {
        accept: "text/event-stream",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseUrl}/article-writing-ai-tool/`,
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        cookie: this.cookie
      };
      const response = await axios.get(`${this.apiUrl}?${params.toString()}`, {
        headers: headers
      });
      const result = response.data.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5)).filter(data => data && data !== "[DONE]").map(data => {
        try {
          return JSON.parse(data).choices?.[0]?.delta?.content || "";
        } catch {
          return "";
        }
      }).join("");
      return {
        result: result
      };
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ai = new SmallSeoToolsAI();
  try {
    const data = await ai.generateContent(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}