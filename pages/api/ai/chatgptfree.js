import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import {
  v4 as uuidv4
} from "uuid";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class AiChat {
  constructor() {
    this.jar = new CookieJar();
    this.ax = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.cfg = {};
    this.bots = {};
    this.nonce = "";
    this.postId = 6;
    this.initDone = false;
  }
  p(url) {
    return `${proxy}${url}`;
  }
  async i() {
    if (this.initDone) return;
    try {
      console.log("Fetching page");
      const res = await this.ax.get(this.p("https://chatgptfree.ai/"), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "Accept-Language": "id-ID"
        }
      });
      console.log("Parsing HTML");
      const $ = cheerio.load(res?.data || "");
      $("div.aipkit_chat_container").each((i, el) => {
        const dc = $(el).attr("data-config") || "{}";
        try {
          const c = JSON.parse(dc);
          const n = (c?.headerName || `bot${i}`).toLowerCase();
          this.bots[n] = c?.botId ?? null;
          this.cfg[n] = c;
          console.log(`Bot: ${n} id ${c?.botId ?? "none"}`);
        } catch (e) {
          console.error("Parse err:", e);
        }
      });
      this.nonce = Object.values(this.cfg)[0]?.nonce ?? "74241849bb";
      this.postId = Object.values(this.cfg)[0]?.postId ?? 6;
      if (!Object.keys(this.bots).length) {
        console.log("No bots found");
      }
      this.initDone = true;
    } catch (e) {
      console.error("Init err:", e);
      this.initDone = true;
    }
  }
  async models() {
    await this.i();
    const result = [];
    for (const [name, id] of Object.entries(this.bots)) {
      result.push({
        name: name,
        id: id
      });
    }
    return {
      result: result
    };
  }
  async chat({
    prompt,
    model = "gemini",
    imageUrl = null,
    ...rest
  }) {
    await this.i();
    model = (model || "gemini").toLowerCase();
    const bid = this.bots[model] ?? null;
    if (!bid) {
      const models = await this.models();
      console.log(`Model "${model}" not found. Available models:`);
      for (const m of models.result) {
        console.log(`- ${m.name} (ID: ${m.id})`);
      }
      return {
        error: `Model "${model}" not found`,
        available: models
      };
    }
    const sid = rest?.sessionId ?? uuidv4();
    const cid = rest?.convUuid ?? uuidv4();
    const ws = rest?.webSearch ?? true;
    try {
      console.log(`Chat start: ${model}, prompt "${prompt}"`);
      const fd = new FormData();
      fd.append("action", "aipkit_frontend_chat_message");
      fd.append("_ajax_nonce", this.nonce);
      fd.append("bot_id", bid);
      fd.append("session_id", sid);
      fd.append("conversation_uuid", cid);
      fd.append("post_id", this.postId);
      fd.append("frontend_web_search_active", ws ? "true" : "false");
      fd.append("message", prompt);
      if (imageUrl) {
        const images = [];
        const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        for (const img of urls) {
          let base64;
          if (typeof img === "string") {
            if (img.startsWith("http")) {
              const res = await this.ax.get(img, {
                responseType: "arraybuffer"
              });
              base64 = Buffer.from(res.data).toString("base64");
            } else if (img.startsWith("data:")) {
              base64 = img.split(",")[1];
            } else {
              base64 = img;
            }
          } else if (Buffer.isBuffer(img)) {
            base64 = img.toString("base64");
          } else {
            continue;
          }
          images.push({
            mime_type: "image/jpeg",
            base64_data: base64
          });
        }
        if (images.length) {
          fd.append("image_inputs", JSON.stringify(images));
        }
      }
      const hd = {
        ...fd.getHeaders(),
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://chatgptfree.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://chatgptfree.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      const res = await this.ax.post(this.p("https://chatgptfree.ai/wp-admin/admin-ajax.php"), fd, {
        headers: hd
      });
      console.log("Chat done");
      return res?.data ?? {
        error: "No data"
      };
    } catch (e) {
      console.error("Chat err:", e);
      return {
        error: e?.message || "Fail"
      };
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AiChat();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "models":
        response = await api.models();
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'chat' dan 'models'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}