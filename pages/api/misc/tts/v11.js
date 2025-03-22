import axios from "axios";
const supportedVoices = {
  "af-ZA": "Afrikaans",
  sq: "Albanian",
  "ar-AE": "Arabic",
  hy: "Armenian",
  "bn-BD": "Bengali (Bangladesh)",
  "bn-IN": "Bengali (India)",
  bs: "Bosnian",
  my: "Burmese (Myanmar)",
  "ca-ES": "Catalan",
  "cmn-Hant-TW": "Chinese",
  "hr-HR": "Croatian",
  "cs-CZ": "Czech",
  "da-DK": "Danish",
  "nl-NL": "Dutch",
  "en-AU": "English (Australia)",
  "en-GB": "English (United Kingdom)",
  "en-US": "English (United States)",
  eo: "Esperanto",
  et: "Estonian",
  "fil-PH": "Filipino",
  "fi-FI": "Finnish",
  "fr-FR": "French",
  "fr-CA": "French (Canada)",
  "de-DE": "German",
  "el-GR": "Greek",
  gu: "Gujarati",
  "hi-IN": "Hindi",
  "hu-HU": "Hungarian",
  "is-IS": "Icelandic",
  "id-ID": "Indonesian",
  "it-IT": "Italian",
  "ja-JP": "Japanese (Japan)",
  kn: "Kannada",
  km: "Khmer",
  "ko-KR": "Korean",
  la: "Latin",
  lv: "Latvian",
  mk: "Macedonian",
  ml: "Malayalam",
  mr: "Marathi",
  ne: "Nepali",
  "nb-NO": "Norwegian",
  "pl-PL": "Polish",
  "pt-BR": "Portuguese",
  "ro-RO": "Romanian",
  "ru-RU": "Russian",
  "sr-RS": "Serbian",
  si: "Sinhala",
  "sk-SK": "Slovak",
  "es-MX": "Spanish (Mexico)",
  "es-ES": "Spanish (Spain)",
  sw: "Swahili",
  "sv-SE": "Swedish",
  ta: "Tamil",
  te: "Telugu",
  "th-TH": "Thai",
  "tr-TR": "Turkish",
  "uk-UA": "Ukrainian",
  ur: "Urdu",
  "vi-VN": "Vietnamese",
  cy: "Welsh"
};
class TextToSpeech {
  constructor() {
    this.postUrl = "https://api.soundoftext.com/sounds";
  }
  getSupportedVoicesList() {
    return Object.entries(supportedVoices).map(([code, name]) => ({
      code: code,
      name: name
    }));
  }
  async generate({
    text,
    voice = "en-US"
  }) {
    if (!supportedVoices.hasOwnProperty(voice)) {
      return {
        success: false,
        error: "Kode voice tidak valid",
        supportedVoices: this.getSupportedVoicesList()
      };
    }
    const postPayload = {
      engine: "Google",
      data: {
        text: text,
        voice: voice
      }
    };
    try {
      const postResponse = await axios.post(this.postUrl, postPayload, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const postResult = postResponse.data;
      if (!postResult.success) {
        return {
          success: false,
          error: "Gagal membuat oi."
        };
      }
      const soundId = postResult.id;
      const getUrl = `https://api.soundoftext.com/sounds/${soundId}`;
      let locationUrl = null;
      while (true) {
        const getResponse = await axios.get(getUrl);
        const getResult = getResponse.data;
        if (getResult.status === "Done") {
          locationUrl = getResult.location;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1e3));
      }
      return {
        success: true,
        location: locationUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }
  const tts = new TextToSpeech();
  try {
    const data = await tts.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}