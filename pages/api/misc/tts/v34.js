import axios from "axios";
class ReadAloudTTS {
  constructor() {
    this.baseUrl = "https://support.readaloud.app";
    this.voiceListUrl = `${this.baseUrl}/read-aloud/list-voices/premium`;
    this.createPartsUrl = `${this.baseUrl}/ttstool/createParts`;
    this.getPartsUrl = `${this.baseUrl}/ttstool/getParts`;
    this.voiceCache = [];
  }
  async voice_list() {
    console.log(`[ReadAloudTTS] Mengambil daftar suara dari server...`);
    const config = {
      method: "get",
      url: this.voiceListUrl,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "id-ID",
        Origin: "https://ttstool.com",
        Referer: "https://ttstool.com/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
    try {
      const response = await axios(config);
      this.voiceCache = response.data;
      console.log(`[ReadAloudTTS] Sukses mengambil ${response.data.length} suara.`);
      return response.data;
    } catch (error) {
      console.error(`[ReadAloudTTS] Gagal mengambil daftar suara: ${error.message}`);
      throw error;
    }
  }
  async _findVoice(voiceInput) {
    if (!voiceInput) {
      return "Microsoft Indonesian (Andika)";
    }
    if (this.voiceCache.length === 0) {
      try {
        await this.voice_list();
      } catch (e) {
        console.warn("[ReadAloudTTS] Gagal fetch voice_list voice, menggunakan input mentah.");
        return voiceInput;
      }
    }
    const indexNum = parseInt(voiceInput);
    if (!isNaN(indexNum) && indexNum >= 0 && indexNum < this.voiceCache.length) {
      console.log(`[ReadAloudTTS] Voice ditemukan via index ${indexNum}: "${this.voiceCache[indexNum].voiceName}"`);
      return this.voiceCache[indexNum].voiceName;
    }
    const inputLower = voiceInput.toLowerCase().trim();
    const foundVoice = this.voiceCache.find(v => {
      return v.voiceName && v.voiceName.toLowerCase().includes(inputLower);
    });
    if (foundVoice) {
      console.log(`[ReadAloudTTS] Voice ditemukan: "${voiceInput}" -> "${foundVoice.voiceName}"`);
      return foundVoice.voiceName;
    }
    console.warn(`[ReadAloudTTS] Voice "${voiceInput}" tidak ditemukan. Menggunakan raw input.`);
    return voiceInput;
  }
  createSSML(text, lang = "id-ID") {
    return `<speak version="1.0" xml:lang="${lang}">${text}</speak>`;
  }
  async generate({
    text,
    voice,
    lang
  }) {
    if (!text) {
      throw new Error("Parameter 'text' wajib diisi.");
    }
    const selectedVoice = await this._findVoice(voice);
    const selectedLang = lang || "id-ID";
    console.log(`[ReadAloudTTS] generate Audio... Voice: ${selectedVoice}`);
    const ssml = this.createSSML(text, selectedLang);
    const payload = [{
      voiceId: selectedVoice,
      ssml: ssml
    }];
    try {
      const createResponse = await axios({
        method: "post",
        url: this.createPartsUrl,
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          "Content-Type": "application/json",
          Origin: "https://ttstool.com",
          Referer: "https://ttstool.com/",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        data: payload
      });
      const partId = createResponse.data[0];
      if (!partId) {
        throw new Error("Gagal mendapatkan part ID dari server.");
      }
      console.log(`[ReadAloudTTS] Part ID: ${partId}`);
      const audioUrl = `${this.getPartsUrl}?q=${partId}`;
      return {
        success: true,
        voice: selectedVoice,
        partId: partId,
        audioUrl: audioUrl
      };
    } catch (error) {
      console.error(`[ReadAloudTTS] Gagal membuat audio: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ReadAloudTTS();
  try {
    let response;
    switch (action) {
      case "voice_list":
        response = await api.voice_list();
        return res.status(200).json({
          success: true,
          count: response.length,
          voices: response
        });
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Parameter 'text' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'voice_list', 'generate'.`
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}