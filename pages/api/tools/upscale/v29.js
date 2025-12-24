import axios from "axios";
class PhotoEnhancer {
  constructor() {
    this.cfg = {
      base: "https://photoenhancer.pro",
      end: {
        enhance: "/api/enhance",
        status: "/api/status",
        removeBg: "/api/remove-background",
        changeBg: "/api/change-background",
        removeObj: "/api/remove-object",
        upscale: "/api/upscale"
      },
      modes: ["fast", "ultra", "restore"],
      types: ["enhance", "remove-bg", "change-bg", "remove-obj", "upscale"],
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        cookie: "NEXT_LOCALE=en; guest_usage_count=2",
        origin: "https://photoenhancer.pro",
        pragma: "no-cache",
        referer: "https://photoenhancer.pro/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  log(m) {
    console.log(`[PROCESS] ${new Date().toLocaleTimeString()} | ${m}`);
  }
  wait(ms) {
    return new Promise(r => setTimeout(r, ms || 5e3));
  }
  chk(v, list, key) {
    return v && !list.includes(v) ? {
      success: false,
      message: `Invalid ${key}: '${v}'. Pilih: ${list.join(", ")}`
    } : null;
  }
  async img(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) return `data:image/jpeg;base64,${input.toString("base64")}`;
      if (typeof input === "string" && input.startsWith("http")) {
        const r = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return `data:${r.headers["content-type"]};base64,${Buffer.from(r.data).toString("base64")}`;
      }
      return input;
    } catch (e) {
      throw new Error(`Gagal memproses gambar: ${e.message}`);
    }
  }
  async poll(id) {
    let i = 0;
    while (i < 60) {
      i++;
      await this.wait(3e3);
      this.log(`Pengecekan status ke-${i} untuk ID: ${id.slice(0, 8)}...`);
      try {
        const {
          data
        } = await axios.get(`${this.cfg.base}${this.cfg.end.status}`, {
          params: {
            id: id
          },
          headers: this.cfg.headers
        });
        if (data?.status === "succeeded") {
          const {
            resultUrl,
            ...info
          } = data;
          return {
            result: resultUrl,
            ...info
          };
        }
        if (data?.status === "failed") throw new Error(data?.error || "Server error");
      } catch (e) {
        this.log(`Poll error: ${e.message}`);
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    prompt,
    imageUrl,
    mode,
    type,
    ...rest
  }) {
    try {
      const t = type || "enhance";
      const m = mode || "ultra";
      const vT = this.chk(t, this.cfg.types, "type");
      if (vT) return vT;
      const vM = this.chk(m, this.cfg.modes, "mode");
      if (vM) return vM;
      if (t === "change-bg" && (!imageUrl || !prompt)) return {
        success: false,
        message: "Fitur 'change-bg' wajib menyertakan 'imageUrl' DAN 'prompt'."
      };
      if (t === "remove-obj" && (!imageUrl || !rest?.mask)) return {
        success: false,
        message: "Fitur 'remove-obj' wajib menyertakan 'imageUrl' DAN 'mask'."
      };
      if (t === "enhance" && !imageUrl && !prompt) return {
        success: false,
        message: "Fitur 'enhance' butuh 'imageUrl' (img2img) atau 'prompt' (txt2img)."
      };
      this.log(`Menjalankan fitur: ${t}`);
      const dataImg = await this.img(imageUrl);
      let body = {};
      let endpoint = this.cfg.end[t] || this.cfg.end.enhance;
      switch (t) {
        case "upscale":
          body = {
            imageData: dataImg,
            targetResolution: rest?.res || "4K"
          };
          break;
        case "remove-bg":
          body = {
            imageData: dataImg
          };
          break;
        case "change-bg":
          body = {
            imageData: dataImg,
            backgroundPrompt: prompt
          };
          break;
        case "remove-obj":
          body = {
            imageData: dataImg,
            maskData: await this.img(rest.mask)
          };
          break;
        default:
          body = dataImg ? {
            imageData: dataImg,
            mode: m,
            params: {
              mode: m
            },
            fileName: rest?.fileName || "image.png"
          } : {
            prompt: prompt,
            mode: m
          };
      }
      const {
        data: init
      } = await axios.post(`${this.cfg.base}${endpoint}`, body, {
        headers: this.cfg.headers
      });
      if (init?.predictionId) {
        this.log(`ID Diterima: ${init.predictionId}`);
        const final = await this.poll(init.predictionId);
        const {
          result,
          ...info
        } = final;
        return {
          result: result,
          ...init,
          ...info
        };
      }
      const {
        resultUrl,
        ...resInfo
      } = init;
      return {
        result: resultUrl || null,
        ...resInfo
      };
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        success: false,
        message: e?.response?.data?.message || e.message
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
  const api = new PhotoEnhancer();
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