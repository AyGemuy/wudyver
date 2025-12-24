import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class CakuAI {
  constructor() {
    this.baseUrl = "https://caku.ai";
    this.cookies = [];
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: this.baseUrl,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseUrl}/text-to-image`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.ua,
        ...SpoofHead()
      }
    });
    this.api.interceptors.request.use(config => {
      if (this.cookies.length > 0) {
        config.headers["cookie"] = this.cookies.join("; ");
      }
      return config;
    });
    this.api.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"];
      if (setCookie) {
        const newCookies = setCookie.map(c => c.split(";")[0]);
        this.cookies = [...new Set([...this.cookies, ...newCookies])];
      }
      return response;
    }, error => Promise.reject(error));
  }
  async toBuf(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string") {
        if (source.startsWith("http")) {
          console.log("🔄 Fetching image url...");
          const res = await axios.get(source, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (source.startsWith("data:image")) {
          return Buffer.from(source.split(",")[1], "base64");
        }
        return Buffer.from(source, "base64");
      }
      return null;
    } catch (e) {
      console.error("❌ Gagal convert buffer:", e.message);
      return null;
    }
  }
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async poll(taskId) {
    let attempts = 0;
    const maxAttempts = 60;
    console.log(`⏳ Polling task: ${taskId}`);
    while (attempts < maxAttempts) {
      try {
        await this.wait(3e3);
        const {
          data
        } = await this.api.get(`/api/image/status/${taskId}`);
        const status = data?.status;
        if (status === 1) {
          console.log("✅ Task selesai!");
          return {
            success: true,
            taskId: taskId,
            result: data?.outputImage,
            meta: data
          };
        }
        attempts++;
      } catch (e) {
        attempts++;
      }
    }
    return {
      success: false,
      message: "Timeout polling"
    };
  }
  async reqI2I(form) {
    try {
      console.log("🚀 Sending Image-to-Image request...");
      const headers = {
        ...form.getHeaders(),
        referer: `${this.baseUrl}/dashboard`
      };
      const {
        data
      } = await this.api.post("/api/image/generate", form, {
        headers: headers
      });
      const taskId = data?.taskId;
      if (!taskId) throw new Error(data?.message || "No Task ID returned");
      return await this.poll(taskId);
    } catch (e) {
      console.error("❌ Error I2I:", e?.response?.data || e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async reqT2I(payload) {
    try {
      console.log("🚀 Sending Text-to-Image request...");
      const {
        data
      } = await this.api.post("/api/text-to-image/generate", payload);
      const taskId = data?.taskId;
      if (!taskId) throw new Error(data?.message || "No Task ID returned");
      return await this.poll(taskId);
    } catch (e) {
      console.error("❌ Error T2I:", e?.response?.data || e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("⚙️ Memulai proses generate...");
      if (imageUrl) {
        console.log("📂 Mode: Image-to-Image (Construction Form Data)");
        const form = new FormData();
        form.append("prompt", prompt || "anime style");
        form.append("addWatermark", String(rest.addWatermark ?? false));
        form.append("inputMode", "upload");
        form.append("model", rest.model || "nano-banana");
        const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        let idx = 0;
        for (const imgSource of images) {
          const buffer = await this.toBuf(imgSource);
          if (buffer) {
            form.append("images", buffer, {
              filename: `upload_${Date.now()}_${idx}.jpg`,
              contentType: "image/jpeg"
            });
            console.log(`➕ Appended image index ${idx}`);
            idx++;
          }
        }
        if (idx === 0) throw new Error("Tidak ada gambar valid untuk diupload");
        return await this.reqI2I(form);
      } else {
        console.log("📝 Mode: Text-to-Image");
        const payload = {
          prompt: prompt,
          aspectRatio: rest.aspectRatio || "9:16"
        };
        return await this.reqT2I(payload);
      }
    } catch (e) {
      console.error("🔥 Fatal Error:", e.message);
      return {
        success: false,
        error: e.message
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
  const api = new CakuAI();
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