import axios from "axios";
class Chat {
  async chat(prompt) {
    const url = "https://linerva.getliner.com/platform/copilot/v3/answer";
    const headers = {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      Referer: "https://getliner.com/"
    };
    const data = {
      spaceId: 18097491,
      threadId: "53007419",
      userMessageId: 59420219,
      userId: 8933542,
      query: prompt,
      agentId: "@liner-pro",
      platform: "web",
      regenerate: false
    };
    try {
      const response = await axios.post(url, data, {
        headers: headers
      });
      const respon = response.data.split("\n");
      return JSON.parse(respon[respon.length - 2]).answer;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt: query
  } = req.method === "POST" ? req.body : req.query;
  if (!query) return res.status(400).json({
    error: "Prompt is required"
  });
  try {
    const answer = await new Chat().chat(query);
    return res.status(200).json({
      result: answer
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}