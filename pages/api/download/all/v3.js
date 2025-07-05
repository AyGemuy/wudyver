import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    url: link
  } = req.method === "GET" ? req.query : req.body;
  if (!link) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const url = "https://fastsavenow.com/wp-json/aio-dl/video-data/";
  const params = {
    url: link,
    token: "a9c0082f6f8e3d7d5a00924c93ffe2deb6a42080ae9a8d25af54dc0b0d46e458"
  };
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Postify/1.0.0"
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: new URLSearchParams(params)
    });
    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch video data"
      });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}