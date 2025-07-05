import axios from "axios";
class GeminiAPI {
  constructor() {
    this.encKey = ["QUl6YVN5RGtha2QtMWNiR3FlU1Y2eHJ3WTk4Q0o4SVF5LUpqeUgw", "QUl6YVN5Q2dTVmc4Mms1aUt2Tng2LTNEUmFCSE5Ham5CbGNxaTJZ", "QUl6YVN5Q1dlZUVPVHlqT2Vwc0kyTjg0SDRDMUd4bDlwWk45X3Zr", "QUl6YVN5RGQzM0VBejJXR3BqdkM4R0xJV09sNFJFRXRQSWJCVjBz", "QUl6YVN5QW92M2ZZV0hOejNGaWpQaVNFRG81MnJrTFlBWWsxaEFz", "QUl6YVN5Q2JJVXhPZUVmWl90ajhEbk1BYWhmNG9pNXBuTVh6OXRr", "QUl6YVN5QnlSSjk5eEhkV2ozWFl6YmdZQUFkbTRDUUF6NzBUYXBj", "QUl6YVN5RExyU2FoV3I0WWFWS3l0MmdUbmtwSTBiSUZPVkVQVjdZ"];
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
    };
  }
  async getData(imgUrl) {
    try {
      const response = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      return {
        mime_type: response.headers["content-type"],
        data: Buffer.from(response.data, "binary").toString("base64")
      };
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  async chat({
    model = "gemini-1.5-flash",
    prompt,
    imgUrl = null
  }) {
    if (!prompt) throw new Error("Prompt is required");
    const ranKey = this.encKey[Math.floor(Math.random() * this.encKey.length)];
    const decKey = Buffer.from(ranKey, "base64").toString("utf-8");
    const url = `${this.baseUrl}${model}:generateContent?key=${decKey}`;
    const body = {
      contents: [{
        parts: [...imgUrl ? [{
          inline_data: await this.getData(imgUrl)
        }] : [], {
          text: prompt
        }]
      }]
    };
    try {
      const response = await axios.post(url, body, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const gemini = new GeminiAPI();
  try {
    const data = await gemini.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}