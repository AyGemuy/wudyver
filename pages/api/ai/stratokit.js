import fetch from "node-fetch";
const bufferFromBase64 = inputText => {
  try {
    const regex = /([A-Za-z0-9+/=]{10,})/g;
    const matches = inputText.match(regex);
    if (matches && matches.length > 0) {
      const base64Data = matches[0].startsWith("data:image") ? matches[0].split(",")[1] : matches[0];
      return Buffer.from(base64Data, "base64");
    }
    throw new Error("No base64 image found.");
  } catch (error) {
    throw new Error(`Error processing base64: ${error.message}`);
  }
};
class StratokitAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async handleRequest(action, prompt) {
    try {
      if (action === "image") return {
        image: await this.fetchImage(prompt)
      };
      if (action === "chat") return {
        result: await this.fetchChat(prompt)
      };
      throw new Error("Unsupported action");
    } catch (error) {
      throw new Error(`Error handling request: ${error.message}`);
    }
  }
  async fetchImage(prompt) {
    try {
      const url = `${this.baseUrl}/ai/image`;
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify([{
          prompt: prompt
        }])
      });
      if (!response.ok) throw new Error(`Error fetching image: ${response.statusText}`);
      return bufferFromBase64(await response.text());
    } catch (error) {
      throw new Error(`Error fetching image: ${error.message}`);
    }
  }
  async fetchChat(prompt) {
    try {
      const url = `${this.baseUrl}/api/chat`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: prompt
          }]
        })
      });
      if (!response.ok) throw new Error(`Error fetching chat: ${response.statusText}`);
      const result = (await response.text()).split("\n").filter(line => line.startsWith("0:")).map(line => line.slice(2).trim()).map(line => line.slice(1, -1)).join("");
      return result;
    } catch (error) {
      throw new Error(`Error fetching chat: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    prompt
  } = req.method === "GET" ? req.query : req.body;
  const stratokitApi = new StratokitAPI("https://stratokit-app.pages.dev");
  try {
    const result = await stratokitApi.handleRequest(action, prompt);
    if (result.image) {
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(result.image);
    }
    return res.status(200).json({
      result: result.result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}