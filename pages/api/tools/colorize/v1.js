import axios from "axios";
import FormData from "form-data";
class ImageColorizer {
  constructor() {
    this.cfg = {
      upUrl: "https://photoai.imglarger.com/api/PhoAi/Upload",
      ckUrl: "https://photoai.imglarger.com/api/PhoAi/CheckStatus",
      hdrs: {
        accept: "application/json, text/plain, */*",
        origin: "https://imagecolorizer.com",
        referer: "https://imagecolorizer.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    };
  }
  slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  b64(str) {
    return Buffer.from(str || "").toString("base64");
  }
  async getBuf(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (input?.startsWith?.("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const raw = input?.includes?.("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(raw || "", "base64");
    } catch (e) {
      throw new Error(`Gagal memproses gambar: ${e.message}`);
    }
  }
  async up(buf, p) {
    try {
      console.log("[Process] Mengunggah gambar ke server...");
      const form = new FormData();
      form.append("file", buf, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      form.append("type", p.type || 17);
      form.append("restore_face", p.restore_face || "false");
      form.append("upscale", p.upscale || "false");
      form.append("positive_prompts", p.pos);
      form.append("negative_prompts", p.neg);
      form.append("scratches", p.scratches || "false");
      form.append("portrait", p.portrait || "false");
      form.append("color_mode", p.color_mode || "2");
      const res = await axios.post(this.cfg.upUrl, form, {
        headers: {
          ...this.cfg.hdrs,
          ...form.getHeaders()
        }
      });
      return res?.data?.data || null;
    } catch (e) {
      throw new Error(`Upload gagal: ${e.message}`);
    }
  }
  async ck(code, type) {
    try {
      const res = await axios.post(this.cfg.ckUrl, {
        code: code,
        type: type
      }, {
        headers: {
          ...this.cfg.hdrs,
          "content-type": "application/json"
        }
      });
      return res?.data;
    } catch (e) {
      return null;
    }
  }
  async generate({
    prompt,
    neg_prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("[Process] Memulai proses pewarnaan AI...");
      const sfx = "(masterpiece), sharp, high quality, 8k, epic, Photography";
      const pStr = prompt ? `${prompt}, ${sfx}` : `, ${sfx},`;
      const nStr = neg_prompt || "black and white photo, grain, blur  CGI, Unreal, Airbrushed, Digital, sepia, ";
      const buf = await this.getBuf(imageUrl);
      const task = await this.up(buf, {
        ...rest,
        pos: this.b64(pStr),
        neg: this.b64(nStr)
      });
      if (!task?.code) throw new Error("Gagal mendapatkan task code dari API");
      console.log(`[Process] Task ID: ${task.code}. Menunggu antrean...`);
      for (let i = 0; i < 60; i++) {
        await this.slp(3e3);
        const status = await this.ck(task.code, task.type || 17);
        const data = status?.data || {};
        if (data?.status === "success") {
          console.log("[Process] Tugas selesai!");
          return {
            result: data.downloadUrls?.[0] || null,
            ...data
          };
        }
        console.log(`[Process] Percobaan ${i + 1}/60: ${data?.status || "prosesing"}`);
      }
      throw new Error("Waktu tunggu habis (Timeout)");
    } catch (e) {
      console.error("[Error]", e.message);
      return {
        error: e.message
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
  const api = new ImageColorizer();
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