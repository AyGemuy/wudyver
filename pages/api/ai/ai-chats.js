// pages/api/ai-chats.js
import fetch from "node-fetch";
import crypto from "crypto";

const AVAILABLE_MODELS = [
  "gpt-4o-mini",
  "toolbaz_v3.5_pro",
  "toolbaz_v3",
  "toolbaz_v2",
  "unfiltered_x",
  "mixtral_8x22b",
  "Qwen2-72B",
  "Llama-3-70B",
];

const generateSessionId = () => crypto.randomUUID();

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { prompt, type = "chat", model = "gpt-4o-mini", sessionId = generateSessionId() } = req.query;

    // Validate prompt
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Validate model
    if (!AVAILABLE_MODELS.includes(model)) {
      return res.status(400).json({ error: `Invalid model. Available models are: ${AVAILABLE_MODELS.join(', ')}` });
    }

    const url = "https://ai-chats.org/chat/send2/";
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer:
        type === "image"
          ? "https://ai-chats.org/image/"
          : "https://ai-chats.org/chat/",
    };

    const body = JSON.stringify({
      type: type,
      messagesHistory: [
        {
          id: sessionId,
          from: "you",
          content: prompt,
        },
      ],
    });

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    if (type === "image") {
      const data = await response.json();
      return res.status(200).json({ imageUrl: data.data[0].url });
    } else {
      const data = await response.text();
      const message = data
        .split("\n")
        .filter((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("") || data;
      return res.status(200).json({ result: message });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
