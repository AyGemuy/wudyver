import axios from "axios";
class JeevesAI {
  constructor(version = 1) {
    try {
      this.baseUrl = version === 2 ? "https://api.jeeves.ai/generate/v4/chat" : "https://api.jeeves.ai/generate/v3/chat";
      this.headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer null"
      };
    } catch (error) {
      console.error("Error initializing JeevesAI class:", error);
    }
  }
  extractData(input) {
    try {
      return input.split("\n").filter(line => line.startsWith("data: ")).map(line => {
        try {
          const json = JSON.parse(line.slice(5));
          return json.choices?.text || json.finalText || "";
        } catch {
          return "";
        }
      }).join("").trim();
    } catch (error) {
      console.error("Error extracting data:", error);
      return "Error processing response.";
    }
  }
  async generate(prompt) {
    try {
      const payload = this.baseUrl.includes("/v4/") ? {
        prompt: prompt
      } : {
        temperature: "0.75",
        model: "gpt-3.5-turbo",
        stream: "on",
        presence_penalty: "0",
        frequency_penalty: "0",
        messages: [{
          role: "user",
          content: prompt
        }]
      };
      const response = await axios.post(this.baseUrl, payload, {
        headers: this.headers
      });
      return this.extractData(response.data);
    } catch (error) {
      console.error(`Error in Jeeves AI (v${this.baseUrl.includes("/v4/") ? 2 : 1}):`, error);
      return "Error generating chat.";
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    type: version = 1
  } = req.method === "POST" ? req.body : req.query;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required."
    });
  }
  try {
    const jeeves = new JeevesAI(version);
    const response = await jeeves.generate(prompt);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    console.error("Error handling API request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}