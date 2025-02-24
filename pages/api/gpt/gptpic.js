import axios from "axios";
export default async function handler(req, res) {
  const {
    prompt: captionInput,
    captionModel = "default"
  } = req.method === "GET" ? req.query : req.body;
  if (!captionInput) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const response = await axios.post("https://chat-gpt.pictures/api/generateImage", {
      captionInput: captionInput,
      captionModel: captionModel
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      message: error.response?.data || "Internal server error"
    });
  }
}