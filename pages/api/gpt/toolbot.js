import axios from "axios";
async function fetchData(url, body) {
  try {
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    console.error("An error occurred:", error.response?.data || error.message);
    throw error;
  }
}
async function ToolbotAI(desire) {
  try {
    const data = await fetchData("https://www.toolbot.ai/api/generate", {
      desire: desire
    });
    const {
      description,
      prompt
    } = data.result[0];
    return await fetchData("https://www.toolbot.ai/api/query", {
      toolDescription: description,
      query: prompt
    });
  } catch (error) {
    console.error("An error occurred:", error.response?.data || error.message);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    prompt: desire
  } = req.method === "GET" ? req.query : req.body;
  if (!desire) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const result = await ToolbotAI(desire);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("An error occurred:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      message: error.response?.data || "Internal server error"
    });
  }
}