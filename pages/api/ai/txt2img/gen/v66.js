import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AIImageGen {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  async init() {
    try {
      console.log("Proses: Inisialisasi cookie...");
      const {
        data
      } = await this.client.get("https://imageupscaler.com/ai-image-generator/", {
        headers: {
          "user-agent": this.ua,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          referer: "https://www.google.com/"
        }
      });
      const $ = cheerio.load(data);
      const nonce = $("#process_nonce")?.val() || "";
      console.log("Proses: Nonce berhasil didapat");
      return nonce;
    } catch (e) {
      console.log("Error init:", e?.message || e);
      throw e;
    }
  }
  async generate({
    prompt,
    style = "Photo",
    ...rest
  }) {
    try {
      const nonce = await this.init();
      console.log("Proses: Mengirim request generate...");
      const params = {
        "image-type": style,
        "own-variant": "",
        "save-format": "auto",
        ...rest
      };
      const {
        data
      } = await this.client.post("https://imageupscaler.com/wp-admin/admin-ajax.php", new URLSearchParams({
        action: "processing_text_adv",
        nonce: nonce,
        function: "ai-image-generator",
        mediaData: prompt,
        parameters: JSON.stringify(params)
      }), {
        headers: {
          "user-agent": this.ua,
          "content-type": "application/x-www-form-urlencoded",
          referer: "https://imageupscaler.com/ai-image-generator/",
          origin: "https://imageupscaler.com"
        }
      });
      const $ = cheerio.load(data);
      const img = $(".processed-image")?.attr("src") || null;
      const dl = $(".result__compiled-btns a[download]")?.attr("href") || img;
      const txt = $(".block-before p")?.text()?.trim() || prompt;
      console.log("Proses: Generate selesai");
      return {
        success: !!img,
        prompt: txt,
        style: style,
        image: img,
        download: dl
      };
    } catch (e) {
      console.log("Error generate:", e?.message || e);
      return {
        success: false,
        error: e?.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AIImageGen();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}