import axios from "axios";
class AIPromptGenerator {
  constructor() {
    this.baseUrl = "https://wabpfqsvdkdjpjjkbnok.supabase.co/functions/v1";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://generateprompt.ai",
      priority: "u=1, i",
      referer: "https://generateprompt.ai/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYnBmcXN2ZGtkanBqamtibm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNjk5MjEsImV4cCI6MjA1Mjk0NTkyMX0.wGGq1SWLIRELdrntLntBz-QH-JxoHUdz8Gq-0ha-4a4"
    };
  }
  async getImageBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const contentType = response.headers["content-type"] || "image/jpeg";
      const base64 = Buffer.from(response.data).toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error("Error fetching image:", error);
      throw error;
    }
  }
  _parse(rawData) {
    try {
      const lines = rawData.split("\n").filter(line => line.startsWith("data: ") && !line.includes("[DONE]"));
      let fullResponse = "";
      for (const line of lines) {
        try {
          const jsonStr = line.replace("data: ", "").trim();
          const data = JSON.parse(jsonStr);
          const content = data.choices?.[0]?.delta?.content || "";
          fullResponse += content;
        } catch (e) {
          console.error("Error parsing chunk:", e);
        }
      }
      return {
        result: fullResponse.trim()
      };
    } catch (error) {
      console.error("Error parsing response:", error);
      return "";
    }
  }
  async generatePrompt({
    imageUrl: image,
    prompt,
    language = "en"
  }) {
    try {
      const imageBase64 = typeof image === "string" && image.startsWith("http") ? await this.getImageBase64(image) : image;
      const payload = {
        prompt: prompt || "Generate only a detailed prompt that could be used to recreate this image using AI image generation models. Focus on describing the visual elements, style, composition, lighting, and any notable details. Do not include any comments, explanations, or additional text - only provide the prompt itself.",
        feature: "image-to-prompt-en",
        language: language,
        image: imageBase64
      };
      const response = await axios.post(`${this.baseUrl}/unified-prompt`, payload, {
        headers: this.defaultHeaders
      });
      return this._parse(response.data);
    } catch (error) {
      console.error("Error generating prompt:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const describer = new AIPromptGenerator();
    const response = await describer.generatePrompt(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}