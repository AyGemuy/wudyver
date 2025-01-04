import fetch from "node-fetch";
async function aiArtGenerator(prompt) {
  try {
    const response = await fetch("https://ai-api.magicstudio.com/api/ai-art-generator", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
        Accept: "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "https://magicstudio.com",
        Referer: "https://magicstudio.com/ai-art-generator/"
      },
      body: new URLSearchParams({
        prompt: prompt,
        output_format: "bytes",
        user_profile_id: "null",
        anonymous_user_id: "a584e30d-1996-4598-909f-70c7ac715dc1",
        request_timestamp: Date.now(),
        user_is_subscribed: "false",
        client_id: "pSgX7WgjukXCBoYwDM8G8GLnRRkvAoJlqa5eAVvj95o"
      })
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.arrayBuffer();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt parameter is required"
    });
  }
  try {
    const result = await aiArtGenerator(prompt);
    
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(Buffer.from(result));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to fetch image from Bing"
    });
  }
}