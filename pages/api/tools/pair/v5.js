import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    number,
    type
  } = req.method === "GET" ? req.query : req.body;
  if (!number) {
    return res.status(400).json({
      error: "Phone number is required"
    });
  }
  if (!type || !["1", "2"].includes(type)) {
    return res.status(400).json({
      error: "Invalid or missing type parameter"
    });
  }
  const url = type === "1" ? `https://session.bk9.site/pair?phone=${number}` : `https://session.bk9.site/pair2?phone=${number}`;
  const referer = type === "1" ? "https://session.bk9.site/code" : "https://session.bk9.site/code2";
  const headers = {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: referer
  };
  try {
    const response = await fetch(url, {
      headers: headers
    });
    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
}