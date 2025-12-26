import axios from "axios";
import FormData from "form-data";
class SoraAI {
  constructor() {
    this.baseUrl = "https://turnitn.org";
    this.deviceId = this.generateUUID();
    this.token = null;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
  }
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  async resolveToBuffer(input) {
    try {
      this.log("🔄 Memproses input gambar...");
      if (Buffer.isBuffer(input)) {
        this.log("✅ Input adalah Buffer");
        return input;
      }
      if (typeof input !== "string") {
        throw new Error("Input tidak valid. Harus berupa URL, Base64, atau Buffer");
      }
      if (input.startsWith("http")) {
        this.log("🌐 Mengunduh gambar dari URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        this.log("✅ Gambar berhasil diunduh");
        return Buffer.from(res.data);
      } else if (input.includes("base64,")) {
        this.log("📦 Mengkonversi Base64 dengan header...");
        return Buffer.from(input.split(",")[1], "base64");
      } else {
        this.log("📦 Mengkonversi Base64 tanpa header...");
        return Buffer.from(input, "base64");
      }
    } catch (error) {
      this.log("❌ Error saat memproses input:", error.message);
      throw new Error(`Gagal memproses input: ${error.message}`);
    }
  }
  async createUser() {
    try {
      this.log("👤 Membuat user baru...");
      const payload = {
        userId: this.generateUUID(),
        token: this.token,
        platform: "android",
        deviceId: this.deviceId,
        app: "Sora"
      };
      const res = await this.client.post("/v1/mid/createUser", payload);
      this.log("✅ User berhasil dibuat", res.data);
      return res.data;
    } catch (error) {
      this.log("❌ Error membuat user:", error.response?.data || error.message);
      throw new Error(`Gagal membuat user: ${error.message}`);
    }
  }
  async updateCredits(credits = 10, plan = "Pro") {
    try {
      this.log(`💳 Mengupdate credits (${credits}) dan plan (${plan})...`);
      const payload = {
        userId: this.generateUUID(),
        token: this.token,
        credits: credits,
        plan: plan,
        platform: "android",
        deviceId: this.deviceId,
        app: "Sora"
      };
      const res = await this.client.post("/v1/mid/update", payload);
      this.log("✅ Credits berhasil diupdate", res.data);
      return res.data;
    } catch (error) {
      this.log("❌ Error update credits:", error.response?.data || error.message);
      throw new Error(`Gagal update credits: ${error.message}`);
    }
  }
  async checkSubscription() {
    try {
      this.log("🔍 Mengecek status langganan...");
      const payload = {
        deviceId: this.deviceId
      };
      const res = await this.client.post("/v2/purchased/get", payload);
      this.log("✅ Status langganan ditemukan", res.data);
      return res.data;
    } catch (error) {
      this.log("❌ Error cek langganan:", error.response?.data || error.message);
      throw new Error(`Gagal cek langganan: ${error.message}`);
    }
  }
  async uploadImage(input) {
    try {
      this.log("📤 Memulai upload gambar...");
      const buffer = await this.resolveToBuffer(input);
      const form = new FormData();
      form.append("image", buffer, {
        filename: `photo_${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const res = await this.client.post("/api/upload", form, {
        headers: form.getHeaders()
      });
      const imageUrl = typeof res.data === "string" ? res.data : res.data.imageUrl;
      this.log("✅ Gambar berhasil diupload", {
        imageUrl: imageUrl
      });
      return imageUrl;
    } catch (error) {
      this.log("❌ Error upload gambar:", error.response?.data || error.message);
      throw new Error(`Gagal upload gambar: ${error.message}`);
    }
  }
  async txt2vid({
    prompt,
    ...options
  }) {
    try {
      this.log("🎬 Memulai proses Text-to-Video...");
      this.log("📝 Prompt:", prompt);
      await this.createUser();
      await this.updateCredits();
      this.log("--- Tahap 2: Cek Langganan ---");
      const sub = await this.checkSubscription();
      this.log("Status Plan:", sub.user?.plan);
      this.log("--- Tahap 3: Generate Video ---");
      const payload = {
        prompt: prompt,
        aspectRatio: options.aspectRatio || "720*1280",
        resolution: options.resolution || "1080p",
        duration: options.duration || "8",
        seed: options.seed || Math.floor(Math.random() * 1e9),
        negativePrompt: options.negativePrompt || "",
        model: "veo3.1",
        deviceId: this.deviceId,
        pro: options.pro !== undefined ? options.pro : true,
        userName: options.userName || "Guest"
      };
      const res = await this.client.post("/sora/sora/generate-video", payload);
      this.log("✅ Video generation dimulai", res.data);
      return res.data;
    } catch (error) {
      this.log("❌ Error Text-to-Video:", error.response?.data || error.message);
      throw new Error(`Gagal generate video: ${error.message}`);
    }
  }
  async img2vid({
    prompt,
    imageUrl: imageInput,
    ...options
  }) {
    try {
      this.log("🎬 Memulai proses Image-to-Video...");
      this.log("📝 Prompt:", prompt);
      await this.createUser();
      await this.updateCredits();
      this.log("--- Tahap 2: Cek Langganan ---");
      const sub = await this.checkSubscription();
      this.log("Status Plan:", sub.user?.plan);
      this.log("--- Tahap 3: Upload Gambar ---");
      const uploadedUrl = await this.uploadImage(imageInput);
      this.log("--- Tahap 4: Generate Video ---");
      const payload = {
        prompt: prompt,
        imageBase64: uploadedUrl,
        aspectRatio: options.aspectRatio || "16:9",
        resolution: options.resolution || "1080p",
        duration: options.duration || "8",
        seed: options.seed || Math.floor(Math.random() * 1e9),
        negativePrompt: options.negativePrompt || "",
        model: "veo3.1",
        deviceId: this.deviceId,
        pro: options.pro !== undefined ? options.pro : true,
        userName: options.userName || "Guest"
      };
      const res = await this.client.post("/sora/generate-video/image", payload);
      this.log("✅ Video generation dimulai", res.data);
      return res.data;
    } catch (error) {
      this.log("❌ Error Image-to-Video:", error.response?.data || error.message);
      throw new Error(`Gagal generate video: ${error.message}`);
    }
  }
  async status({
    taskId
  }) {
    try {
      if (!taskId) {
        throw new Error("ID Tugas tidak ditemukan");
      }
      this.log(`🔍 Mengecek status task: ${taskId}`);
      const res = await this.client.get(`/sora/task/${taskId}`);
      this.log("✅ Status task ditemukan", res.data);
      return res.data;
    } catch (error) {
      this.log("❌ Error cek status:", error.response?.data || error.message);
      throw new Error(`Gagal cek status: ${error.message}`);
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
      error: "Parameter 'action' wajib diisi",
      actions: ["txt2vid", "img2vid", "status"]
    });
  }
  const sora = new SoraAI();
  try {
    let result;
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2vid'",
            example: {
              action: "txt2vid",
              prompt: "A futuristic car driving through neon city",
              aspectRatio: "720*1280",
              resolution: "1080p",
              duration: "8"
            }
          });
        }
        result = await sora.txt2vid(params);
        break;
      case "img2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'img2vid'"
          });
        }
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'imageUrl' wajib diisi untuk action 'img2vid'",
            example: {
              action: "img2vid",
              prompt: "Slow motion waves crashing",
              imageUrl: "https://example.com/image.jpg"
            }
          });
        }
        result = await sora.img2vid(params);
        break;
      case "status":
        if (!params.taskId) {
          return res.status(400).json({
            error: "Parameter 'taskId' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              taskId: "xxx-xxx-xxx"
            }
          });
        }
        result = await sora.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["txt2vid", "img2vid", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}