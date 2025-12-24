import axios from "axios";
class AIStudio {
  constructor() {
    this.cfg = {
      base: "https://ai-studio.anisaofc.my.id",
      end: {
        edit: "/api/edit-image",
        chat: "/api/chat"
      },
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://ai-studio.anisaofc.my.id",
        referer: "https://ai-studio.anisaofc.my.id/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      def: {
        mode: "chat",
        userId: `user_${Math.random().toString(36).slice(7)}`
      }
    };
  }
  log(m) {
    console.log(`[AI-STUDIO] ${new Date().toLocaleTimeString()} | ${m}`);
  }
  async toB64(input) {
    if (!input) return null;
    try {
      let b64 = "";
      if (Buffer.isBuffer(input)) {
        b64 = input.toString("base64");
      } else if (typeof input === "string" && input.startsWith("http")) {
        this.log("Downloading image...");
        const r = await axios.get(input, {
          responseType: "arraybuffer"
        });
        b64 = Buffer.from(r.data).toString("base64");
      } else {
        b64 = input.replace(/^data:image\/\w+;base64,/, "");
      }
      return b64;
    } catch (e) {
      throw new Error(`Gagal proses gambar: ${e.message}`);
    }
  }
  async generate({
    prompt,
    imageUrl,
    mode,
    ...rest
  }) {
    try {
      const m = mode || this.cfg.def.mode;
      const p = prompt || rest?.message;
      if (!p) {
        return {
          success: false,
          message: "Prompt/Message wajib diisi untuk semua mode."
        };
      }
      if (m === "edit" && !imageUrl) {
        return {
          success: false,
          message: "Mode 'edit' memerlukan 'imageUrl' (gambar yang ingin diedit)."
        };
      }
      this.log(`Proses dimulai [Mode: ${m}]`);
      const dataImg = await this.toB64(imageUrl);
      const endpoint = this.cfg.end[m] || this.cfg.end.chat;
      const body = m === "edit" ? {
        image: dataImg,
        prompt: p
      } : {
        message: p,
        userId: rest?.userId || this.cfg.def.userId,
        image: dataImg || null
      };
      this.log(`Mengirim request ke ${endpoint}...`);
      const {
        data
      } = await axios.post(`${this.cfg.base}${endpoint}`, body, {
        headers: this.cfg.headers
      });
      return data;
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return {
        success: false,
        message: e?.response?.data?.message || e.message,
        result: null
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
  const api = new AIStudio();
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