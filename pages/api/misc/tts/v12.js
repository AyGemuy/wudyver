import axios from "axios";
import * as cheerio from "cheerio";
class TextToSpeech {
  constructor() {
    this.baseUrl = "https://texttospeech.online";
    this.session = axios.create({
      headers: this.defaultHeaders()
    });
  }
  defaultHeaders() {
    return {
      "User-Agent": `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${100 + Math.random() * 30}.0.0.0 Mobile Safari/537.36`,
      "Accept-Language": "id-ID,id;q=0.9",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-platform": `"Android"`,
      "sec-ch-ua-mobile": "?1"
    };
  }
  async getSession() {
    try {
      const {
        data,
        headers
      } = await this.session.get(this.baseUrl);
      const $ = cheerio.load(data);
      const csrfToken = $("input[name=csrf_test_name]").attr("value");
      const cookies = headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";
      if (!csrfToken) throw new Error("❌ CSRF token not found");
      console.log(`✅ CSRF Token: ${csrfToken}`);
      return {
        csrfToken: csrfToken,
        cookies: cookies
      };
    } catch (error) {
      console.error("❌ Error getting session:", error.message);
      throw error;
    }
  }
  async getVoices() {
    try {
      const {
        data
      } = await this.session.get(`${this.baseUrl}/home/tryme_voice/`);
      return data.map((v, i) => ({
        index: i + 1,
        id: v.ids,
        name: v.name,
        language: v.languageCode,
        gender: v.gender,
        engine: v.engine,
        sample: `${this.baseUrl}/${v.sampleUri}`
      }));
    } catch (error) {
      console.error("❌ Error fetching voices:", error.message);
      throw error;
    }
  }
  async generateSpeech({
    text,
    model = 1
  }) {
    try {
      if (!text) throw new Error("❌ Input text is required");
      const {
        csrfToken,
        cookies
      } = await this.getSession();
      const voices = await this.getVoices();
      if (isNaN(model) || model < 1 || model > voices.length) model = 1;
      const selectedVoice = voices[model - 1];
      console.log(`🎤 Using Voice: ${selectedVoice.name} (${selectedVoice.language})`);
      const formData = new URLSearchParams({
        csrf_test_name: csrfToken,
        front_tryme_language: selectedVoice.language,
        front_tryme_voice: selectedVoice.id,
        front_tryme_text: text
      });
      const {
        data
      } = await this.session.post(`${this.baseUrl}/home/tryme_action/`, formData.toString(), {
        headers: {
          ...this.defaultHeaders(),
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: cookies
        }
      });
      if (!data?.result || !data?.tts_uri) throw new Error("❌ Speech synthesis failed");
      console.log(`✅ Speech generated: ${data.tts_uri}`);
      return {
        url: data.tts_uri,
        voice: {
          name: selectedVoice.name,
          language: selectedVoice.language,
          gender: selectedVoice.gender,
          engine: selectedVoice.engine,
          sample: selectedVoice.sample
        }
      };
    } catch (error) {
      console.error("❌ Error generating speech:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const tts = new TextToSpeech();
  try {
    switch (action) {
      case "model":
        const voices = await tts.getVoices();
        return res.status(200).json(voices);
      case "create":
        if (!params.text) return res.status(400).json({
          error: "Text is required"
        });
        const data = await tts.generateSpeech(params);
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch {
    res.status(500).json({
      error: "Error processing request"
    });
  }
}