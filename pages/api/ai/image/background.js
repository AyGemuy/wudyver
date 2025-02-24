import axios from "axios";
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required."
    });
  }
  const url = "https://www.aestheticbackground.com/api/generate-image/";
  const headers = {
    accept: "*/*",
    "accept-language": "id-ID,id;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/json",
    cookie: "_ga=GA1.1.155150537.1735808880; __Host-next-auth.csrf-token=f52109162e7a0ad4a42a94b9d306969795a26a3801bcd97a7dd445188e8e08b5%7Cf4bfc6adce0dc3d00174727dc03190e4b753da3a9e00f9dcdc3937ba4c5be175; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.aestheticbackground.com; _ga_JS9D4S4Z35=GS1.1.1735808880.1.1.1735808898.0.0.0",
    origin: "https://www.aestheticbackground.com",
    pragma: "no-cache",
    priority: "u=1, i",
    referer: "https://www.aestheticbackground.com/ai-background-generator/",
    "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
  };
  const data = {
    prompt: prompt
  };
  try {
    const response = await axios.post(url, data, {
      headers: headers
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    console.error("Error fetching image:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || "Internal server error."
    });
  }
}