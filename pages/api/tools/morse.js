import axios from "axios";
class FunTranslations {
  constructor(apiKey = null) {
    this.baseUrl = "https://api.funtranslations.com/translate/";
    this.headers = apiKey ? {
      "X-FunTranslations-Api-Secret": apiKey
    } : {};
  }
  async request(endpoint, data) {
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}.json`, data, {
        headers: this.headers
      });
      return response.data.contents.translated;
    } catch (error) {
      console.error("FunTranslations Error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || "Translation failed.");
    }
  }
  async encodeMorse(text) {
    return await this.request("morse", {
      text: text
    });
  }
  async decodeMorse(text) {
    return await this.request("morse2english", {
      text: text
    });
  }
  async generateMorseAudio(text, speed = 5, tone = 700) {
    return await this.request("morse/audio", {
      text: text,
      speed: speed,
      tone: tone
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    text,
    speed,
    tone
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Missing text parameter."
    });
  }
  try {
    const funTrans = new FunTranslations();
    let result;
    switch (action) {
      case "enc":
        result = await funTrans.encodeMorse(text);
        break;
      case "dec":
        result = await funTrans.decodeMorse(text);
        break;
      case "sound":
        result = await funTrans.generateMorseAudio(text, speed, tone);
        break;
      default:
        return res.status(400).json({
          error: "Invalid action. Use enc, dec, or sound."
        });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}