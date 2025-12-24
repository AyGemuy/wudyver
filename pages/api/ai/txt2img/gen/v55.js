import axios from "axios";
class MemePfp {
  constructor() {
    this.req = axios.create({
      baseURL: "https://www.memepfp.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.memepfp.com",
        referer: "https://www.memepfp.com/pfp-maker/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async generate({
    prompt,
    ...rest
  }) {
    const text = prompt || "random";
    console.log(`[LOG] Start: "${text}"`);
    try {
      const body = text ? {
        prompt: text,
        ...rest
      } : {
        prompt: "cat"
      };
      const res = await this.req.post("/api/generate-image/", body);
      const data = res?.data;
      console.log(data ? "[LOG] Success" : "[LOG] Empty response");
      return data;
    } catch (e) {
      const err = e?.response?.data || e?.message || "Error Unknown";
      console.error("[LOG] Fail:", err);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new MemePfp();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}