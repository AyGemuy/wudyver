import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliAI {
  constructor() {
    this.baseUrl = "https://api.lovefaceswap.com";
    this.headers = {
      accept: "*/*",
      authorization: "Bearer null",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://lovefaceswap.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://lovefaceswap.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers
    });
  }
  async getImageBuffer(imageUrl) {
    try {
      const res = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res.data);
      const contentType = res.headers["content-type"] || "image/jpeg";
      const ext = contentType.split("/")[1] || "jpg";
      console.log("[+] Gambar diambil:", contentType);
      return {
        buffer: buffer,
        type: contentType,
        ext: ext
      };
    } catch (e) {
      console.error("[!] Gagal ambil gambar:", e.message);
      throw e;
    }
  }
  async pollTask(taskId, endpoint, interval = 3e3, maxTries = 60) {
    let tries = 0;
    const url = `${this.baseUrl}${endpoint}?job_id=${taskId}`;
    console.log("[*] Memulai polling:", url);
    while (tries < maxTries) {
      try {
        const res = await this.client.get(url);
        const result = res.data;
        console.log("[+] Result polling:", res.data);
        if (result.code === 200 && result.data?.image_url?.length) {
          console.log("[+] Hasil ditemukan:", result.data.image_url[0]);
          return result.data;
        } else if (result.code === 200 && result.data?.image_url && typeof result.data.image_url === "string") {
          console.log("[+] Hasil ditemukan:", result.data.image_url);
          return result.data;
        }
        console.log(`[?] Belum siap (${tries + 1}/${maxTries})...`);
        await new Promise(resolve => setTimeout(resolve, interval));
        tries++;
      } catch (err) {
        console.error("[!] Polling error:", err.message);
        throw err;
      }
    }
    throw new Error("Polling timeout. Gambar tidak tersedia.");
  }
  async ghibli({
    imageUrl
  }) {
    try {
      console.log("[*] Mengunggah gambar untuk Ghibli...");
      const {
        buffer,
        type,
        ext
      } = await this.getImageBuffer(imageUrl);
      const blob = new Blob([buffer], {
        type: type
      });
      const form = new FormData();
      form.append("source_image", blob, `image.${ext}`);
      const res = await this.client.post("/api/photo2anime/ghibli/create", form, {
        headers: {
          ...form.headers
        },
        maxBodyLength: Infinity
      });
      console.log("[+] Upload Ghibli berhasil:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) throw new Error("task_id tidak ditemukan untuk Ghibli");
      console.log("[+] Upload Ghibli berhasil. task_id:", taskId);
      return await this.pollTask(taskId, "/api/photo2anime/ghibli/get");
    } catch (err) {
      console.error("[!] Upload Ghibli gagal:", err.message);
      throw err;
    }
  }
  async swap({
    sourceUrl,
    targetUrl
  }) {
    try {
      console.log("[*] Memulai face swap...");
      const sourceImage = await this.getImageBuffer(sourceUrl);
      const targetImage = await this.getImageBuffer(targetUrl);
      const sourceBlob = new Blob([sourceImage.buffer], {
        type: sourceImage.type
      });
      const targetBlob = new Blob([targetImage.buffer], {
        type: targetImage.type
      });
      const form = new FormData();
      form.append("source_image", sourceBlob, `source.${sourceImage.ext}`);
      form.append("target_image", targetBlob, `target.${targetImage.ext}`);
      const res = await this.client.post("/api/face-swap/create-poll", form, {
        headers: {
          ...form.headers
        },
        maxBodyLength: Infinity
      });
      console.log("[+] Face swap upload berhasil:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) throw new Error("task_id tidak ditemukan untuk face swap");
      console.log("[+] Face swap upload berhasil. task_id:", taskId);
      return await this.pollTask(taskId, "/api/face-swap/get");
    } catch (err) {
      console.error("[!] Face swap gagal:", err.message);
      throw err;
    }
  }
  async clothes({
    imageUrl,
    maskUrl
  }) {
    try {
      console.log("[*] Memulai proses remove clothes...");
      const originalImage = await this.getImageBuffer(imageUrl);
      const maskImage = await this.getImageBuffer(maskUrl);
      const imageBlob = new Blob([originalImage.buffer], {
        type: originalImage.type
      });
      const maskBlob = new Blob([maskImage.buffer], {
        type: maskImage.type
      });
      const form = new FormData();
      form.append("mask", maskBlob, `mask.${maskImage.ext}`);
      form.append("image", imageBlob, `image.${originalImage.ext}`);
      const res = await this.client.post("/api/remove-clothes/create", form, {
        headers: {
          ...form.headers
        },
        maxBodyLength: Infinity
      });
      console.log("[+] Remove clothes upload berhasil:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) throw new Error("task_id tidak ditemukan untuk remove clothes");
      console.log("[+] Remove clothes upload berhasil. task_id:", taskId);
      return await this.pollTask(taskId, "/api/color-restore/get");
    } catch (err) {
      console.error("[!] Remove clothes gagal:", err.message);
      throw err;
    }
  }
  async txt2img({
    prompt,
    aspectRatio = "1:1",
    numOutputs = 1
  }) {
    try {
      console.log("[*] Memulai text-to-image...");
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("aspect_ratio", aspectRatio);
      form.append("num_outputs", numOutputs);
      const res = await this.client.post("/api/image-generate/create", form, {
        headers: {
          ...form.headers
        },
        maxBodyLength: Infinity
      });
      console.log("[+] Text-to-image berhasil:", res.data);
      if (res.data?.code === 200 && res.data?.data?.image_url) {
        console.log("[+] Hasil text-to-image ditemukan:", res.data.data.image_url);
        return res.data.data;
      } else {
        throw new Error("URL gambar tidak ditemukan dari respons text-to-image.");
      }
    } catch (err) {
      console.error("[!] Text-to-image gagal:", err.message);
      throw err;
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
      error: "Missing required field: action",
      required: {
        action: "ghibli | swap | clothes | txt2img"
      }
    });
  }
  const ghibliAi = new GhibliAI();
  try {
    let result;
    switch (action) {
      case "ghibli":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: imageUrl (required for ${action})`
          });
        }
        result = await ghibliAi.ghibli(params);
        break;
      case "swap":
        if (!params.sourceUrl || !params.targetUrl) {
          return res.status(400).json({
            error: `Missing required fields: sourceUrl and targetUrl (required for ${action})`
          });
        }
        result = await ghibliAi.swap(params);
        break;
      case "clothes":
        if (!params.imageUrl || !params.maskUrl) {
          return res.status(400).json({
            error: `Missing required fields: imageUrl and maskUrl (required for ${action})`
          });
        }
        result = await ghibliAi.clothes(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await ghibliAi.txt2img(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: ghibli | swap | clothes | txt2img`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[API Error] Action ${action} failed:`, error.message);
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}