import {
  EventSource
} from "eventsource";
class EdytAI {
  constructor() {
    this.baseURL = "https://api.edyt.ai/api/test";
    this.headers = {
      accept: "text/event-stream",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://edyt.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://edyt.ai/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async chat({
    prompt
  }) {
    const query = encodeURIComponent(prompt);
    const url = `${this.baseURL}?query=${query}&data=null&pw=askldfnasldkfjlkajsdf`;
    return new Promise((resolve, reject) => {
      let output = "";
      const es = new EventSource(url, {
        headers: this.headers
      });
      es.onmessage = e => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === "message" && d.output) output += d.output;
          if (d.type === "simpleChat" && d.output?.includes("[[Done]]")) {
            es.close();
            resolve(output.trim());
          }
        } catch (err) {
          console.error("Parse error:", err);
        }
      };
      es.onerror = err => {
        es.close();
        console.error("EventSource error:", err);
        reject(err);
      };
    });
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
    const edyt = new EdytAI();
    const response = await edyt.chat(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}