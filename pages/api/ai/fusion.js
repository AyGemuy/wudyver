import axios from "axios";
export default async function handler(req, res) {
  const {
    type = "gptSearch",
      chatText = "Yoo",
      command = "",
      userName = "User",
      email = "",
      prompt = "A photo of a white fur monster standing in a purple room"
  } = req.method === "GET" ? req.query : req.body;
  if (!["gptSearch", "dalle"].includes(type)) {
    return res.status(400).json({
      error: 'Invalid type. Use "gptSearch" or "dalle".'
    });
  }
  const endpoints = {
    gptSearch: "https://ai-image-fusion-production.up.railway.app/api/v1/gptSearch/",
    dalle: "https://ai-image-fusion-production.up.railway.app/api/v1/dalle"
  };
  const defaultData = {
    gptSearch: {
      chatText: chatText,
      command: command,
      userName: userName,
      email: email
    },
    dalle: {
      prompt: prompt
    }
  };
  try {
    const response = await axios.post(endpoints[type], defaultData[type], {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: type === "gptSearch" ? "https://ai-image-tom.netlify.app/" : "https://ai-image-tom.netlify.app/create-post"
      }
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    console.error(`${type} Error:`, error.message);
    res.status(500).json({
      error: `Failed to fetch data for ${type}`
    });
  }
}