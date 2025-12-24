import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const {
      content
    } = req.method === "GET" ? req.query : req.body;
    if (!content) {
      return res.status(400).json({
        error: "Content is required"
      });
    }
    const url = "https://chatify-ai.vercel.app/api/chat";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      Referer: "https://chatify-ai.vercel.app/"
    };
    const body = JSON.stringify({
      messages: [{
        role: "user",
        content: content
      }]
    });
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });
    const str = await response.text();
    const hasil = JSON.parse('["' + str.split("\n").map(s => s.slice(3, -1)).join('","') + '"]').join("") || str;
    return res.status(200).json({
      result: hasil
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}