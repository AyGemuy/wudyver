import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    username
  } = req.method === "GET" ? req.query : req.body;
  if (!username) return res.status(400).json({
    error: "Username is required"
  });
  try {
    const existResponse = await fetch(`https://countik.com/api/exist/${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: `https://countik.com/user/@${username}`
      }
    });
    const existData = await existResponse.json();
    if (!existData.id) return res.status(404).json({
      error: "User not found"
    });
    const userInfoResponse = await fetch(`https://countik.com/api/userinfo?sec_user_id=${existData.sec_uid}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: `https://countik.com/user/@${username}`
      }
    });
    const result = await userInfoResponse.json();
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "An error occurred"
    });
  }
}