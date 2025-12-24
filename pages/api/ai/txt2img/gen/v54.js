import axios from "axios";
class SabrinaGen {
  constructor() {
    this.base = "https://tools.sabrina.dev/api/generate-image";
    this.head = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://tools.sabrina.dev",
      referer: "https://tools.sabrina.dev/generator",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async req(pl) {
    return await axios.post(this.base, pl, {
      headers: this.head,
      responseType: "arraybuffer"
    });
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log("[Sabrina] Initializing...");
    try {
      const txt = prompt || "Random masterpiece";
      const payload = {
        prompt: txt,
        ...Object.keys(rest).length > 0 ? rest : {}
      };
      console.log(`[Sabrina] Processing: "${txt.substring(0, 30)}..."`);
      const res = await this.req(payload);
      const isOk = res?.status === 200;
      const raw = res?.data;
      if (!isOk || !raw) throw new Error("Empty response");
      const buf = Buffer.from(raw);
      console.log(`[Sabrina] Done. Size: ${buf.length} bytes.`);
      return buf;
    } catch (e) {
      const msg = e?.response?.data ? Buffer.from(e.response.data).toString() : e?.message;
      console.error(`[Sabrina] Failed: ${msg || "Unknown error"}`);
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
  const api = new SabrinaGen();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}