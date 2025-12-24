import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class ImgEditor {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://imgeditor.co",
        referer: "https://imgeditor.co/generator",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
      }
    }));
    this.base = "https://imgeditor.co/api";
  }
  async buf(data) {
    try {
      if (Buffer.isBuffer(data)) return data;
      if (data?.startsWith?.("data:")) {
        return Buffer.from(data.split(",")[1] || "", "base64");
      }
      if (data?.startsWith?.("http")) {
        const {
          data: d
        } = await this.client.get(data, {
          responseType: "arraybuffer"
        });
        return Buffer.from(d);
      }
      return Buffer.from(data, "base64");
    } catch (e) {
      console.log("buf error:", e.message);
      throw e;
    }
  }
  async upload(img) {
    try {
      const buffer = await this.buf(img);
      const size = buffer.length;
      const hex = buffer.toString("hex", 0, 4);
      const ext = hex.startsWith("ffd8") ? "jpg" : hex.startsWith("8950") ? "png" : "jpg";
      console.log("upload:", size, "bytes");
      const {
        data
      } = await this.client.post(`${this.base}/get-upload-url`, {
        fileName: `img.${ext}`,
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        fileSize: size
      });
      await axios.put(data.uploadUrl, buffer, {
        headers: {
          "Content-Type": `image/${ext === "jpg" ? "jpeg" : ext}`
        }
      });
      console.log("uploaded:", data.key);
      return data.publicUrl;
    } catch (e) {
      console.log("upload error:", e.message);
      throw e;
    }
  }
  async poll(id) {
    try {
      console.log("polling:", id);
      let i = 0;
      while (i < 60) {
        const {
          data
        } = await this.client.get(`${this.base}/generate-image/status?taskId=${id}`);
        console.log("status:", data.status, data.progress || 0, "%");
        if (data.status === "completed") return data;
        if (data.status === "failed") throw new Error("failed");
        await new Promise(r => setTimeout(r, 3e3));
        i++;
      }
      throw new Error("timeout");
    } catch (e) {
      console.log("poll error:", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("generate:", prompt);
      let urls = [];
      const imgs = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
      for (const img of imgs) {
        const url = await this.upload(img);
        urls.push(url);
      }
      const mode = urls.length > 0 ? "image" : "text";
      const payload = {
        prompt: prompt,
        styleId: rest.styleId || "realistic",
        mode: mode,
        imageSize: rest.imageSize || "auto",
        quality: rest.quality || "standard",
        numImages: rest.numImages || 1,
        outputFormat: rest.outputFormat || "png",
        model: rest.model || "nano-banana",
        ...rest
      };
      if (urls.length > 0) {
        payload.imageUrl = urls[0];
        payload.imageUrls = urls;
      }
      const {
        data
      } = await this.client.post(`${this.base}/generate-image`, payload);
      console.log("taskId:", data.taskId);
      const res = data.requiresPolling ? await this.poll(data.taskId) : data;
      return {
        result: res.imageUrl || res.url,
        taskId: res.taskId,
        status: res.status,
        progress: res.progress,
        createdAt: res.createdAt,
        completedAt: res.completedAt
      };
    } catch (e) {
      console.log("generate error:", e.message);
      throw e;
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
  const api = new ImgEditor();
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