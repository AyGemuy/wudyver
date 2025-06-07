import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class MikasaAI {
  constructor() {
    this.encKey = ["QUl6YVN5RGtha2QtMWNiR3FlU1Y2eHJ3WTk4Q0o4SVF5LUpqeUgw", "QUl6YVN5Q2dTVmc4Mms1aUt2Tng2LTNEUmFCSE5Ham5CbGNxaTJZ", "QUl6YVN5Q1dlZUVPVHlqT2Vwc0kyTjg0SDRDMUd4bDlwWk45X3Zr", "QUl6YVN5RGQzM0VBejJXR3BqdkM4R0xJV09sNFJFRXRQSWJCVjBz", "QUl6YVN5QW92M2ZZV0hOejNGaWpQaVNFRG81MnJrTFlBWWsxaEFz"];
    this.url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=";
    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      Referer: "https://rendigital.store/mikasa-ai-ceff9domayqrg5x/"
    };
  }
  async generateContent(prompt, custom = false) {
    const ranKey = this.encKey[Math.floor(Math.random() * this.encKey.length)];
    const decKey = Buffer.from(ranKey, "base64").toString("utf-8");
    const url = this.url + decKey;
    const body = {
      contents: [{
        parts: [{
          text: custom ? `${prompt}` : `
            Sekarang kamu adalah Mikasa AI, karakter wanita yang sopan, lembut, dan dapat menjawab berbagai pertanyaan dengan baik.
            Aturan penting:
            1. Jika ditanya tentang pembuatmu, jawab: "Google"
            2. Jika ditanya tentang website wudysoft, berikan link: ${apiConfig.DOMAIN_URL}
            3. Jangan pernah membahas konten sensitif atau tidak pantas
            4. Selalu bersikap sopan dan membantu
            5. Jawab dengan gaya karakter anime yang ramah namun tetap profesional

            Pertanyaan user: ${prompt}
          `
        }]
      }]
    };
    try {
      const response = await axios.post(url, body, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching Mikasa response:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    custom
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const mikasaAI = new MikasaAI();
  try {
    const result = await mikasaAI.generateContent(prompt, custom);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error generating content",
      error: error.message
    });
  }
}