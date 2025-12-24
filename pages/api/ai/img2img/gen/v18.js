import axios from "axios";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
const VALID_MODELS = ["flux_kontext", "seedream", "nano_banana"];
const VALID_RATIOS = ["match_input_image", "1:1", "3:2", "2:3", "9:16", "16:9", "3:4", "4:3"];
class PhotoEditorAI {
  constructor({
    baseUrl = "https://api.photoeditorai.io",
    serial
  } = {}) {
    this.config = {
      baseUrl: (baseUrl ?? "").replace(/\/+$/, ""),
      endpoint: {
        generate: "/pe/photo-editor/create-job",
        status: "/pe/photo-editor/get-job"
      }
    };
    this.serial = serial ?? `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.ax = axios.create({
      headers: {
        "product-serial": this.serial,
        origin: "https://ezremove.ai",
        referer: "https://ezremove.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
      }
    });
    console.log("[PEAI] Init dengan serial →", this.serial);
  }
  async toBuf(input) {
    try {
      if (Buffer.isBuffer(input)) {
        console.log("[PEAI] Input: Buffer");
        return input;
      }
      if (typeof input === "string" && input.trim().startsWith("data:")) {
        console.log("[PEAI] Input: Base64");
        return Buffer.from(input.split(",")[1], "base64");
      }
      if (typeof input === "string" && /^https?:\/\//i.test(input.trim())) {
        console.log("[PEAI] Download dari URL:", input);
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      throw new Error("Tipe image tidak didukung (harus URL, base64, atau Buffer)");
    } catch (err) {
      console.error("[PEAI] Gagal proses image:", err.message);
      throw err;
    }
  }
  async generate({
    model = "nano_banana",
    ratio = "match_input_image",
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    try {
      if (!VALID_MODELS.includes(model)) throw new Error(`Model salah. Pilih: ${VALID_MODELS.join(", ")}`);
      if (!VALID_RATIOS.includes(ratio)) throw new Error(`Ratio salah. Pilih: ${VALID_RATIOS.join(", ")}`);
      if (!prompt?.trim()) throw new Error("Prompt wajib diisi");
      const images = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
      if (images.length === 0) throw new Error("Minimal 1 image");
      const form = new FormData();
      form.append("model_name", model);
      form.append("prompt", prompt.trim());
      form.append("ratio", ratio);
      console.log("[PEAI] Proses", images.length, "image...");
      for (const img of images) {
        const buf = await this.toBuf(img);
        form.append("target_images", buf, {
          filename: `img_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
      }
      Object.entries(rest).forEach(([k, v]) => v != null && form.append(k, v));
      console.log("[PEAI] Kirim job ke API...");
      const createRes = await this.ax.post(`${this.config.baseUrl}${this.config.endpoint.generate}`, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const jobId = createRes.data?.result?.job_id;
      if (!jobId) throw new Error("Tidak dapat job_id dari server");
      console.log("[PEAI] Job berhasil dibuat →", jobId);
      return await this.poll(jobId);
    } catch (err) {
      console.error("[PEAI] Generate error:", err.message || err);
      throw err;
    }
  }
  async poll(jobId, delay = 3500, max = 80) {
    let i = 0;
    while (i < max) {
      i++;
      console.log(`[PEAI] Cek status ${jobId} (${i}/${max})...`);
      try {
        const res = await this.ax.get(`${this.config.baseUrl}${this.config.endpoint.status}/${jobId}`);
        const r = res.data?.result;
        if (!r) throw new Error("Response kosong");
        if (r.status === 2) {
          const out = r.output || [];
          console.log("[PEAI] SELESAI! Dapat", out.length, "hasil");
          return {
            jobId: jobId,
            output: out,
            error: r.error ?? null
          };
        }
        if (r.error) throw new Error(r.error);
      } catch (err) {
        console.warn("[PEAI] Poll error:", err.message || err);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error("Polling timeout setelah " + max + " kali");
  }
  async status({
    jobId
  }) {
    if (!jobId) throw new Error("jobId wajib");
    try {
      console.log("[PEAI] Manual cek status →", jobId);
      const res = await this.ax.get(`${this.config.baseUrl}${this.config.endpoint.status}/${jobId}`);
      return res.data?.result ?? res.data;
    } catch (err) {
      console.error("[PEAI] Status error:", err.message);
      throw err;
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
  const api = new PhotoEditorAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}