import axios from "axios";
class GeminiAI {
  constructor() {
    this.encKey = ["QUl6YVN5RGtha2QtMWNiR3FlU1Y2eHJ3WTk4Q0o4SVF5LUpqeUgw", "QUl6YVN5Q2dTVmc4Mms1aUt2Tng2LTNEUmFCSE5Ham5CbGNxaTJZ", "QUl6YVN5Q1dlZUVPVHlqT2Vwc0kyTjg0SDRDMUd4bDlwWk45X3Zr", "QUl6YVN5RGQzM0VBejJXR3BqdkM4R0xJV09sNFJFRXRQSWJCVjBz", "QUl6YVN5QW92M2ZZV0hOejNGaWpQaVNFRG81MnJrTFlBWWsxaEFz", "QUl6YVN5Q2JJVXhPZUVmWl90ajhEbk1BYWhmNG9pNXBuTVh6OXRr"];
    this.url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
    };
  }
  async generateContent(prompt) {
    const ranKey = this.encKey[Math.floor(Math.random() * this.encKey.length)];
    const decKey = Buffer.from(ranKey, "base64").toString("utf-8");
    const url = this.url + decKey;
    const body = {
      contents: [{
        parts: [{
          text: `${prompt}`
        }]
      }]
    };
    try {
      const response = await axios.post(url, body, {
        headers: this.headers
      });
      return response.data.candidates[0]?.content.parts[0]?.text || "No Result";
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      message: "No prompt provided"
    });
  }
  const geminiAI = new GeminiAI();
  try {
    const result = await geminiAI.generateContent(prompt);
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}