import fetch from "node-fetch";
const API_KEY = "E64FUZgN4AGZ8yZr";
const BASE = "https://getimg-x4mrsuupda-uc.a.run.app";
class Gen {
  async generate({
    logo = false,
    prompt,
    ...rest
  }) {
    if (!prompt?.trim()) return console.log("err: prompt kosong"), null;
    const url = `${BASE}/${logo ? "api-logo" : "api-premium"}`;
    const body = new URLSearchParams({
      prompt: prompt,
      width: rest.width ?? 512,
      height: rest.height ?? 512,
      num_inference_steps: rest.num_inference_steps ?? 20,
      ...rest
    }).toString();
    console.log("mulai:", logo ? "logo" : "premium", prompt.slice(0, 30) + "...");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Dzine-Media-API": API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body
      });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const data = await res.json();
      console.log("sukses:", data?.url ? "gambar ok" : "no image");
      return data;
    } catch (e) {
      console.log("gagal:", e.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  try {
    const api = new Gen();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}