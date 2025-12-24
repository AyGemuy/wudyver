import axios from "axios";
import crypto from "crypto";
class Copilot2TripChat {
  constructor() {}
  async chat({
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      const dateCreated = new Date().toISOString();
      const generateHash = input => crypto.createHash("md5").update(input).digest("hex");
      let payload = [];
      if (messages.length === 0) {
        const defaultContent = "Saya adalah Copilot2Trip, asisten perjalanan pribadi Anda. Silakan berikan detail perjalanan Anda.";
        payload.push({
          hash: generateHash("assistant-" + dateCreated),
          role: "assistant",
          content: defaultContent
        });
      } else {
        payload = [...messages];
      }
      payload.push({
        hash: generateHash("user-" + prompt + dateCreated),
        role: "user",
        content: prompt,
        dateCreated: dateCreated
      });
      const response = await axios.post("https://copilot2trip.com/api/v1/chats/", payload, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://copilot2trip.com/"
        },
        ...rest
      });
      const result = response.data;
      return {
        result: result
      };
    } catch (error) {
      console.error("Error in Copilot2Trip chat:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new Copilot2TripChat();
    const response = await api.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}