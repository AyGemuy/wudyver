import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class AngleChanger {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4,
      withCredentials: true,
      headers: {
        authority: "anglechanger.ai",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://anglechanger.ai",
        pragma: "no-cache",
        referer: "https://anglechanger.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async req(method, url, data = null, customHeaders = {}) {
    try {
      console.log(`[AngleChanger] ${method.toUpperCase()} ${url}`);
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.client.defaults.headers,
          ...customHeaders
        }
      };
      if (data) config.data = data;
      const response = await this.client(config);
      return response.data;
    } catch (error) {
      console.error(`[AngleChanger] Error pada ${url}:`, error.message);
      throw error.response?.data || error;
    }
  }
  async resolveImage(source) {
    try {
      if (Buffer.isBuffer(source)) return source;
      if (typeof source === "string" && source.startsWith("http")) {
        console.log("[AngleChanger] Mendownload gambar dari URL...");
        const response = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (typeof source === "string") {
        const base64Data = source.replace(/^data:image\/\w+;base64,/, "");
        return Buffer.from(base64Data, "base64");
      }
      throw new Error("Format gambar tidak didukung");
    } catch (error) {
      console.error("[AngleChanger] Gagal memproses gambar input");
      throw error;
    }
  }
  async upload(imageSource) {
    try {
      const buffer = await this.resolveImage(imageSource);
      const form = new FormData();
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      form.append("image", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      const res = await this.req("post", "https://anglechanger.ai/api/upload.php", form, form.getHeaders());
      if (res?.success) {
        console.log("[AngleChanger] Upload berhasil:", res.data?.filename);
        return res.data?.url;
      } else {
        throw new Error(res?.message || "Gagal upload gambar");
      }
    } catch (error) {
      throw error;
    }
  }
  async generate({
    image,
    horizontal = 0,
    vertical = 0,
    zoom = 0,
    resolution = "auto"
  }) {
    try {
      const uploadedUrl = await this.upload(image);
      if (!uploadedUrl) throw new Error("URL Upload kosong");
      const payload = {
        image_url: uploadedUrl,
        horizontal_angle: horizontal,
        vertical_angle: vertical,
        zoom: zoom,
        resolution: resolution
      };
      console.log("[AngleChanger] Mengirim perintah generate...");
      const genRes = await this.req("post", "https://anglechanger.ai/api/generate.php", payload, {
        "content-type": "application/json"
      });
      if (!genRes?.success) throw new Error(genRes?.message || "Gagal memulai generate");
      const {
        request_id,
        image_id
      } = genRes.data || {};
      console.log(`[AngleChanger] Task ID: ${request_id} | Image ID: ${image_id}`);
      const maxAttempts = 60;
      const delayMs = 3e3;
      let resultUrl = null;
      console.log("[AngleChanger] Memulai polling status...");
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, delayMs));
        const checkUrl = `https://anglechanger.ai/api/check-status.php?request_id=${request_id}&image_id=${image_id}`;
        const statusRes = await this.req("get", checkUrl);
        const status = statusRes?.data?.status;
        console.log(`[AngleChanger] Attempt ${i + 1}/${maxAttempts} - Status: ${status}`);
        if (status === "completed") {
          resultUrl = statusRes.data?.result_url;
          break;
        } else if (status === "failed") {
          throw new Error("Proses generate gagal di sisi server");
        }
      }
      if (!resultUrl) throw new Error("Timeout: Gambar tidak selesai diproses");
      return {
        result: resultUrl,
        request_id: request_id,
        message: "Success"
      };
    } catch (error) {
      console.error("[AngleChanger] Proses Generate Gagal:", error.message);
      return {
        result: null,
        error: error.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new AngleChanger();
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