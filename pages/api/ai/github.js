import axios from "axios";
export default async function handler(req, res) {
  const {
    prompt,
    model = "gpt-4o-mini",
    system
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt tidak diberikan"
    });
  }
  const token = Buffer.from("Z2hwXzJXVlJEWW5mUUtKV3FUY2NkbkFXTGtNd05QTG1JZTFFUlhaVA==", "base64").toString("utf-8");
  try {
    const messages = [{
      role: "user",
      content: prompt
    }, ...system ? [{
      role: "system",
      content: system
    }] : []];
    const requestData = {
      model: model,
      messages: messages
    };
    const response = await axios.post("https://models.inference.ai.azure.com/chat/completions", requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
}