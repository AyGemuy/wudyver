import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
class NoiseReducer {
  constructor() {
    this.uploadUrl = "https://apiv2.noise-reducer.com/denoiser/v3/noise-reductions/upload/";
    this.serverTimeUrl = "https://apiv2.noise-reducer.com/core/v1/server-time/";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      connection: "keep-alive",
      origin: "https://noise-reducer.com",
      pragma: "no-cache",
      referer: "https://noise-reducer.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
    this.uploadHeaders = {
      ...this.headers,
      "Content-Type": "multipart/form-data",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site"
    };
    console.log("NoiseReducer diinisialisasi.");
  }
  async getServerTime() {
    try {
      console.log("Mengambil waktu server...");
      const response = await axios.get(this.serverTimeUrl, {
        headers: this.headers
      });
      console.log("Waktu server berhasil diambil:", response.data);
      return response.data.server_time;
    } catch (error) {
      console.error("Gagal mengambil waktu server:", error.message);
      return new Date().toISOString();
    }
  }
  async noiseRemove({
    audioUrl
  }) {
    console.log(`Memulai noise removal untuk URL: ${audioUrl}`);
    try {
      console.log("Mengambil data audio...");
      const {
        data: buffer,
        headers
      } = await axios.get(audioUrl, {
        responseType: "arraybuffer"
      });
      console.log("Data audio berhasil diambil.");
      const mime = headers["content-type"] || "audio/mpeg";
      const ext = "mp3";
      const filename = `input.${ext}`;
      const blob = new Blob([buffer], {
        type: mime
      });
      console.log(`File audio dibuat: ${filename} (${mime}, ${buffer.length} bytes)`);
      const form = new FormData();
      form.set("input_audio", blob, filename);
      form.set("platform", "5");
      form.set("is_recorded", "false");
      form.set("original_file_format", mime);
      form.set("original_file_size", buffer.length.toString());
      form.set("original_file_name", filename);
      const serverTime = await this.getServerTime();
      form.set("upload_started_at", serverTime);
      form.set("pre_processing_time", "16");
      console.log("FormData berhasil dibuat dengan waktu server.");
      console.log("Mengirim permintaan upload...");
      const uploadRes = await axios.post(this.uploadUrl, form, {
        headers: {
          ...this.uploadHeaders,
          ...form.headers
        }
      });
      console.log("Permintaan upload berhasil:", uploadRes.data);
      const task = uploadRes.data.noise_reduction_infos?.[0];
      const token = uploadRes.data.access_token;
      if (!task || !token) {
        console.error("Gagal mendapatkan ID tugas atau token:", {
          task: task,
          token: token
        });
        throw new Error("Gagal mendapatkan ID tugas atau token.");
      }
      console.log(`ID Tugas: ${task.id}, Token: ${token}`);
      console.log("Memulai polling...");
      return await this.poll(task.id, token);
    } catch (err) {
      console.error("Error:", err.message);
      return null;
    }
  }
  async poll(taskId, token) {
    const url = `https://apiv2.noise-reducer.com/denoiser/v3/noise-reductions/${taskId}/`;
    const headers = {
      ...this.headers,
      "access-token": token
    };
    console.log(`Memulai polling untuk tugas ID: ${taskId}`);
    try {
      while (true) {
        console.log(`Memeriksa status tugas ID: ${taskId}...`);
        const {
          data
        } = await axios.get(url, {
          headers: headers
        });
        console.log("Status tugas diterima:", data);
        if (data.conversion_status === 3 && data.progress_percentage === 100 && data.output_audio) {
          console.log("Pemrosesan selesai. Hasil:", data);
          return data;
        }
        console.log("Pemrosesan belum selesai, menunggu 2 detik...");
        await new Promise(res => setTimeout(res, 2e3));
      }
    } catch (err) {
      console.error("Polling error:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.audioUrl) {
    return res.status(400).json({
      error: "audioUrl are required"
    });
  }
  try {
    const noiseReducer = new NoiseReducer();
    const response = await noiseReducer.noiseRemove(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}