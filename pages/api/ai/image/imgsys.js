import axios from "axios";
async function imgsysPost(prompt) {
  try {
    const data = JSON.stringify({
      prompt: prompt
    });
    const config = {
      method: "POST",
      url: "https://imgsys.org/api/initiate",
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
        "Content-Type": "application/json",
        "accept-language": "id-ID",
        referer: "https://imgsys.org/",
        origin: "https://imgsys.org",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        priority: "u=0",
        te: "trailers"
      },
      data: data
    };
    const api = await axios.request(config);
    return api.data;
  } catch (error) {
    throw new Error(`Error in imgsysPost: ${error.message}`);
  }
}
async function imgsysCreate(prompt) {
  try {
    const data = await imgsysPost(prompt);
    const job = data.requestId;
    let img;
    do {
      img = await axios.get(`https://imgsys.org/api/get?requestId=${job}`);
      if (img.data.message) {
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
    } while (img.data.message);
    return img.data;
  } catch (error) {
    throw new Error(`Error in imgsysCreate: ${error.message}`);
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "Prompt is required"
    });
  }
  try {
    const result = await imgsysCreate(prompt);
    res.status(200).json({
      image: result
    });
  } catch (error) {
    res.status(500).json({
      message: "Error generating image",
      error: error.message
    });
  }
}