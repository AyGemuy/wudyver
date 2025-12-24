import axios from "axios";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
class BananaApi {
  constructor() {
    this.url = "https://ai-banana.app/api/edit-image";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://ai-banana.app",
      referer: "https://ai-banana.app/id",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      priority: "u=1, i",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    this.validRatios = ["1:1", "16:9", "3:2", "2:3", "3:4", "4:3", "9:16"];
    this.validCounts = [1, 2, 3, 4];
    this.validResolutions = ["1K", "2K", "4K"];
  }
  async buff(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log("   -> Mengunduh gambar...");
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data);
        }
        return Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      return null;
    } catch (e) {
      console.log("   -> Buffer error:", e.message);
      return null;
    }
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    console.log("\n=== Banana Edit (Validated) ===");
    try {
      if (!imageUrl) throw new Error("imageUrl wajib diisi");
      const buffer = await this.buff(imageUrl);
      if (!buffer) throw new Error("Gagal memproses buffer gambar");
      const inputRatio = rest.aspectRatio;
      const ratio = this.validRatios.includes(inputRatio) ? inputRatio : (console.log(`   -> Ratio '${inputRatio}' tidak valid, set ke 1:1`), "1:1");
      const inputNum = parseInt(rest.numOutputs || 1);
      const num = this.validCounts.includes(inputNum) ? inputNum.toString() : (console.log(`   -> Output '${inputNum}' tidak valid, set ke 1`), "1");
      const inputRes = rest.resolution;
      const res = this.validResolutions.includes(inputRes) ? inputRes : (console.log(`   -> Resolusi '${inputRes}' tidak valid, set ke 2K`), "2K");
      const model = rest.model || "nano-banana-edit";
      const fname = `upload_${Date.now()}.jpg`;
      const form = new FormData();
      form.append("image", buffer, {
        filename: fname,
        contentType: "image/jpeg"
      });
      form.append("prompt", prompt || "enhance");
      form.append("filename", fname);
      form.append("translateEnabled", "false");
      form.append("aspectRatio", ratio);
      form.append("numOutputs", num);
      form.append("isPublic", "true");
      form.append("model", model);
      form.append("resolution", res);
      console.log(`-> Request: ${ratio} | ${res} | ${num} img | ${model}`);
      const {
        data
      } = await axios.post(this.url, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      const success = data?.success ?? false;
      if (success) {
        console.log("-> Sukses.");
        const list = data?.editedImageUrls || (data?.editedImageUrl ? [data.editedImageUrl] : []);
        return {
          result: list,
          success: true,
          processingTime: data?.processingTime,
          creditsUsed: data?.creditsUsed
        };
      } else {
        throw new Error("API Success = False");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      console.error("-> Error:", msg);
      return {
        result: [],
        success: false,
        error: msg
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
  const api = new BananaApi();
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