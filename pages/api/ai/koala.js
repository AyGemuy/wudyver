import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const genVid = () => Array.from({
  length: 16
}, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 62))).join("");
class KoalaClient {
  constructor() {
    this.base = "https://koala.sh/api/";
    this.ep = {
      chat: "gpt/",
      img: "image-generation/"
    };
    this.def = {
      action: "chat",
      chat: "gpt-5",
      img: "standard",
      style: "none",
      size: "1024x1024",
      enh: "on",
      num: 1
    };
    this.actions = ["chat", "image"];
    this.styles = ["none", "illustration", "photo", "watercolor", "fantasy", "anime", "3d", "isometric"];
    this.imgMods = ["standard", "premium", "ideogram-3.0-turbo", "gpt-image-1-medium", "gpt-image-1-high"];
    this.chatMods = ["gpt-5", "claude-4-sonnet"];
    this.ratios = Object.entries({
      "1:1": {
        w: 1024,
        h: 1024,
        l: "1:1 Ratio (Square)",
        r: "1:1"
      },
      "5:4": {
        w: 1152,
        h: 896,
        l: "5:4 Ratio",
        r: "5:4"
      },
      "3:2": {
        w: 1216,
        h: 832,
        l: "3:2 Ratio (Landscape)",
        r: "3:2"
      },
      "16:9": {
        w: 1344,
        h: 768,
        l: "16:9 Ratio",
        r: "16:9"
      },
      "21:9": {
        w: 1536,
        h: 640,
        l: "21:9 Ratio",
        r: "21:9"
      },
      "9:21": {
        w: 640,
        h: 1536,
        l: "9:21 Ratio",
        r: "9:21"
      },
      "9:16": {
        w: 768,
        h: 1344,
        l: "9:16 Ratio",
        r: "9:16"
      },
      "2:3": {
        w: 832,
        h: 1216,
        l: "2:3 Ratio (Portrait)",
        r: "2:3"
      },
      "4:5": {
        w: 896,
        h: 1152,
        l: "4:5 Ratio",
        r: "4:5"
      }
    }).map(([k, v]) => ({
      v: `${v.w}x${v.h}`,
      l: v.l,
      r: k
    }));
    this.defRatio = this.ratios.find(r => r.r === "1:1")?.v ?? "1024x1024";
  }
  getOptions() {
    return {
      actions: this.actions,
      styles: this.styles,
      ratios: this.ratios.map(r => ({
        ratio: r.r,
        size: r.v,
        label: r.l
      })),
      chatModels: this.chatMods,
      imageModels: this.imgMods,
      defaults: this.def
    };
  }
  v({
    a,
    p
  }) {
    console.log("Validating...");
    if (!p?.trim()) {
      console.log("No prompt → return options list");
      return JSON.stringify(this.getOptions(), null, 2);
    }
    if (!this.actions.includes(a)) {
      console.log(`Invalid action "${a}" → return options list`);
      return JSON.stringify({
        error: `Invalid action: "${a}". Valid actions: ${this.actions.join(", ")}`,
        ...this.getOptions()
      }, null, 2);
    }
    console.log("Validation OK");
    return null;
  }
  hdr(isChat = false) {
    const vid = genVid();
    console.log("visitor-id →", vid);
    return {
      accept: isChat ? "text/event-stream" : "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://koala.sh",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: isChat ? "https://koala.sh/chat?utm_source=thatsmyai&utm_medium=cpc&utm_campaign=reftraffic&utm_id=ThatsMyAI" : "https://koala.sh/images",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "visitor-id": vid,
      ...SpoofHead()
    };
  }
  async generate({
    action,
    prompt: p,
    ...r
  }) {
    try {
      const a = action ?? this.def.action;
      console.log(`Start ${a}`);
      const bad = this.v({
        a: a,
        p: p
      });
      if (bad) return bad;
      const chat = a === "chat";
      const url = this.base + (chat ? this.ep.chat : this.ep.img);
      let body = {
        ...r
      };
      if (chat) {
        const m = r.model ?? this.def.chat;
        if (!this.chatMods.includes(m)) throw new Error(`Bad model ${m}`);
        body = {
          input: p,
          inputHistory: [],
          outputHistory: [],
          model: m,
          ...r
        };
      } else {
        const m = r.model ?? this.def.img;
        if (!this.imgMods.includes(m)) throw new Error(`Bad img model ${m}`);
        const s = r.style ?? this.def.style;
        if (!this.styles.includes(s)) throw new Error(`Bad style ${s}`);
        body = {
          model: m,
          prompt: p,
          style: s,
          size: r.size ?? this.defRatio,
          enhancePrompt: r.enhancePrompt ?? this.def.enh,
          numImages: r.numImages ?? this.def.num,
          ...r
        };
      }
      console.log("POST →", url);
      console.log("Headers →", this.hdr(chat));
      console.log("Body →", body);
      const res = await axios.post(url, body, {
        headers: this.hdr(chat),
        responseType: chat ? "stream" : "json"
      });
      console.log("Response OK");
      if (!chat) {
        console.log("Image result →", res.data);
        return res.data;
      }
      console.log("Streaming SSE...");
      const parts = [];
      return new Promise((resolve, reject) => {
        res.data.on("data", raw => {
          const txt = raw.toString();
          console.log("Chunk →", txt.trim());
          const lines = txt.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr && jsonStr !== "[DONE]") {
                try {
                  const parsed = JSON.parse(jsonStr);
                  parts.push(parsed);
                } catch (e) {
                  parts.push(jsonStr);
                }
              }
            }
          }
        });
        res.data.on("end", () => {
          const result = parts.join("");
          console.log("Stream ended. Final result →", result);
          resolve({
            result: result
          });
        });
        res.data.on("error", err => {
          console.log("Stream error →", err.message);
          reject(err);
        });
      });
    } catch (e) {
      console.log("Failed →", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new KoalaClient();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}