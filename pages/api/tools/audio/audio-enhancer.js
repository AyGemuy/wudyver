import axios from "axios";
import {
  Blob,
  FormData
} from "formdata-node";
import {
  v4 as uuidv4
} from "uuid";
class NoiseReducer {
  constructor() {
    this.uploadUrl = "https://audioenhancer.ai/wp-content/plugins/audioenhancer/requests/noiseremoval/noiseremovallimited.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      connection: "keep-alive",
      origin: "https://audioenhancer.ai",
      pragma: "no-cache",
      referer: "https://audioenhancer.ai/background-noise-remover/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest",
      priority: "u=1, i"
    };
    this.uploadHeaders = {
      ...this.headers,
      "Content-Type": "multipart/form-data"
    };
    console.log("NoiseReducer diinisialisasi.");
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
      const filename = "AUD-" + new Date().toISOString().slice(0, 10) + "-" + Math.random().toString(36).substring(7) + ".mp3";
      const blob = new Blob([buffer], {
        type: mime
      });
      console.log(`File audio dibuat: ${filename} (${mime}, ${buffer.length} bytes)`);
      const form = new FormData();
      form.set("media", blob, filename);
      const fingerprint = uuidv4().replace(/-/g, "");
      form.set("fingerprint", fingerprint);
      console.log(`Fingerprint yang dihasilkan: ${fingerprint}`);
      console.log("FormData berhasil dibuat.");
      console.log("Mengirim permintaan upload...");
      const uploadRes = await axios.post(this.uploadUrl, form, {
        headers: {
          ...this.uploadHeaders,
          ...form.headers
        }
      });
      console.log("Permintaan upload berhasil:", uploadRes.data);
      return uploadRes.data;
    } catch (err) {
      console.error("Error:", err.message);
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