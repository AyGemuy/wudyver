import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
class Tuxpi {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      timeout: 3e4,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9",
        origin: "https://www.tuxpi.com",
        referer: "https://www.tuxpi.com/photo-effects/wanted-poster",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async _buf(input) {
    try {
      console.log("[log] Mengonversi input ke buffer...");
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const b64 = input?.includes(",") ? input.split(",")[1] : input;
      return Buffer.from(b64 || "", "base64");
    } catch (e) {
      throw new Error("Gagal memproses gambar: " + e.message);
    }
  }
  async _up(buf) {
    try {
      console.log("[log] Mengunggah gambar ke Tuxpi...");
      const form = new FormData();
      form.append("upload_mode", "7");
      form.append("sid", "");
      form.append("upload_imagefile", buf, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const {
        data
      } = await this.api.post("https://www.tuxpi.com/photo-effects/wanted-poster", form, {
        headers: form.getHeaders()
      });
      const res = typeof data === "string" ? JSON.parse(data) : data;
      const sid = res?.sid;
      if (!sid) throw new Error("Server tidak memberikan Session ID (SID) baru");
      console.log("[log] SID berhasil didapat dari upload.");
      return sid;
    } catch (e) {
      throw new Error("Gagal tahap upload: " + e.message);
    }
  }
  async _do(sid, p) {
    try {
      console.log("[log] Merender teks ke poster...");
      const form = new FormData();
      form.append("sid", sid);
      form.append("upl_nav", "1");
      form.append("efp_cropinput", "");
      form.append("efp_post_resize", "");
      form.append("efp_chir_mode", "0");
      form.append("efp_postrotate", "");
      form.append("efp_usertext", p.header || "DEAD OR ALIVE");
      form.append("efp_usertext2", p.name || "WANTED CRIMINAL");
      form.append("efp_usertext3", p.reward || "$1,000,000 REWARD");
      const {
        data
      } = await this.api.post("https://www.tuxpi.com/photo-effects/wanted-poster", form, {
        headers: form.getHeaders()
      });
      const $ = cheerio.load(data);
      const resultPath = $("#rendered-image").attr("src") || $(".photo-editor-preview").attr("src");
      return resultPath ? `https://www.tuxpi.com${resultPath}` : null;
    } catch (e) {
      throw new Error("Gagal tahap render: " + e.message);
    }
  }
  async generate({
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[log] Memulai Tuxpi Wanted Poster Generator...");
      await this.api.get("https://www.tuxpi.com/photo-effects/wanted-poster");
      const buf = await this._buf(imageUrl);
      const activeSid = await this._up(buf);
      const params = {
        header: rest.header || rest.text_1,
        name: rest.name || rest.text_2,
        reward: rest.reward || rest.text_3,
        ...rest
      };
      const result = await this._do(activeSid, params);
      if (!result) throw new Error("URL gambar hasil tidak ditemukan");
      console.log("[log] Berhasil!");
      return {
        success: true,
        result: result,
        sid: activeSid
      };
    } catch (err) {
      console.error("[error]", err?.message || "Internal Error");
      return {
        success: false,
        error: err?.message || "Unknown Error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new Tuxpi();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}