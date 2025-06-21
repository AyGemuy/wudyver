import axios from "axios";
class Koala {
  constructor(model = "gpt-4o-mini") {
    this.model = model;
  }
  async generate(payload) {
    const {
      prompt
    } = payload;
    if (!prompt) {
      throw new Error("Prompt is required");
    }
    try {
      const response = await axios.post("https://koala.sh/api/gpt/", {
        input: prompt,
        inputHistory: [],
        outputHistory: [],
        model: this.model
      }, {
        headers: {
          accept: "text/event-stream",
          "accept-language": "id-ID,id;q=0.9",
          "content-type": "application/json",
          "flag-real-time-data": "true",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        },
        referrer: "https://koala.sh/chat?q=/dream%20matcha%20latte",
        referrerPolicy: "strict-origin-when-cross-origin"
      });
      const lines = response.data.split("\n").filter(line => line.startsWith("data:"));
      const parsedData = lines.map(line => line.slice(5)).map(text => text.slice(1, -1)).reduce((acc, text) => {
        if (text.match(/\bhttps?:\/\/\S+\b/i)) {
          acc.images.push(text.match(/\bhttps?:\/\/\S+\b/i)[0]);
        }
        acc.answer += text;
        return acc;
      }, {
        answer: "",
        images: []
      });
      return parsedData;
    } catch (error) {
      throw new Error(error.response?.data || "Internal server error");
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    model
  } = req.method === "GET" ? req.query : req.body;
  const selectedModel = model || "gpt-4o-mini";
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const koala = new Koala(selectedModel);
  try {
    const response = await koala.generate({
      prompt: prompt
    });
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}