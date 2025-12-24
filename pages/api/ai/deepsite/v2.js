import axios from "axios";
const el = [{
  value: "deepseek-ai/DeepSeek-V3-0324",
  label: "DeepSeek V3 O324",
  providers: ["fireworks-ai", "nebius", "sambanova", "novita", "hyperbolic"],
  autoProvider: "novita"
}, {
  value: "deepseek-ai/DeepSeek-R1-0528",
  label: "DeepSeek R1 0528",
  providers: ["fireworks-ai", "novita", "hyperbolic", "nebius", "together", "sambanova"],
  autoProvider: "novita",
  isThinker: !0
}, {
  value: "Qwen/Qwen3-Coder-480B-A35B-Instruct",
  label: "Qwen3 Coder 480B A35B Instruct",
  providers: ["novita", "hyperbolic"],
  autoProvider: "novita",
  isNew: !0
}, {
  value: "moonshotai/Kimi-K2-Instruct",
  label: "Kimi K2 Instruct",
  providers: ["together", "novita", "groq"],
  autoProvider: "groq"
}, {
  value: "deepseek-ai/DeepSeek-V3.1",
  label: "DeepSeek V3.1",
  providers: ["fireworks-ai", "novita"],
  isNew: !0,
  autoProvider: "fireworks-ai"
}, {
  value: "moonshotai/Kimi-K2-Instruct-0905",
  label: "Kimi K2 Instruct 0905",
  providers: ["together", "groq", "novita"],
  isNew: !0,
  autoProvider: "groq"
}];
class AIHandler {
  constructor() {
    this.apiUrl = "https://enzostvs-deepsite.hf.space/api/ask-ai";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://enzostvs-deepsite.hf.space",
      priority: "u=1, i",
      referer: "https://enzostvs-deepsite.hf.space/projects/new",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-forwarded-for": "enzostvs-deepsite.hf.space"
    };
  }
  _g(e) {
    if (!e) return "";
    const t = e.trim().match(/<!DOCTYPE html>[\s\S]*/);
    if (!t) return "";
    let s = t[0];
    return this._f(s).replace(/```/g, "");
  }
  _f(e) {
    let t = e;
    if (t.includes("<head>") && !t.includes("</head>")) t += "\n</head>";
    if (t.includes("<body") && !t.includes("</body>")) t += "\n</body>";
    if (!t.includes("</html>")) t += "\n</html>";
    return t;
  }
  _h(e) {
    let t = [];
    const titleRegex = /<<<<<<< START_TITLE (.*?) >>>>>>> END_TITLE/;
    if (!e.match(titleRegex)) {
      console.log("Log: Format judul tidak ditemukan dalam response.");
      return t;
    }
    const s = e.split(titleRegex);
    const a = new Set();
    s.forEach((val, index) => {
      if (a.has(index) || !val?.trim()) return;
      const n = this._g(s[index + 1]);
      if (n) {
        const page = {
          path: val.trim(),
          html: n
        };
        t.push(page);
        a.add(index);
        a.add(index + 1);
      }
    });
    return t;
  }
  async chat({
    prompt,
    ...rest
  }) {
    console.log("Log: Memulai proses chat AI...");
    try {
      const data = {
        prompt: prompt,
        provider: rest?.provider || "auto",
        model: rest?.model ?? "deepseek-ai/DeepSeek-V3.1",
        ...rest
      };
      console.log("Log: Mengirim request dengan data:", JSON.stringify(data, null, 2));
      const response = await axios.post(this.apiUrl, data, {
        headers: this.headers,
        responseType: "text"
      });
      const responseData = response.data;
      console.log("Log: Menerima response dari AI.");
      const parsedPages = this._h(responseData);
      const result = parsedPages.length > 0 ? parsedPages : {
        message: "Gagal mem-parsing response atau format tidak sesuai.",
        raw: responseData
      };
      console.log("Log: Proses chat AI selesai.");
      return result;
    } catch (error) {
      console.error("Log: Terjadi error saat proses chat AI:", error?.message || "Error tidak diketahui");
      const errorMessage = error?.response?.data || error?.message || "Terjadi kesalahan pada server";
      return {
        error: true,
        message: errorMessage
      };
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
    const ai = new AIHandler();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}