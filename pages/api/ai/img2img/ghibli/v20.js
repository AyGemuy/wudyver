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
      baseURL: this.baseUrl
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
  async generate({
    imageUrl
  }) {
    try {
      console.log("[*] Mengunggah gambar...");
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
      console.log("[+] Upload berhasil:", res.data);
      const taskId = res.data?.data?.task_id;
      if (!taskId) throw new Error("task_id tidak ditemukan");
      console.log("[+] Upload berhasil. task_id:", taskId);
      return await this.pollTask(taskId);
    } catch (err) {
      console.error("[!] Upload gagal:", err.message);
      throw err;
    }
  }
  async pollTask(taskId, interval = 3e3, maxTries = 30) {
    let tries = 0;
    const url = `${this.baseUrl}/api/photo2anime/ghibli/get?job_id=${taskId}`;
    console.log("[*] Memulai polling...");
    while (tries < maxTries) {
      try {
        const res = await axios.get(url, {
          headers: this.headers
        });
        const result = res.data;
        console.log("[+] Result berhasil:", res.data);
        if (result.code === 200 && result.data?.image_url?.length) {
          console.log("[+] Hasil ditemukan:", result.data.image_url[0]);
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
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibliAI = new GhibliAI();
  try {
    const data = await ghibliAI.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}