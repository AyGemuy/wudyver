import fetch from "node-fetch";
class KieAIAPI {
  constructor() {
    this.baseUrl = "https://kieai.erweima.ai/api/v1";
    this.apiKey = "2f39d3bdf7527ffc61479e356201eade";
  }
  async generate({
    prompt,
    imageUrl,
    size = "1:1",
    variants = 1
  }) {
    if (!prompt?.trim()) throw new Error("prompt is required");
    const body = {
      prompt: prompt.trim(),
      size: size,
      variants: variants,
      model: "gpt-4o-image"
    };
    if (imageUrl) {
      const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      if (urls.length === 0) throw new Error("imageUrl cannot be empty");
      body.urls = urls.filter(url => typeof url === "string" && url.trim());
    }
    const res = await fetch(`${this.baseUrl}/gpt4o-image/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data;
  }
  async status({
    task_id
  }) {
    if (!task_id) throw new Error("task_id is required");
    const res = await fetch(`${this.baseUrl}/gpt4o-image/record-info?taskId=${task_id}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });
    const data = await res.json();
    return data;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["generate", "status"]
    });
  }
  const api = new KieAIAPI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          actions: ["generate", "status"]
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}