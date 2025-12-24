import fetch from "node-fetch";
const AVAILABLE_MODELS = ["neversleep/llama-3-lumimaid-8b", "anthropic/claude-3.5-sonnet:beta", "openai/gpt-4o-mini", "gryphe/mythomax-l2-13b", "neversleep/llama-3-lumimaid-80b"];
const NETWRCK_CHAT_API = "https://netwrck.com/api/chatpred_or";
const NETWRCK_IMAGE_API = "https://aiproxy-416803.uc.r.appspot.com/fal";
async function ChatNetwrck(prompt, model) {
  if (!AVAILABLE_MODELS.includes(model)) {
    throw new Error("Model tidak tersedia");
  }
  try {
    const response = await fetch(NETWRCK_CHAT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://netwrck.com/"
      },
      body: JSON.stringify({
        query: prompt,
        model: model,
        context: "Saya adalah asisten virtual Anda yang siap membantu. Saya dapat memberikan informasi, menjawab pertanyaan, dan membantu dalam berbagai tugas sehari-hari. Silakan beri tahu saya apa yang dapat saya bantu hari ini."
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result || "Tidak ada output yang dihasilkan";
  } catch (error) {
    console.error("Internal Server Error:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    model
  } = req.method === "GET" ? req.query : req.body;
  if (!(prompt, model)) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await ChatNetwrck(prompt, model);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}