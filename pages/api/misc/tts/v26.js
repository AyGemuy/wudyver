import https from "https";
import axios from "axios";
import FormData from "form-data";
class AnyVoiceLab {
  constructor({
    initialCookie
  } = {}) {
    this.httpsAgent = new https.Agent({
      keepAlive: true
    });
    this.cookies = initialCookie || null;
    this.api = axios.create({
      baseURL: "https://anyvoicelab.com",
      httpsAgent: this.httpsAgent,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://anyvoicelab.com",
        priority: "u=1, i",
        referer: "https://anyvoicelab.com/long-form-text-to-speech-converter/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    });
    this.api.interceptors.response.use(response => {
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map(cookie => cookie.split(";")[0]).join("; ");
        console.log(`[Interceptor] Cookie diperbarui: ${this.cookies}`);
      }
      return response;
    }, error => Promise.reject(error));
    this.api.interceptors.request.use(config => {
      if (this.cookies) {
        config.headers["Cookie"] = this.cookies;
      }
      return config;
    }, error => Promise.reject(error));
    console.log("AnyVoiceLab client initialized.");
  }
  _generateNonce(length = 10) {
    let result = "";
    const characters = "0123456789abcdef";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  async voice_list({
    language = "en",
    paged = 1,
    items_per_page = 20,
    search_query = "",
    voice_type = "standard"
  } = {}) {
    console.log("Proses: Memulai pengambilan daftar suara...");
    try {
      const form = new FormData();
      form.append("action", "search_tts_voices");
      form.append("tts_voice_search_nonce", this._generateNonce(10));
      form.append("search_query", search_query);
      form.append("voice_type", voice_type);
      form.append("paged", paged);
      form.append("items_per_page", items_per_page);
      form.append("language", language);
      const response = await this.api.post("/wp-admin/admin-ajax.php", form, {
        headers: form.getHeaders()
      });
      console.log("Proses: Berhasil mendapatkan daftar suara.");
      return response?.data;
    } catch (error) {
      console.error("Error saat mengambil daftar suara:", error.message);
      throw error;
    }
  }
  async generate({
    text,
    voice_id = "656115",
    language = "en",
    voice_index = 0
  }) {
    console.log(`Proses: Memulai pembuatan audio untuk voice_id: ${voice_id}...`);
    if (!text || !voice_id) {
      throw new Error('Paramenter "text" dan "voice_id" wajib diisi.');
    }
    try {
      const form = new FormData();
      form.append("tts_voice_nonce", this._generateNonce(10));
      form.append("text_to_convert", text);
      form.append("tts_voice_id", voice_id);
      form.append("voice_index", voice_index);
      form.append("language", language);
      form.append("action", "long_form_tts_voice_chunk_convert");
      const response = await this.api.post("/wp-admin/admin-ajax.php", form, {
        headers: form.getHeaders()
      });
      console.log("Proses: Berhasil menghasilkan audio.");
      return response?.data;
    } catch (error) {
      console.error("Error saat menghasilkan audio:", error.message);
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
      error: "Missing required field: action",
      required: {
        action: "generate | voice_list"
      }
    });
  }
  const mic = new AnyVoiceLab();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      case "voice_list":
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: generate | voice_list`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}