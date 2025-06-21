import axios from "axios";
async function Fiddle(prompt) {
  try {
    const response = await axios.post("https://backend.python-fiddle.com/api/ask-llm", {
      prompt: prompt || "hai"
    }, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://python-fiddle.com/"
      }
    });
    return {
      result: response.data
    };
  } catch (error) {
    console.error("Error in Fiddle function:", error);
    return {
      error: "An error occurred while processing the request."
    };
  }
}
export default async function handler(req, res) {
  try {
    const {
      prompt
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({
        error: "Prompt is required."
      });
    }
    const result = await Fiddle(prompt);
    if (result.error) {
      return res.status(500).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in API route:", error);
    res.status(500).json({
      error: "An error occurred while processing the request."
    });
  }
}