import axios from "axios";
import CryptoJS from "crypto-js";
import {
  FormData,
  Blob
} from "formdata-node";
class GhibliAPI {
  constructor() {
    this.baseURL = "https://ghibli.vip/server";
    this.symmetricKey = "23499sdfjun7ytf5859oiudy29suvhyf";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  encryptAES(dataObj, key = this.symmetricKey) {
    const plaintext = JSON.stringify(dataObj);
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Utf8.parse(key), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const result = iv.concat(encrypted.ciphertext);
    return CryptoJS.enc.Base64.stringify(result);
  }
  async uploadImageFromUrl(url) {
    try {
      console.log("Mengunduh gambar dari URL...");
      const {
        data: buffer,
        headers
      } = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = headers["content-type"] || "image/png";
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: contentType
      }), "image.png");
      console.log("Mengunggah gambar ke server...");
      const response = await axios.post(`${this.baseURL}/upload_pic.php`, formData, {
        headers: {
          ...this.headers,
          "content-type": "multipart/form-data"
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      return response.data;
    } catch (error) {
      console.error("Gagal upload gambar:", error.message);
      throw error;
    }
  }
  async getTaskID(imageUrl) {
    try {
      console.log("Mendapatkan task ID...");
      const encodedData = new URLSearchParams();
      encodedData.append("my_data[val1]", this.encryptAES({
        input_path: imageUrl
      }));
      const response = await axios.post(`${this.baseURL}/img/get_img2img_task_id.php`, encodedData, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan task ID:", error.message);
      throw error;
    }
  }
  async getTaskResult(taskId) {
    try {
      const encodedData = new URLSearchParams();
      encodedData.append("my_data[task_id]", taskId);
      const response = await axios.post(`${this.baseURL}/img/get_img2img_task_result.php`, encodedData, {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      return response.data;
    } catch (error) {
      console.error("Gagal mendapatkan hasil task:", error.message);
      throw error;
    }
  }
  async getTaskResultWithRetry(taskId, timeoutMs = 36e5, delayMs = 5e3) {
    const start = Date.now();
    let attempt = 1;
    while (Date.now() - start < timeoutMs) {
      try {
        console.log(`Percobaan ke-${attempt} untuk mendapatkan hasil task...`);
        const result = await this.getTaskResult(taskId);
        if (result.status === "SUCCESS") {
          console.log("Task selesai:", result);
          return result;
        }
        console.log("Task belum selesai. Menunggu...");
        await this.delay(delayMs);
        attempt++;
      } catch (err) {
        console.error(`Kesalahan saat mencoba hasil task:`, err.message);
      }
    }
    throw new Error("Gagal mendapatkan hasil dalam batas waktu 1 jam.");
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async generate({
    imageUrl
  }) {
    try {
      const uploadRes = await this.uploadImageFromUrl(imageUrl);
      console.log("Hasil upload:", uploadRes);
      if (!uploadRes.url) throw new Error("Upload gagal, URL tidak ditemukan.");
      const taskRes = await this.getTaskID(uploadRes.url);
      console.log("Hasil task ID:", taskRes);
      if (!taskRes.task_id) throw new Error("Task ID tidak ditemukan.");
      const result = await this.getTaskResultWithRetry(taskRes.task_id);
      console.log("Hasil akhir:", result);
      return result;
    } catch (err) {
      console.error("Gagal generate:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibliAPI = new GhibliAPI();
  try {
    const data = await ghibliAPI.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}