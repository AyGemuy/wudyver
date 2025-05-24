import axios from "axios";
import crypto from "crypto";
export default async function handler(req, res) {
  try {
    const {
      prompt,
      system,
      assistant
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) {
      return res.status(400).json({
        message: "Missing required field: prompt."
      });
    }
    const dateCreated = new Date().toISOString();
    const content = assistant ? assistant : system ? system : "Saya adalah Copilot2Trip, asisten perjalanan pribadi Anda. Silakan berikan detail perjalanan Anda.";
    const role = assistant ? "assistant" : system ? "system" : "user";
    const generateHash = input => {
      return crypto.createHash("md5").update(input).digest("hex");
    };
    const payload = [{
      hash: generateHash("assistant-" + dateCreated),
      role: role,
      content: content
    }, {
      hash: generateHash("user-" + prompt + dateCreated),
      role: "user",
      content: prompt,
      dateCreated: dateCreated
    }];
    const response = await axios.post("https://copilot2trip.com/api/v1/chats/", payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://copilot2trip.com/"
      }
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "An unexpected error occurred."
    });
  }
}