import axios from "axios";
class ChatClient {
  constructor() {
    this.api = axios.create({
      baseURL: "https://chatilmv2-ehfaf4dxccg4dde2.eastus2-01.azurewebsites.net/api/v1",
      headers: {
        Accept: "text/event-stream",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: "https://chatilm.islamicity.org",
        Pragma: "no-cache",
        Referer: "https://chatilm.islamicity.org/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      console.log("[Log] Memproses permintaan...");
      let history = messages?.length ? messages : [];
      if (prompt) {
        history.push({
          role: "user",
          content: prompt
        });
      }
      const body = {
        messages: history,
        referrer: rest?.referrer || "ChatILM",
        stream: rest?.stream ?? false,
        ...rest
      };
      console.log("[Log] Mengirim payload ke Azure...");
      const res = await this.api.post("/context-in-usage", body);
      console.log("[Log] Respon berhasil diterima");
      return res?.data;
    } catch (err) {
      console.error("[Error]:", err?.response?.data || err.message);
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
  const api = new ChatClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}