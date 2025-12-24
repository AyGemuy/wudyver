import axios from "axios";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class BananaGen {
  constructor(config = {}) {
    this.baseApiUrl = config.baseApiUrl || "https://bananaai.me/api/protected";
    this.headers = {
      accept: "application/json, text/plain, */*",
      origin: "https://bananaai.me",
      referer: "https://bananaai.me/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      cookie: `ba_client_id=${this.generateClientId()}`,
      ...SpoofHead()
    };
    console.log("Kelas BananaGen telah diinisialisasi.");
  }
  generateClientId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  async _hImg(source) {
    if (Buffer.isBuffer(source)) {
      console.log("Memproses gambar dari Buffer.");
      return source;
    }
    if (typeof source === "string") {
      if (source.startsWith("http")) {
        console.log(`Memproses gambar dari URL: ${source.substring(0, 50)}...`);
        const response = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (source.startsWith("data:image")) {
        console.log("Memproses gambar dari string Base64.");
        const base64Data = source.split(",")[1];
        return Buffer.from(base64Data, "base64");
      }
    }
    throw new Error("Format imageUrl tidak didukung. Gunakan URL, Base64, atau Buffer.");
  }
  async pollTask(taskUuid) {
    console.log(`Memulai polling untuk tugas: ${taskUuid}`);
    const pollInterval = 3e3;
    const maxAttempts = 60;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.baseApiUrl}/get-list`, {
          headers: this.headers
        });
        const task = response.data.data.find(t => t.uuid === taskUuid);
        if (task) {
          console.log(`Status tugas ${taskUuid}: ${task.status_human}`);
          if (task.status === 2) {
            console.log("Tugas berhasil diselesaikan.");
            return this.parseResult(task);
          } else if (task.status === 3) {
            console.error("Tugas gagal:", task.error);
            return this.parseResult(task);
          }
        }
      } catch (error) {
        console.error("Error saat polling:", error?.response?.data || error?.message || error);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    console.error(`Tugas ${taskUuid} tidak selesai dalam waktu yang ditentukan.`);
    return null;
  }
  parseResult(task) {
    if (!task) {
      return {
        status: "Gagal",
        result: [],
        prompt: "Tidak diketahui"
      };
    }
    const resultUrls = task.result?.resultUrls?.map(url => `https://bananaai.me${url}`) || [];
    return {
      status: task.status_human || "Tidak diketahui",
      result: resultUrls,
      prompt: task.user_inputs?.prompt || ""
    };
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    console.log("--- Memulai proses pembuatan gambar ---");
    try {
      const form = new FormData();
      form.append("prompt", prompt || "Sebuah pemandangan fantasi yang indah");
      console.log(`Prompt: "${prompt}"`);
      const genType = imageUrl ? "image-to-image" : "text-to-image";
      form.append("generation_type", genType);
      console.log(`Tipe generasi: ${genType}`);
      if (imageUrl) {
        const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
        console.log(`Mempersiapkan ${images.length} gambar untuk diunggah secara sekuensial.`);
        let index = 0;
        for (const imgSource of images) {
          const buffer = await this._hImg(imgSource);
          form.append("images", buffer, {
            filename: `image_${index}.png`
          });
          console.log(`Gambar ${index + 1} dari ${images.length} telah diproses dan ditambahkan ke form.`);
          index++;
        }
        console.log("Semua gambar telah diproses dan ditambahkan secara sekuensial.");
      }
      for (const key in rest) {
        form.append(key, rest[key]);
      }
      if (Object.keys(rest).length > 0) console.log("Paramenter tambahan ditambahkan:", rest);
      console.log("Mengirim permintaan ke API...");
      const response = await axios.post(`${this.baseApiUrl}/gen-image`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log("--- Proses pembuatan berhasil, memulai polling ---");
      const initialTask = response.data.data;
      if (initialTask && initialTask.uuid) {
        return await this.pollTask(initialTask.uuid);
      } else {
        console.error("Tidak menerima UUID tugas yang valid dari API.");
        return null;
      }
    } catch (error) {
      console.error("--- Terjadi error saat proses pembuatan ---");
      console.error("Detail error:", error?.response?.data || error?.message || error);
      return null;
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
  const api = new BananaGen();
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