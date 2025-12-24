import axios from "axios";
class Gock {
  constructor() {
    this.baseUrl = "https://ai.gock.net/api";
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "id-ID,id;q=0.9",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      Origin: "https://ai.gock.net",
      Referer: "https://ai.gock.net/flux",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async flux(prompt, model = "groq:llama-3.1-70b-versatile") {
    const body = {
      description: prompt || "Men",
      options: {
        model: model,
        numberOfPrompts: 1
      },
      task: "flux"
    };
    try {
      const response = await axios.post(`${this.baseUrl}/flux`, body, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error in flux request:", error);
      throw new Error("Flux API request failed");
    }
  }
  async html(prompt, model = "groq:llama-3.3-70b-versatile") {
    const body = {
      input: prompt || "Build a memory matching game with a grid of cards...",
      options: {
        model: model
      }
    };
    try {
      const response = await axios.post(`${this.baseUrl}/html-generator`, body, {
        headers: this.headers
      });
      const result = response.data;
      return {
        result: result
      };
    } catch (error) {
      console.error("Error in html request:", error);
      throw new Error("HTML Generator API request failed");
    }
  }
}
export default async function handler(req, res) {
  const {
    type = "flux",
      prompt,
      model
  } = req.method === "GET" ? req.query : req.body;
  const gock = new Gock();
  try {
    let result;
    if (type === "flux") {
      result = await gock.flux(prompt, model);
    } else if (type === "html") {
      result = await gock.html(prompt, model);
    } else {
      return res.status(400).json({
        error: "Invalid type specified"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}