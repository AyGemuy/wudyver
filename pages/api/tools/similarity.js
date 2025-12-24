import axios from "axios";
class TextSimilarity {
  constructor() {
    this.apiUrl = "https://api.api-ninjas.com/v1/textsimilarity";
    this.apiKey = "CqFHPg/nZmeAEHsS8OHRUw==eHzKqFrCJgJ2NIb4";
  }
  async compare(text1, text2) {
    try {
      const response = await axios.post(this.apiUrl, {
        text_1: text1,
        text_2: text2
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "x-api-key": this.apiKey,
          Referer: "https://www.api-ninjas.com/",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      });
      return response.data;
    } catch (error) {
      return {
        error: error.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    text1,
    text2
  } = req.method === "GET" ? req.query : req.body;
  if (!text1 || !text2) {
    return res.status(400).json({
      message: "Both text1 and text2 must be provided"
    });
  }
  try {
    const similarity = new TextSimilarity();
    const result = await similarity.compare(text1, text2);
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error processing request",
      error: error.message
    });
  }
}