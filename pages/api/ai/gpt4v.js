import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const url = "https://gpt4vnet.erweima.ai/api/v1/chat/gpt4o/chat";
  const sessionId = uuidv4();
  const headers = {
    "Content-Type": "application/json",
    authorization: "",
    uniqueId: sessionId,
    verify: "",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://gpt4v.net/app/d200cf4a57ed2fd7cbb7e91cb872c80f"
  };
  const data = {
    prompt: prompt,
    sessionId: sessionId,
    attachments: []
  };
  try {
    const response = await axios.post(url, data, {
      headers: headers
    });
    const parsedData = response.data.split("\n").map(line => {
      try {
        return JSON.parse(line).data.message;
      } catch (error) {
        return "";
      }
    }).filter(line => line.trim() !== "").join("");
    return res.status(200).json({
      result: parsedData
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      error: "Error fetching data"
    });
  }
}