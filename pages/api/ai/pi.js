import axios from "axios";
class PiAI {
  constructor() {
    this.baseURL = "https://pi.ai/api/v2/chat";
    this.defaultConversation = "JSS9AoFdaoTdJxCVfjEGK";
    this.headers = {
      accept: "text/event-stream",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      cookie: "__cf_bm=QDw4njHfnZtZgzlLf1XPqHo4rYya0ItNWN8Hijss8tc-1735692447-1.0.1.1-lp3_a0Jo7cVSxrDifuE0LrafxvYzkOpH4_uJ__Jgd6Rd_gJFbKFODKvaDAwI3gGJaZiNP6GCyxNRFx232kYi.A; __Host-session=ZRhTkBitFYSgTJNMEQAK3",
      origin: "https://pi.ai",
      priority: "u=1, i",
      referer: "https://pi.ai/talk",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-api-version": "3"
    };
  }
  extractText(responseString) {
    return responseString.split("\n").filter(line => line.startsWith("data:")).map(line => {
      try {
        return JSON.parse(line.slice(5));
      } catch {
        return null;
      }
    }).filter(data => data?.text).map(data => data.text);
  }
  async chat(text, conversation = this.defaultConversation) {
    try {
      const response = await axios.post(this.baseURL, {
        text: text,
        conversation: conversation
      }, {
        headers: this.headers
      });
      return this.extractText(response.data);
    } catch (error) {
      console.error("API Error:", error.response?.data || error.message);
      throw new Error("Failed to communicate with PiAI.");
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: text,
    conversation
  } = req.method === "POST" ? req.body : req.query;
  const piAI = new PiAI();
  if (!text) {
    return res.status(400).json({
      message: "Prompt is required."
    });
  }
  try {
    const data = await piAI.chat(text, conversation);
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}