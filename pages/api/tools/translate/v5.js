import axios from "axios";
import * as cheerio from "cheerio";
class Transcat {
  constructor() {
    this.languages = {
      af: "Afrikaans",
      sq: "Albanian",
      am: "Amharic",
      ar: "Arabic",
      hy: "Armenian",
      az: "Azerbaijani",
      eu: "Basque",
      be: "Belarusian",
      bn: "Bengali",
      bs: "Bosnian",
      bg: "Bulgarian",
      ca: "Catalan",
      ceb: "Cebuano",
      zh: "Chinese",
      "zh-TW": "Chinese (Traditional)",
      co: "Corsican",
      hr: "Croatian",
      cs: "Czech",
      da: "Danish",
      nl: "Dutch",
      en: "English",
      eo: "Esperanto",
      et: "Estonian",
      fi: "Finnish",
      fr: "French",
      fy: "Frisian",
      gl: "Galician",
      ka: "Georgian",
      de: "German",
      el: "Greek",
      gu: "Gujarati",
      ht: "Haitian Creole",
      ha: "Hausa",
      haw: "Hawaiian",
      he: "Hebrew",
      hi: "Hindi",
      hmn: "Hmong",
      hu: "Hungarian",
      is: "Icelandic",
      ig: "Igbo",
      id: "Indonesian",
      ga: "Irish",
      it: "Italian",
      ja: "Japanese",
      jw: "Javanese",
      kn: "Kannada",
      kk: "Kazakh",
      km: "Khmer",
      ko: "Korean",
      ku: "Kurdish",
      ky: "Kyrgyz",
      lo: "Lao",
      la: "Latin",
      lv: "Latvian",
      lt: "Lithuanian",
      lb: "Luxembourgish",
      mk: "Macedonian",
      mg: "Malagasy",
      ms: "Malay",
      ml: "Malayalam",
      mt: "Maltese",
      mi: "Maori",
      mr: "Marathi",
      mn: "Mongolian",
      my: "Myanmar (Burmese)",
      ne: "Nepali",
      no: "Norwegian",
      ny: "Nyanja (Chichewa)",
      ps: "Pashto",
      fa: "Persian",
      pl: "Polish",
      pt: "Portuguese",
      pa: "Punjabi",
      ro: "Romanian",
      ru: "Russian",
      sm: "Samoan",
      gd: "Scots Gaelic",
      sr: "Serbian",
      st: "Sesotho",
      sn: "Shona",
      sd: "Sindhi",
      si: "Sinhala (Sinhalese)",
      sk: "Slovak",
      sl: "Slovenian",
      so: "Somali",
      es: "Spanish",
      su: "Sundanese",
      sw: "Swahili",
      sv: "Swedish",
      tl: "Tagalog (Filipino)",
      tg: "Tajik",
      ta: "Tamil",
      te: "Telugu",
      th: "Thai",
      tr: "Turkish",
      uk: "Ukrainian",
      ur: "Urdu",
      uz: "Uzbek",
      vi: "Vietnamese",
      cy: "Welsh",
      xh: "Xhosa",
      yi: "Yiddish",
      yo: "Yoruba",
      zu: "Zulu"
    };
  }
  async check(text, sourceLang = "auto", targetLang = "en") {
    const input = () => {
      if (!text) throw new Error("Teks nya mana? masa iya mau translate kagak ada teks nya 😬");
      if (!this.languages[sourceLang] && sourceLang !== "auto") throw new Error(`Source Language "${sourceLang}" nya kagak ada, coba cek lagi dah 😂`);
      if (!this.languages[targetLang]) throw new Error(`Target Language "${targetLang}" nya kagak ada, coba cek lagi dah 😂`);
    };
    try {
      input();
      const tokens = async () => {
        const response = await axios.get("https://www.translatecat.com/");
        const $ = cheerio.load(response.data);
        return {
          token: $('input[name="_token"]').val(),
          cookies: response.headers["set-cookie"]
        };
      };
      const {
        token,
        cookies
      } = await tokens();
      const response = await axios.post("https://www.translatecat.com/", `content=${encodeURIComponent(text)}&source=${sourceLang}&target=${targetLang}&_token=${token}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://www.translatecat.com/",
          Referer: "https://www.translatecat.com/",
          "User-Agent": "Postify/1.0.0",
          Cookie: cookies.join("; ")
        }
      });
      const $ = cheerio.load(response.data);
      const result = $(".card-text").text().trim();
      if (!result) throw new Error("Gagal bree, nanti lagi aja translate nya 😂");
      return {
        original: text,
        translated: result,
        sourceLang: this.languages[sourceLang] || "Auto Detect",
        targetLang: this.languages[targetLang]
      };
    } catch (error) {
      console.error(error);
      throw new Error("Dahlah capek 😮‍💨");
    }
  }
  getLangs() {
    return this.languages;
  }
}
export default async function handler(req, res) {
  const {
    action,
    text,
    sourceLang,
    targetLang
  } = req.query;
  try {
    const transcat = new Transcat();
    switch (action) {
      case "check":
        if (!text) {
          return res.status(400).json({
            success: false,
            error: "Teks diperlukan untuk terjemahan."
          });
        }
        const translation = await transcat.check(text, sourceLang, targetLang);
        return res.status(200).json({
          success: true,
          translation: translation
        });
      case "langs":
        const langs = transcat.getLangs();
        return res.status(200).json({
          success: true,
          langs: langs
        });
      default:
        return res.status(400).json({
          success: false,
          error: "Aksi tidak valid."
        });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}