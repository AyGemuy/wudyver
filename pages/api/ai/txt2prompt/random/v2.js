import fetch from "node-fetch";
class GetimgAI {
  async getRandomPrompt() {
    try {
      const response = await fetch("https://getimg.ai/api/prompts/random", {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://getimg.ai/text-to-image"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch data from the API: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching random prompt from Getimg.ai:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const getimgAI = new GetimgAI();
    const data = await getimgAI.getRandomPrompt();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}