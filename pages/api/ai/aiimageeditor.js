import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
const API_DOMAINS_CONFIG = [{
  domain: "https://aiimageeditor.me",
  weight: 10
}, {
  domain: "https://mx.shicij.com",
  weight: 10
}, {
  domain: "https://att2.shicij.com",
  weight: 10
}, {
  domain: "https://att3.shicij.com",
  weight: 10
}, {
  domain: "https://att.shicij.com",
  weight: 10
}, {
  domain: "https://rx.shicij.com",
  weight: 10
}, {
  domain: "https://tx.shicij.com",
  weight: 10
}];
class AIImageEditor {
  constructor(logger = null) {
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      timeout: 6e4
    });
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://aiimageeditor.me",
      referer: "https://aiimageeditor.me/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.config = {
      endpoints: {
        styles: "https://aiimageeditor.me/ai-style-transfer",
        upload: "/api/uploadImage",
        create: "/api/createImage",
        status: "/api/processing"
      },
      modes: {
        "ai-style": {
          type: 14,
          create_level: 0,
          style: "giboli"
        },
        "ai-redraw": {
          type: 6,
          create_level: 2,
          style: ""
        }
      }
    };
    this.logger = logger || {
      info: (message, data) => console.log(`[INFO] ${message}`, data || ""),
      error: (message, data) => console.error(`[ERROR] ${message}`, data || ""),
      warn: (message, data) => console.warn(`[WARN] ${message}`, data || "")
    };
  }
  pickApiDomain() {
    const totalWeight = API_DOMAINS_CONFIG.reduce((sum, config) => sum + config.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (const config of API_DOMAINS_CONFIG) {
      currentWeight += config.weight;
      if (random <= currentWeight) {
        return config.domain;
      }
    }
    return API_DOMAINS_CONFIG[0].domain;
  }
  async styles() {
    this.logger.info("Mengambil daftar style...");
    try {
      const response = await axios.get(this.config.endpoints.styles, {
        headers: this.headers,
        httpsAgent: this.httpsAgent
      });
      this.logger.info("Berhasil mengambil daftar style", {
        status: response.status
      });
      const $ = cheerio.load(response.data);
      const styles = [];
      $(".style-option").each((i, elem) => {
        styles.push({
          style: $(elem).data("style"),
          name: $(elem).data("name")
        });
      });
      this.logger.info(`Ditemukan ${styles.length} style`);
      return styles;
    } catch (error) {
      this.logger.error("Error saat mengambil style", {
        message: error.message
      });
      throw error;
    }
  }
  async generate({
    mode,
    prompt,
    imageUrl,
    ...rest
  }) {
    const apiDomain = this.pickApiDomain();
    this.logger.info(`Memulai generasi gambar dengan mode: ${mode} pada domain: ${apiDomain}`, {
      mode: mode,
      prompt: prompt,
      hasImage: !!imageUrl,
      ...rest
    });
    try {
      const modeDefaults = this.config.modes[mode] || this.config.modes["ai-style"];
      let remoteImageUrl;
      if (imageUrl) {
        this.logger.info("Mengunggah gambar...");
        let picInfo;
        if (Buffer.isBuffer(imageUrl)) {
          picInfo = `data:image/jpeg;base64,${imageUrl.toString("base64")}`;
        } else if (imageUrl.startsWith("http")) {
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          picInfo = `data:image/jpeg;base64,${Buffer.from(response.data).toString("base64")}`;
        } else {
          picInfo = imageUrl;
        }
        const uploadResponse = await axios.post(`${apiDomain}${this.config.endpoints.upload}`, {
          picInfo: picInfo,
          timestamp: Date.now()
        }, {
          headers: this.headers,
          httpsAgent: this.httpsAgent
        });
        this.logger.info("Response dari upload gambar", uploadResponse.data);
        remoteImageUrl = uploadResponse?.data?.data?.url;
        if (!remoteImageUrl) throw new Error("Gagal mendapatkan URL gambar setelah unggah.");
        this.logger.info(`Berhasil mengunggah gambar, URL: ${remoteImageUrl}`);
      }
      const defaultPrompt = PROMPT.text;
      const payload = {
        picInfo: "",
        picInfo2: "",
        text: prompt || defaultPrompt,
        original_url: remoteImageUrl,
        thumb_url: remoteImageUrl,
        image_source: remoteImageUrl ? 1 : 0,
        lang: "en",
        front_display: 0,
        ...modeDefaults,
        ...rest
      };
      this.logger.info("Payload untuk create image", payload);
      const response = await axios.post(`${apiDomain}${this.config.endpoints.create}`, payload, {
        headers: this.headers,
        httpsAgent: this.httpsAgent
      });
      this.logger.info("Tugas generasi gambar berhasil dibuat", response.data);
      return {
        ...response.data,
        domain: apiDomain
      };
    } catch (error) {
      this.logger.error("Error saat generate gambar", {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
  async status({
    task_id,
    domain,
    ...rest
  }) {
    this.logger.info(`Memeriksa status untuk task_id: ${task_id} pada domain: ${domain}`, {
      task_id: task_id,
      domain: domain,
      ...rest
    });
    if (!task_id || !domain) {
      const error = new Error("task_id dan domain diperlukan untuk memeriksa status.");
      this.logger.error("Paramenter tidak valid", {
        message: error.message,
        task_id: task_id,
        domain: domain
      });
      throw error;
    }
    try {
      const url = `${domain}${this.config.endpoints.status}?taskId=${task_id}`;
      const response = await axios.get(url, {
        headers: this.headers,
        httpsAgent: this.httpsAgent,
        ...rest
      });
      const statusData = response.data;
      this.logger.info(`Response status untuk task_id: ${task_id}`, statusData);
      if (statusData?.picArr?.length > 0) {
        this.logger.info(`Ditemukan ${statusData.picArr.length} gambar, memulai unggah...`);
        const uploadedUrls = [];
        for (const [index, image] of statusData.picArr.entries()) {
          try {
            const uploadResult = await this.uploadResultImage(image.url);
            if (uploadResult?.result) {
              uploadedUrls.push(uploadResult.result);
              this.logger.info(`Berhasil mengunggah gambar ${index + 1}`, {
                url: uploadResult.result
              });
            } else {
              this.logger.warn(`Gagal mendapatkan URL dari wudysoft untuk gambar ${index + 1}`, {
                response: uploadResult
              });
            }
          } catch (error) {
            this.logger.error(`Gagal mengunggah gambar ${index + 1}`, {
              message: error.message
            });
          }
        }
        this.logger.info("Proses unggah selesai", {
          totalUploaded: uploadedUrls.length
        });
        return uploadedUrls;
      }
      this.logger.info("Gambar belum siap");
      return [];
    } catch (error) {
      this.logger.error("Error saat memeriksa status", {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
  async uploadResultImage(base64Data) {
    try {
      const base64String = base64Data.split(",")[1] || base64Data;
      const imageBuffer = Buffer.from(base64String, "base64");
      const formData = new FormData();
      formData.append("file", imageBuffer, `generated-${Date.now()}.jpg`);
      const uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
      this.logger.info(`Mengunggah gambar ke: ${uploadUrl}`);
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders()
        },
        httpsAgent: this.httpsAgent
      });
      this.logger.info("Response dari upload gambar", response.data);
      return response.data;
    } catch (error) {
      this.logger.error("Error saat mengunggah", {
        message: error.message,
        response: error.response?.data
      });
      throw error;
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
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AIImageEditor();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "styles":
        response = await api.styles();
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate', 'styles', and 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}