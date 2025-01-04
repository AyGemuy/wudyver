import fetch from "node-fetch";
import {
  randomUUID
} from "crypto";
export default async function handler(req, res) {
  const url = "https://luminai.my.id/";
  const headers = {
    "Content-Type": "application/json",
    "X-XSS-Protection": "1; mode=block",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    Referer: "https://luminai.my.id/chat"
  };
  if (req.method === "GET" || req.method === "POST") {
    const {
      prompt = "default",
        web = "false"
    } = req.method === "GET" ? req.query : req.body;
    const user = `user-${randomUUID()}`;
    const body = JSON.stringify({
      content: prompt,
      user: user,
      webSearchMode: web === "true"
    });
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body
      });
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({
        error: "Terjadi kesalahan",
        details: error.message
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({
      error: `Metode ${req.method} tidak diizinkan`
    });
  }
}