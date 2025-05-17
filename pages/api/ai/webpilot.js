import axios from "axios";
class WebPilotAPI {
  constructor() {
    this.url = "https://api.webpilotai.com/rupee/v1/search";
    this.config = {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json;charset=UTF-8",
        Authorization: "Bearer null",
        Accept: "text/event-stream",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.webpilot.ai/search?lang=en-US&threadId=1bc910c4-4e48-4461-8dbc-937c67996dce"
      }
    };
  }
  async fetchData(prompt) {
    const data = {
      q: prompt,
      threadId: ""
    };
    try {
      const response = await axios.post(this.url, data, this.config);
      return this.parseResponse(response.data);
    } catch (error) {
      throw new Error("Error fetching data: " + error.message);
    }
  }
  parseResponse(output) {
    return output.split("\n").filter(line => line.startsWith("data:")).map(line => {
      try {
        const jsonData = line.slice(5);
        const parsed = JSON.parse(jsonData);
        return parsed.data.content;
      } catch (error) {
        return "";
      }
    }).join("");
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    error: "Query prompt is required"
  });
  const api = new WebPilotAPI();
  try {
    const content = await api.fetchData(prompt);
    return res.status(200).json({
      result: content
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}