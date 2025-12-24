import axios from "axios";
class AnimeArt {
  constructor() {
    this.ep = "https://generateimage1google-ee6uxbjcha-uc.a.run.app";
    this.valid = ["1:1", "16:9", "9:16"];
  }
  l(msg, d = "") {
    console.log(`[LOG] ${msg}`, d ? JSON.stringify(d, null, 2) : "");
  }
  chk(r) {
    return this.valid.includes(r);
  }
  async generate({
    prompt,
    ...rest
  }) {
    this.l("Start generation...");
    try {
      const ratio = rest?.ratio || "1:1";
      const isOk = this.chk(ratio);
      if (!isOk) throw new Error(`Invalid ratio. Options: ${this.valid.join(", ")}`);
      const finalPrompt = `Anime style: ${prompt?.trim() || "masterpiece"}`;
      const payload = {
        prompt: finalPrompt,
        ratio: ratio
      };
      this.l("Sending payload", payload);
      const res = await axios.post(this.ep, payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const url = res?.data?.url;
      const data = url ? {
        success: true,
        url: url
      } : {
        success: false,
        msg: "No URL returned"
      };
      this.l("Success", data);
      return data;
    } catch (err) {
      const reason = err?.response?.data || err?.message || "Unknown error";
      this.l("Error", reason);
      throw reason;
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
  const api = new AnimeArt();
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