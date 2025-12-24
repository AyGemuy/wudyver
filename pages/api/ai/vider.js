import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class Vider {
  constructor() {
    this.apiBaseUrl = "https://api.vider.ai/api/freev1";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://vider.ai",
      referer: "https://vider.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  b64ToBlob(base64, contentType = "image/jpeg") {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, {
      type: contentType
    });
  }
  async urlToBlob(url) {
    const res = await axios.get(url, {
      responseType: "blob"
    });
    return res.data;
  }
  async _uploadImage(imageUrl) {
    console.log("PROSES: Memulai proses unggah gambar...");
    try {
      console.log("  -> Langkah 1: Meminta URL presign untuk unggah...");
      const presignResponse = await axios.post(`${this.apiBaseUrl}/userFreeSignS3`, {
        filename: `image-${Date.now()}.jpg`,
        tryNum: 0
      }, {
        headers: this.headers
      });
      if (presignResponse.data.code !== 0) {
        throw new Error(`Gagal mendapatkan URL presign: ${presignResponse.data.info}`);
      }
      const {
        url: uploadUrl,
        pubUrl
      } = presignResponse.data.data;
      console.log("  <- RESPON: URL presign berhasil didapatkan.");
      console.log(`  -> Langkah 2: Mengunggah gambar...`);
      const contentType = "image/jpeg";
      const imageBlob = imageUrl.startsWith("http") ? await this.urlToBlob(imageUrl) : this.b64ToBlob(imageUrl, contentType);
      await axios.put(uploadUrl, imageBlob, {
        headers: {
          "Content-Type": contentType
        }
      });
      console.log("  <- RESPON: Gambar berhasil diunggah.");
      console.log(`     URL Publik: ${pubUrl}`);
      return pubUrl;
    } catch (error) {
      console.error("❌ EROR selama proses unggah gambar.");
      if (error.response) {
        console.error("   Data Respons Eror:", error.response.data);
        console.error("   Status Eror:", error.response.status);
      } else {
        console.error("   Pesan Eror:", error.message);
      }
      throw error;
    }
  }
  async _createTask(model, params) {
    console.log(`PROSES: Membuat tugas untuk model '${model}'...`);
    try {
      const payload = {
        params: {
          params: params
        }
      };
      console.log("  -> Mengirim permintaan pembuatan tugas dengan payload:", JSON.stringify(payload, null, 2));
      const taskResponse = await axios.post(`${this.apiBaseUrl}/task_create/${model}`, payload, {
        headers: this.headers
      });
      if (taskResponse.data.code !== 0) {
        throw new Error(`API mengembalikan eror saat membuat tugas: ${taskResponse.data.info}`);
      }
      console.log("  <- RESPON: Tugas berhasil dibuat.");
      console.log("     Data Tugas:", taskResponse.data.data);
      return taskResponse.data.data;
    } catch (error) {
      console.error(`❌ EROR saat membuat tugas untuk model '${model}'.`);
      if (error.response) {
        console.error("   Data Respons Eror:", error.response.data);
        console.error("   Status Eror:", error.response.status);
      } else {
        console.error("   Pesan Eror:", error.message);
      }
      throw error;
    }
  }
  async txt2vid({
    prompt,
    aspectRatio = 2
  }) {
    console.log("MEMULAI FUNGSI: txt2vid");
    const model = "free-ai-video-generator";
    const params = {
      model: model,
      image: "",
      aspectRatio: aspectRatio,
      prompt: prompt
    };
    return await this._createTask(model, params);
  }
  async img2vid({
    prompt,
    imageUrl,
    aspectRatio = 2
  }) {
    console.log("MEMULAI FUNGSI: img2vid");
    const pubUrl = await this._uploadImage(imageUrl);
    const model = "free-ai-image-to-video-generator";
    const params = {
      model: model,
      image: pubUrl,
      aspectRatio: aspectRatio,
      prompt: prompt
    };
    return await this._createTask(model, params);
  }
  async txt2img({
    prompt,
    aspectRatio = 2
  }) {
    console.log("MEMULAI FUNGSI: txt2img");
    const model = "free-ai-image-generator";
    const params = {
      model: model,
      image: "",
      aspectRatio: aspectRatio,
      prompt: prompt
    };
    return await this._createTask(model, params);
  }
  async img2img({
    prompt,
    imageUrl
  }) {
    console.log("MEMULAI FUNGSI: img2img");
    const pubUrl = await this._uploadImage(imageUrl);
    const model = "free-ai-image-to-image-generator";
    const params = {
      model: model,
      image: pubUrl,
      prompt: prompt
    };
    return await this._createTask(model, params);
  }
  async status({
    task_id
  }) {
    if (!task_id) throw new Error("task_id diperlukan untuk memeriksa status.");
    try {
      const res = await axios.get(`${this.apiBaseUrl}/task_get/${task_id}`, {
        headers: this.headers
      });
      return res.data;
    } catch (error) {
      console.error(`❌ EROR saat memeriksa status untuk task_id: ${task_id}.`);
      if (error.response) {
        console.error("   Data Respons Eror:", error.response.data);
      } else {
        console.error("   Pesan Eror:", error.message);
      }
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
      error: "Action is required."
    });
  }
  const client = new Vider();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2vid."
          });
        }
        response = await client.img2vid(params);
        return res.status(200).json(response);
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2vid."
          });
        }
        response = await client.txt2vid(params);
        return res.status(200).json(response);
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2img."
          });
        }
        response = await client.img2img(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await client.txt2img(params);
        return res.status(200).json(response);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for status."
          });
        }
        response = await client.status(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2vid', 'txt2vid', and 'status'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}