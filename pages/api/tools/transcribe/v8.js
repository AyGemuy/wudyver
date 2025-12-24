import axios from "axios";
const API = "https://api.1transcribe.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class OneTranscribe {
  constructor() {
    this.ax = axios.create({
      baseURL: API,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        "user-agent": UA,
        origin: "https://1transcribe.com",
        referer: "https://1transcribe.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        priority: "u=1, i"
      }
    });
    this._token = null;
    this._tokenExp = 0;
    this.ax.interceptors.request.use(async config => {
      await this.ensureToken();
      if (this._token) config.headers.authorization = this._token;
      return config;
    });
    this.ax.interceptors.response.use(r => r, async err => {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log("Token expired → refresh...");
        this._token = null;
        this._tokenExp = 0;
        await this.ensureToken();
        if (this._token) {
          err.config.headers.authorization = this._token;
          return this.ax(err.config);
        }
      }
      return Promise.reject(err);
    });
  }
  async ensureToken() {
    const now = Math.floor(Date.now() / 1e3);
    if (this._token && this._tokenExp > now + 60) return this._token;
    return await this.fetchToken();
  }
  async fetchToken() {
    try {
      console.log("Mengambil guest token...");
      const {
        data
      } = await axios.post(API + "/", {
        event: {
          action: "GetGuestToken",
          payload: {}
        }
      }, {
        headers: {
          "content-type": "application/json",
          "user-agent": UA,
          origin: "https://1transcribe.com",
          referer: "https://1transcribe.com/"
        }
      });
      console.log("Response GetGuestToken:", JSON.stringify(data, null, 2));
      const token = data?.data?.accessToken;
      if (!token) throw new Error("Token tidak ditemukan");
      this._token = token;
      try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
        this._tokenExp = payload.exp;
        console.log(`Token OK → exp: ${new Date(payload.exp * 1e3).toLocaleString()}`);
      } catch {
        this._tokenExp = now + 1800;
      }
      return token;
    } catch (err) {
      console.log("Gagal ambil token:", err.response?.data || err.message);
      return null;
    }
  }
  async getUploadData(fileName = "audio.wav") {
    try {
      const payload = {
        event: {
          action: "TranscriptV2",
          payload: {
            type: "getUploadData",
            payload: {
              fileName: fileName
            }
          }
        }
      };
      console.log("Request getUploadData:", JSON.stringify(payload, null, 2));
      const {
        data
      } = await this.ax.post("/", payload);
      console.log("Response getUploadData:", JSON.stringify(data, null, 2));
      return data?.data || null;
    } catch (err) {
      console.log("Error getUploadData:", err.response?.data || err.message);
      return null;
    }
  }
  async uploadToPresigned(uploadUrl, audio) {
    try {
      let buffer;
      if (typeof audio === "string" && audio.startsWith("http")) {
        console.log("Download dari URL:", audio);
        const res = await axios.get(audio, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data);
      } else if (Buffer.isBuffer(audio) || audio instanceof Uint8Array) {
        buffer = Buffer.from(audio);
      } else if (typeof audio === "string" && audio.startsWith("data:")) {
        buffer = Buffer.from(audio.split(",")[1], "base64");
      } else {
        throw new Error("Format audio tidak didukung");
      }
      console.log(`Upload ${buffer.length} bytes...`);
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": "application/octet-stream"
        },
        maxBodyLength: Infinity
      });
      console.log("Upload berhasil");
    } catch (err) {
      console.log("Error upload:", err.message);
      throw err;
    }
  }
  async submitTask(fileName, language, downloadUrl) {
    try {
      const payload = {
        event: {
          action: "TranscriptV2",
          payload: {
            type: "create",
            payload: {
              type: "audio_or_video_import",
              fileName: fileName,
              language: language,
              originalFileUrl: downloadUrl,
              status: "transcription_started",
              segments: []
            }
          }
        }
      };
      console.log("Request submit task:", JSON.stringify(payload, null, 2));
      const {
        data
      } = await this.ax.post("/", payload);
      console.log("Response submit task:", JSON.stringify(data, null, 2));
      const taskId = data?.data?.transcript?.id;
      if (!taskId) throw new Error("Tidak ada task ID dari server");
      console.log(`Task ID dari server: ${taskId}`);
      return taskId;
    } catch (err) {
      console.log("Error submit task:", err.response?.data || err.message);
      throw err;
    }
  }
  async getStatus(taskId) {
    try {
      const payload = {
        event: {
          action: "TranscriptV2",
          payload: {
            type: "get",
            payload: {
              id: taskId
            }
          }
        }
      };
      const {
        data
      } = await this.ax.post("/", payload);
      console.log(`Response status [${taskId}]:`, JSON.stringify(data, null, 2));
      return data?.data?.transcript || null;
    } catch (err) {
      console.log("Error get status:", err.response?.data || err.message);
      return null;
    }
  }
  async generate({
    input: audio,
    language = "id",
    fileName = "audio.wav",
    delay = 3e3,
    maxPoll = 80
  } = {}) {
    try {
      console.log("Mulai transkripsi...");
      const uploadData = await this.getUploadData(fileName);
      if (!uploadData?.uploadUrl) throw new Error("Gagal dapatkan presigned URL");
      await this.uploadToPresigned(uploadData.uploadUrl, audio);
      const downloadUrl = uploadData.downloadUrl || uploadData.uploadUrl.split("?")[0];
      const taskId = await this.submitTask(fileName, language, downloadUrl);
      console.log(`Polling status untuk task: ${taskId}`);
      for (let i = 0; i < maxPoll; i++) {
        await new Promise(r => setTimeout(r, delay));
        const status = await this.getStatus(taskId);
        if (!status) {
          console.log(`Polling ${i + 1}/${maxPoll} → belum ada data`);
          continue;
        }
        const prog = status.progress ? ` (${status.progress}%)` : "";
        console.log(`Status [${i + 1}]: ${status.status}${prog}`);
        if (status.status === "transcription_completed") {
          console.log("TRANSCRIPT SELESAI 100%!");
          return status;
        }
        if (status.status === "failed") {
          throw new Error(status.error || "Transkripsi gagal");
        }
      }
      throw new Error(`Timeout setelah ${maxPoll} polling`);
    } catch (err) {
      console.log("TRANSCRIPT GAGAL:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new OneTranscribe();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}