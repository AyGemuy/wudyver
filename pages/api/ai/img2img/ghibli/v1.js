import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class GhibliProcessor {
  constructor() {
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: "Bearernull",
      "content-type": "application/json",
      origin: "https://ghibli.best",
      priority: "u=1, i",
      referer: "https://ghibli.best/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.taskId = null;
  }
  async generate({
    imageUrl
  }) {
    try {
      console.log("[Ghibli] Mengirim permintaan awal...");
      const createRes = await axios.post("https://z.mp3drink.cc/i2x_task_id", {
        input_path: imageUrl
      }, {
        headers: this.headers
      });
      this.taskId = createRes.data.task_id;
      if (!this.taskId) throw new Error("Task ID tidak ditemukan");
      console.log(`[Ghibli] Task ID diterima: ${this.taskId}`);
      const start = Date.now();
      const maxTime = 60 * 60 * 1e3;
      const pollInterval = 5e3;
      while (Date.now() - start < maxTime) {
        console.log(`[Ghibli] Memeriksa status untuk Task ID: ${this.taskId}`);
        const pollRes = await axios.post("https://z.mp3drink.cc/i2xx_task_result", {
          task_id: this.taskId
        }, {
          headers: this.headers
        });
        const {
          task_id: newTaskId,
          status,
          result
        } = pollRes.data;
        if (newTaskId && newTaskId !== this.taskId) {
          console.log(`[Ghibli] Task ID diperbarui: ${newTaskId}`);
          this.taskId = newTaskId;
        }
        if (status === "SUCCESS") {
          console.log("[Ghibli] Proses selesai. Hasil diterima.");
          return result;
        }
        if (status === "FAILED") {
          throw new Error("Task gagal diproses");
        }
        console.log(`[Ghibli] Status saat ini: ${status}. Menunggu 5 detik...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      throw new Error("Timeout: Task tidak selesai dalam 1 jam");
    } catch (err) {
      console.error(`[Ghibli] Terjadi kesalahan: ${err.message}`);
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
  const processor = new GhibliProcessor();
  try {
    const data = await processor.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}