import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import * as cheerio from "cheerio";
class ApiGenerator {
  constructor() {
    console.log("Proses: Menginisialisasi ApiGenerator...");
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Content-Type": "application/json",
        Origin: "https://nanobanana.cc",
        Referer: "https://nanobanana.cc/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }
    }));
  }
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  _isBase64(str) {
    if (typeof str !== "string" || str.length === 0) {
      return false;
    }
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str);
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Proses: Memulai pembuatan gambar...");
      let images = [];
      let image = null;
      if (imageUrl) {
        console.log("Proses: Mendeteksi imageUrl, mode image-to-image.");
        let base64Image;
        if (Buffer.isBuffer(imageUrl)) {
          base64Image = imageUrl.toString("base64");
        } else if (this._isBase64(imageUrl)) {
          base64Image = imageUrl;
        } else if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
          console.log("Proses: Mengunduh gambar dari URL...");
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
          });
          base64Image = Buffer.from(response.data).toString("base64");
        } else {
          throw new Error("Format imageUrl tidak valid. Harus berupa URL, Base64, atau Buffer.");
        }
        images.push(base64Image);
        image = base64Image;
      } else {
        console.log("Proses: Tidak ada imageUrl, mode text-to-image.");
      }
      const payload = {
        prompt: prompt,
        aspect_ratio: rest?.aspect_ratio || "9:16",
        model: imageUrl ? "nano-banana-edit" : "nano-banana",
        images: images,
        image: image,
        fingerprint: rest?.fingerprint || `fp_${Date.now()}`,
        pageId: rest?.pageId || "index_page",
        ...rest
      };
      console.log("Proses: Mengirim permintaan awal untuk mendapatkan session dan CSRF token...");
      const homePageResponse = await this.client.get("https://nanobanana.cc");
      console.log("Proses: Mengekstrak CSRF token dari HTML menggunakan Cheerio...");
      let csrfToken;
      try {
        const $ = cheerio.load(homePageResponse.data);
        csrfToken = $('meta[name="csrf-token"]').attr("content");
        if (!csrfToken) {
          throw new Error("Meta tag 'csrf-token' tidak ditemukan di dalam HTML halaman utama.");
        }
      } catch (e) {
        console.error("Gagal mengekstrak CSRF token dengan Cheerio:", e);
        throw new Error("Gagal mem-parsing HTML atau token tidak ditemukan.");
      }
      console.log("Proses: Mengirim permintaan untuk memulai tugas generate...");
      const initialResponse = await this.client.post("https://nanobanana.cc/generate-guest", payload, {
        headers: {
          "x-csrf-token": csrfToken
        }
      });
      const taskId = initialResponse.data?.task_id;
      if (!taskId) {
        throw new Error("Gagal mendapatkan task_id dari respons awal.");
      }
      console.log(`Proses: Tugas berhasil dibuat dengan ID: ${taskId}`);
      console.log("Proses: Memulai polling untuk status tugas...");
      let taskStatus = "";
      while (taskStatus !== "completed") {
        await this._sleep(3e3);
        const pollResponse = await this.client.get(`https://nanobanana.cc/query/${taskId}`, {
          headers: {
            "x-csrf-token": csrfToken
          }
        });
        taskStatus = pollResponse.data?.status;
        console.log(`Proses: Status tugas saat ini - ${taskStatus}`);
        if (taskStatus === "completed") {
          console.log("Proses: Pembuatan gambar selesai.");
          return {
            result: pollResponse.data?.image_url,
            mode: imageUrl ? "image-to-image" : "text-to-image",
            status: "completed"
          };
        } else if (taskStatus === "failed") {
          throw new Error(`Pembuatan gambar gagal. Pesan dari server: ${pollResponse.data?.error || "Tidak ada pesan"}`);
        }
      }
    } catch (error) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error("Terjadi kesalahan:", errorMessage);
      throw new Error(errorMessage);
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
  const api = new ApiGenerator();
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