import axios from "axios";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class SiliconFlow {
  constructor() {
    this.config = {
      apiKeys: ["c2stY3dheXdxbHlndG5hZm5oc2dmbmRpY3NxcnlhcmJjb2pzdmdmampzc3F0bWpzZHdl", "c2stc2Nld3NkcW5vc3NtY3RqbGt2eWVqb2FnenFudW9lZW1pbnNubWZubXdmaHhudHRr"].map(encodedKey => atob(encodedKey)),
      retries: 3,
      retryDelay: 3e3
    };
    this.baseURL = "https://api.siliconflow.cn/v1";
    console.info("Objek SiliconFlow dibuat. Panggil 'set_config' untuk inisialisasi jika diperlukan.");
  }
  set_config(options = {}) {
    const {
      apiKeys,
      retries,
      retryDelay
    } = options;
    if (apiKeys && (!Array.isArray(apiKeys) || apiKeys.length === 0)) {
      throw new Error('Opsi "apiKeys" harus berupa array yang tidak kosong.');
    }
    if (apiKeys) this.config.apiKeys = apiKeys;
    if (retries !== undefined) this.config.retries = retries;
    if (retryDelay !== undefined) this.config.retryDelay = retryDelay;
    console.info("Konfigurasi SiliconFlow berhasil diatur.");
  }
  _verify_config() {
    if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
      throw new Error("Konfigurasi belum diatur atau API key kosong. Panggil set_config({ apiKeys: [...] }) terlebih dahulu.");
    }
  }
  async _url_to_b64(url) {
    try {
      console.info(`Proses: Mengunduh gambar dari ${url}...`);
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(response.data, "binary").toString("base64");
      const mimeType = response.headers["content-type"] || "image/png";
      console.info("Proses: Berhasil mengonversi gambar ke base64.");
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error("Proses Gagal: Error saat mengonversi gambar.", error.message);
      throw new Error("Gagal mengubah URL gambar menjadi base64.");
    }
  }
  async _fetch(client, method, endpoint, data) {
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        let response;
        if (method.toUpperCase() === "POST") {
          response = await client.post(endpoint, data);
        } else {
          response = await client.get(endpoint);
        }
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        const errorMessage = error.response?.data?.error?.message || error.message;
        const errorData = error.response?.data;
        if (status === 401 || status === 403) {
          console.warn(`Proses Gagal: Otentikasi gagal (status ${status}). Mencoba key berikutnya...`);
          throw {
            ...error,
            isAuthError: true
          };
        }
        if (status >= 400 && status < 500) {
          console.error(`Proses Gagal Total: Error klien (status ${status}: ${errorMessage}). Permintaan tidak akan diulang.`);
          console.error("Detail Respons Error dari Server:", JSON.stringify(errorData, null, 2));
          throw error;
        }
        console.warn(`Proses Peringatan: Permintaan gagal (Percobaan ${attempt}/${this.config.retries}). Mencoba lagi dalam ${this.config.retryDelay} ms...`);
        if (attempt === this.config.retries) {
          console.error(`Proses Gagal Total: Gagal setelah ${this.config.retries} percobaan.`);
          throw error;
        }
        await sleep(this.config.retryDelay);
      }
    }
  }
  async _request(method, endpoint, data = null) {
    this._verify_config();
    for (let i = 0; i < this.config.apiKeys.length; i++) {
      const currentKey = this.config.apiKeys[i];
      console.info(`Proses: Menggunakan API key index ${i} untuk permintaan ${method.toUpperCase()} ke ${endpoint}.`);
      const client = axios.create({
        baseURL: this.baseURL,
        headers: {
          Authorization: `Bearer ${currentKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });
      try {
        const result = await this._fetch(client, method, endpoint, data);
        console.info(`Proses Berhasil: Permintaan sukses dengan API key index ${i}.`);
        return result;
      } catch (error) {
        if (error.isAuthError) {
          if (i === this.config.apiKeys.length - 1) {
            console.error("Proses Gagal Total: Semua API key tidak valid.");
            throw new Error("Semua API key gagal.");
          }
          continue;
        }
        throw error;
      }
    }
  }
  async models() {
    return await this._request("GET", "/models");
  }
  async chat({
    model,
    messages,
    prompt,
    imageUrl,
    ...rest
  }) {
    const endpoint = "/chat/completions";
    let finalMessages = messages;
    if (!finalMessages) {
      if (!prompt) throw new Error('Salah satu dari "messages" atau "prompt" wajib diisi.');
      finalMessages = [{
        role: "user",
        content: prompt
      }];
    }
    if (imageUrl) {
      const lastUserMessage = finalMessages.slice().reverse().find(m => m.role === "user");
      if (!lastUserMessage) {
        throw new Error('Tidak ditemukan pesan dari "user" untuk ditambahkan gambar.');
      }
      const textContent = {
        type: "text",
        text: lastUserMessage.content
      };
      const imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      };
      lastUserMessage.content = [textContent, imageContent];
    }
    const data = {
      model: model || "Qwen/Qwen2-7B-Instruct",
      messages: finalMessages,
      ...rest
    };
    return await this._request("POST", endpoint, data);
  }
  async image({
    prompt,
    model,
    imageUrl,
    ...rest
  }) {
    if (!prompt) throw new Error('Paramenter "prompt" wajib diisi.');
    let imageData = imageUrl;
    if (imageUrl && imageUrl.startsWith("http")) {
      imageData = await this._url_to_b64(imageUrl);
    }
    const data = {
      model: model || "Qwen/Qwen-Image",
      prompt: prompt,
      image: imageData,
      ...rest
    };
    return await this._request("POST", "/images/generations", data);
  }
  async video({
    prompt,
    model,
    imageUrl,
    ...rest
  }) {
    if (!prompt) throw new Error('Paramenter "prompt" wajib diisi.');
    let imageData = imageUrl;
    if (imageUrl && imageUrl.startsWith("http")) {
      imageData = await this._url_to_b64(imageUrl);
    }
    const data = {
      model: model || "Wan-AI/Wan2.2-T2V-A14B",
      prompt: prompt,
      image: imageData,
      ...rest
    };
    return await this._request("POST", "/video/submit", data);
  }
  async audio({
    input,
    model,
    ...rest
  }) {
    if (!input) throw new Error('Paramenter "input" wajib diisi.');
    const data = {
      model: model || "fnlp/MOSS-TTSD-v0.5",
      input: input,
      ...rest
    };
    return await this._request("POST", "/audio/speech", data);
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
  const sf = new SiliconFlow();
  try {
    let response;
    switch (action) {
      case "models":
        response = await sf.models();
        return res.status(200).json(response);
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await sf.chat(params);
        return res.status(200).json(response);
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'image'."
          });
        }
        response = await sf.image(params);
        return res.status(200).json(response);
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'video'."
          });
        }
        response = await sf.video(params);
        return res.status(200).json(response);
      case "audio":
        if (!params.input) {
          return res.status(400).json({
            error: "Paramenter 'input' wajib diisi untuk action 'audio'."
          });
        }
        response = await sf.audio(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'models', 'chat', 'image', 'video', 'audio'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}