import axios from "axios";
class TypliAI {
  constructor(apiKey = "undefined") {
    this.apiUrl = "https://typli.ai/api/generators/completion";
    this.apiKey = apiKey;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
      Referer: "https://typli.ai/ai-answer-generator"
    };
  }
  async generate(prompt, temperature = 1.2) {
    try {
      const {
        data
      } = await axios.post(this.apiUrl, {
        prompt: prompt,
        temperature: temperature
      }, {
        headers: this.headers
      });
      if (!data) throw new Error("Response kosong");
      if (typeof data === "string") {
        const extractedText = data.split("\n").filter(line => line.trim().startsWith('0:"')).map(line => {
          const startIndex = line.indexOf('0:"') + 3;
          const endIndex = line.lastIndexOf('"');
          return JSON.parse(`"${line.slice(startIndex, endIndex)}"`);
        }).filter(Boolean).join("");
        return extractedText || "Tidak ada teks yang dihasilkan.";
      }
      throw new Error("Format data tidak sesuai.");
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      prompt,
      temperature
    } = req.method === "GET" ? req.query : req.body;
    if (!prompt) return res.status(400).json({
      error: "Prompt is required"
    });
    const typli = new TypliAI();
    const response = await typli.generate(prompt, temperature);
    if (response.startsWith("Error:")) throw new Error(response);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}