import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    topic
  } = req.method === "GET" ? req.query : req.body;
  if (method === "GET" && topic) {
    const url = `https://play.triviamaker.com/questionGenerator.php?topic=${encodeURIComponent(topic)}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://triviamaker.ai/"
    };
    try {
      const response = await fetch(url, {
        headers: headers
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching trivia data",
        error: error.message
      });
    }
  }
  return res.status(400).json({
    message: "Topic parameter is required"
  });
}