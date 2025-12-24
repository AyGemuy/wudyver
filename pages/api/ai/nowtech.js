import axios from "axios";
import crypto from "crypto";
class NowtechAI {
  constructor() {
    this.secretKey = "dfaugf098ad0g98-idfaugf098ad0g98-iduoafiunoa-f09a8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8gduoafiunoa-f09adfaugf098ad0g98-iduoafiunoa-f09a8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8g8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8g";
  }
  async chat({
    prompt
  }) {
    if (!prompt) {
      throw new Error("prompt is required for chat.");
    }
    const timestamp = Date.now().toString();
    const key = crypto.createHmac("sha512", this.secretKey).update(timestamp).digest("base64");
    const data = JSON.stringify({
      content: prompt
    });
    const config = {
      method: "POST",
      url: "http://aichat.nowtechai.com/now/v1/ai",
      headers: {
        "User-Agent": "Ktor client",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        Key: key,
        TimeStamps: timestamp,
        "Accept-Charset": "UTF-8"
      },
      data: data,
      responseType: "stream"
    };
    return new Promise((resolve, reject) => {
      axios.request(config).then(response => {
        let result = "";
        response.data.on("data", chunk => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json?.choices?.[0]?.delta?.content;
                if (content) {
                  result += content;
                }
              } catch (err) {
                console.error("Parsing error for chat stream chunk:", err.message);
              }
            }
          }
        });
        response.data.on("end", () => {
          resolve(result.trim());
        });
        response.data.on("error", err => {
          reject(new Error(`Chat API stream error: ${err.message}`));
        });
      }).catch(err => {
        reject(new Error(`Chat API request failed: ${err.message}`));
      });
    });
  }
  async art({
    prompt
  }) {
    if (!prompt) {
      throw new Error("Prompt is required for art generation.");
    }
    const config = {
      method: "GET",
      url: `http://art.nowtechai.com/art?name=${encodeURIComponent(prompt)}`,
      headers: {
        "User-Agent": "okhttp/5.0.0-alpha.9",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json"
      }
    };
    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      throw new Error(`Art API request failed: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (chat or art) is required."
    });
  }
  const api = new NowtechAI();
  try {
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "prompt is required for 'chat' action."
          });
        }
        const chatResponse = await api.chat(params);
        return res.status(200).json({
          result: chatResponse
        });
      case "art":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'art' action."
          });
        }
        const artResponse = await api.art(params);
        return res.status(200).json(artResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'chat' and 'art'."
        });
    }
  } catch (error) {
    console.error("Error in NowtechAI handler:", error.message);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}