import axios from "axios";
import {
  createHash,
  randomUUID,
  randomBytes
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class Translapp {
  constructor() {
    this.api = {
      base: "https://translapp.info",
      endpoint: "/ai/g/ask"
    };
    this.baseUrl = "https://translapp.info";
    this.actions = ["SUMMARIZE", "PARAPHRASE", "EXPAND", "TONE", "TRANSLATE", "REPLY", "GRAMMAR"];
    this.tones = ["Friendly", "Romantic", "Sarcastic", "Humour", "Social", "Angry", "Sad", "Other"];
    this.replies = ["Short", "Medium", "Long"];
  }
  _sh(i) {
    return i.length >= 5 ? i.substring(0, 5) : "O".repeat(5 - i.length) + i;
  }
  _hs(s) {
    return createHash("sha256").update(s, "utf8").digest("hex");
  }
  _rbs(l) {
    return randomBytes(Math.ceil(l / 2)).toString("hex").slice(0, l);
  }
  _re(a) {
    return a[Math.floor(Math.random() * a.length)];
  }
  _rgua() {
    const os = this._re(["Windows NT 10.0", "Macintosh; Intel Mac OS X 10_15_7", "Linux; Android 10", "iPhone; CPU iPhone OS 15_4"]);
    const browser = this._re(["Chrome", "Firefox", "Safari", "Opera"]);
    const version = `${Math.floor(Math.random() * 100)}.${this._rbs(3)}.4896.${this._rbs(3)}`;
    const webkit = this._re(["AppleWebKit/537.36", "AppleWebKit/605.1.15"]);
    const gecko = this._re(["KHTML, like Gecko", "Gecko/20100101"]);
    return `Mozilla/5.0 (${os}) ${webkit} (${gecko}) ${browser}/${version}`;
  }
  _rgal() {
    const mainLang = this._re(["en-US", "id", "es", "fr", "de", "ja", "zh"]);
    const qValue = (Math.random() * .9).toFixed(1);
    return `${mainLang},en;q=${qValue}`;
  }
  _rcip() {
    return Array.from(randomBytes(4)).map(b => b % 256).join(".");
  }
  _rID(l = 16) {
    return randomBytes(l).toString("hex");
  }
  _bH(e = {}) {
    return {
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": this._rgua(),
      "content-type": "application/json",
      "accept-language": this._rgal(),
      "x-request-id": this._rID(8),
      ...SpoofHead(),
      ...e
    };
  }
  async translate({
    text = "Hello",
    action = "TRANSLATE",
    to = "id",
    tone = "Other"
  }) {
    if (!text || typeof text !== "string" || text.trim() === "") {
      return {
        success: false,
        code: 400,
        result: {
          error: "Teks wajib diisi bree, kagak boleh kosong 🫵🏻"
        }
      };
    }
    const pA = action.toUpperCase();
    if (!this.actions.includes(pA)) {
      return {
        success: false,
        code: 400,
        result: {
          error: `Aksi wajib diisi bree, pilih salah satu yak: ${this.actions.join(", ")} 🗿`
        }
      };
    }
    switch (pA) {
      case "TONE":
        if (!this.tones.includes(to)) return {
          success: false,
          code: 400,
          result: {
            error: `Paramenter 'to' untuk TONE wajib diisi, pilih salah satu bree: ${this.tones.join(", ")} 🙈️`
          }
        };
        if (to === "Other" && (!tone || tone.trim() === "")) return {
          success: false,
          code: 400,
          result: {
            error: "Kalo TONE pilih Other, 'tone' wajib diisi (contoh: 'Shy') 😳"
          }
        };
        break;
      case "TRANSLATE":
        if (!to || typeof to !== "string" || to.trim() === "") return {
          success: false,
          code: 400,
          result: {
            error: "Paramenter 'to' untuk TRANSLATE wajib diisi, input bahasa targetnya (contoh: 'English') 🙈️"
          }
        };
        break;
      case "REPLY":
        if (!this.replies.includes(to)) return {
          success: false,
          code: 400,
          result: {
            error: `Paramenter 'to' untuk REPLY wajib diisi, pilih salah satu bree: ${this.replies.join(", ")} 🙈️`
          }
        };
        break;
    }
    try {
      const inputx = this._sh(text);
      const prefix = `${inputx}ZERO`;
      const key = this._hs(prefix);
      const userId = `GALAXY_AI${randomUUID()}`;
      const toValue = pA === "TONE" && to === "Other" ? tone : to;
      const payload = {
        k: key,
        module: pA,
        text: text,
        to: toValue,
        userId: userId
      };
      const headers = this._bH();
      const response = await axios.post(`${this.api.base}${this.api.endpoint}`, payload, {
        headers: headers
      });
      const {
        data
      } = response;
      return {
        success: true,
        code: 200,
        result: {
          action: pA,
          input: text,
          to: toValue,
          output: data.message
        }
      };
    } catch (error) {
      return {
        success: false,
        code: error.response?.status || 500,
        result: {
          error: error.response?.data?.message || error.message || "Error bree.."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text are required"
    });
  }
  try {
    const translapp = new Translapp();
    const response = await translapp.translate(params);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}