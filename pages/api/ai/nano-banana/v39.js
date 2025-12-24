import axios from "axios";
import ApiKey from "@/configs/api-key";
class NanoBanana {
  constructor() {
    this.key = ApiKey.replicate;
    this.url = "https://api.replicate.com/v1/predictions";
    this.map = {
      0: "o",
      1: "i",
      3: "e",
      4: "a",
      5: "s",
      7: "t",
      "@": "a",
      $: "s"
    };
    this.bad = ["nsfw", "porn", "hentai", "xxx", "sex", "nude", "lewd", "fetish", "bdsm", "anal", "oral", "cum", "fuck", "dick", "cock", "pussy", "vagina", "rape", "child"];
  }
  nrm(t) {
    let s = (t || "").toLowerCase();
    for (let k in this.map) s = s.split(k).join(this.map[k]);
    return s.replace(/[^a-z]+/g, " ").trim();
  }
  chk(p) {
    const n = this.nrm(p);
    for (const w of this.bad) {
      const r = new RegExp(`\\b${w.split("").join("[^a-z]*")}\\b`, "i");
      if (n.match(r)) return {
        ok: false,
        w: w
      };
    }
    return {
      ok: true
    };
  }
  async b64(src) {
    try {
      console.log("[Nano] Conv img -> base64...");
      let d = "",
        m = "image/png";
      if (Buffer.isBuffer(src)) {
        d = src.toString("base64");
      } else if (typeof src === "string") {
        if (src.startsWith("http")) {
          const r = await axios.get(src, {
            responseType: "arraybuffer"
          });
          d = Buffer.from(r.data).toString("base64");
          m = r.headers["content-type"] || m;
        } else if (src.startsWith("data:")) return src;
        else d = src;
      }
      return `data:${m};base64,${d}`;
    } catch (e) {
      console.log(`[Nano] Img Err: ${e.message}`);
      return null;
    }
  }
  async generate({
    prompt: p,
    imageUrl: i,
    ...xtra
  }) {
    console.log(`[Nano] Proc: "${(p || "").substring(0, 40)}..."`);
    const s = this.chk(p);
    if (!s.ok) throw new Error(`Unsafe prompt detected: "${s.w}"`);
    const list = i ? Array.isArray(i) ? i : [i] : [];
    const imgs = [];
    for (const item of list) {
      const res = await this.b64(item);
      if (res) imgs.push(res);
    }
    const input = {
      prompt: p,
      ...xtra
    };
    if (imgs.length) input.image_input = imgs;
    const body = {
      version: "google/nano-banana",
      input: input
    };
    let lastError = null;
    for (const apiKey of this.key) {
      try {
        console.log(`[Nano] Trying Key ending with ...${apiKey.slice(-5)}`);
        const head = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Prefer: "wait"
        };
        console.log(`[Nano] POST ${this.url}`);
        const res = await axios.post(this.url, body, {
          headers: head
        });
        const code = res?.status || 0;
        console.log(`[Nano] Status: ${code}`);
        if (code >= 200 && code < 300) {
          const d = res.data;
          if (d?.status === "failed") {
            throw new Error(d.error || "API returned status failed");
          }
          return d;
        } else {
          throw new Error(`HTTP Status ${code}`);
        }
      } catch (e) {
        const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
        console.error(`[Nano] Key Failed: ${msg}`);
        lastError = e;
        continue;
      }
    }
    console.error("[Nano] All keys exhausted.");
    throw lastError || new Error("All API keys failed to generate image.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(503).json({
      error: errorMessage
    });
  }
}