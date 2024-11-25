import fetch from "node-fetch";

class Lazypy {
  constructor() {
    this.baseUrl = "https://lazypy.ro/tts/request_tts.php";
    this.voicesUrl = "https://lazypy.ro/tts/assets/js/voices.json";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      Referer: "https://lazypy.ro/tts/conversation.php?voices=TikTok__es_male_m3,,,",
    };
  }

  async generate({ service = "TikTok", voice = "es_male_m3", text = "Hy", voice_name = "Julio", playlist_index = 0 }) {
    const body = new URLSearchParams({
      service: service,
      voice: voice,
      text: text,
      voice_name: voice_name,
      playlist_index: playlist_index,
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`Gagal melakukan request ke Lazypy: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async voice() {
    try {
      const response = await fetch(this.voicesUrl);

      if (!response.ok) {
        throw new Error(`Gagal mengambil daftar suara: ${response.status}`);
      }

      const { StreamElements } = await response.json();

      if (StreamElements?.voices) {
        return StreamElements.voices.map(({ vid, name, flag, lang, accent, gender }) => ({
          id: vid,
          name,
          flag,
          language: lang,
          accent,
          gender,
        }));
      } else {
        throw new Error("Voices tidak ditemukan.");
      }
    } catch (error) {
      return null;
    }
  }
}

export default async function handler(req, res) {
  const { type, text, voice, voice_name, service, playlist_index } = req.query;

  if (!type || !["generate", "list"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Parameter 'type' harus diisi dengan 'generate' atau 'list'.",
    });
  }

  const lazypy = new Lazypy();

  try {
    if (type === "list") {
      const voices = await lazypy.voice();
      if (!voices) {
        throw new Error("Gagal mengambil daftar suara.");
      }
      return res.status(200).json({ success: true, data: voices });
    } else if (type === "generate") {
      if (!text) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'text' wajib diisi untuk 'generate'.",
        });
      }
      const ttsData = await lazypy.generate({
        service: service || "TikTok",
        voice: voice || "es_male_m3",
        text,
        voice_name: voice_name || "Julio",
        playlist_index: playlist_index || 0,
      });

      if (!ttsData) {
        throw new Error("Gagal membuat TTS.");
      }
      return res.status(200).json({ success: true, data: ttsData });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}