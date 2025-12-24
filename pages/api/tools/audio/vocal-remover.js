import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import crypto from "crypto";
class VocalRemoverAPI {
  constructor(authKey = "e84yr70o0a5n08f5") {
    this.baseURL = "https://multimedia.easeus.com/vocal-remover-api";
    this.deviceId = uuidv4().replace(/-/g, "");
    this.webAppKey = "account_web";
    this.authKey = authKey;
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID,id;q=0.9",
        "access-control-allow-origin": "*",
        "content-type": "application/json;charset=UTF-8",
        "device-platform": "WEB",
        "device-type": "WEB",
        "device-uuid": this.deviceId,
        origin: "https://multimedia.easeus.com",
        pragma: "no-cache",
        priority: "u=1, i",
        "product-code": "TE-TES-TEST-WEB",
        "product-version-code": "1.0.0",
        referer: "https://multimedia.easeus.com/vocal-remover/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        sign: "",
        timestamp: "",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  generateNonce(length = 20) {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  sortAndStringifyPayload(payload) {
    const sortedKeys = Object.keys(payload).sort();
    const sortedPayload = {};
    sortedKeys.forEach(key => {
      const value = payload[key];
      if (Array.isArray(value)) {
        sortedPayload[key] = value.concat().sort();
      } else if (typeof value === "object" && value !== null) {
        sortedPayload[key] = JSON.stringify(value);
      } else {
        sortedPayload[key] = value;
      }
    });
    return sortedPayload;
  }
  convertToQueryString(params, shouldEncode) {
    let queryString = "";
    const data = params || {};
    for (const key in data) {
      const value = data[key];
      const encodedValue = shouldEncode ? encodeURIComponent(value) : value;
      if (typeof value === "object" && value !== null) {
        queryString += `${key}=${JSON.stringify(value)}&`;
      } else if (Array.isArray(value)) {
        queryString += value.map(item => `${key}=${encodedValue}`).join("&") + "&";
      } else {
        queryString += `${key}=${encodedValue}&`;
      }
    }
    return queryString.slice(0, -1);
  }
  generateSign(payload, timestamp) {
    const secret = "VocalRemoverWebApi";
    const sortedPayload = this.sortAndStringifyPayload(payload || {});
    sortedPayload.appKey = "OM";
    sortedPayload.timestamp = timestamp;
    const queryString = this.convertToQueryString(sortedPayload, false);
    const signString = secret + queryString + secret;
    return crypto.createHash("md5").update(signString).digest("hex");
  }
  async generateAuthData() {
    const timestamp = Math.floor(Date.now() / 1e3);
    const nonce = this.generateNonce();
    return {
      nonce: nonce,
      timestamp: timestamp
    };
  }
  async createTask({
    audioUrl,
    format = "mp3",
    action = 1,
    interval = 3e3
  }) {
    const {
      nonce,
      timestamp
    } = await this.generateAuthData();
    const payload = {
      link: audioUrl,
      format: format,
      action: action,
      nonce: nonce,
      web_app_key: this.webAppKey
    };
    const sign = this.generateSign(payload, timestamp);
    const headers = {
      timestamp: timestamp.toString(),
      sign: sign
    };
    try {
      const createTaskResponse = await this.apiClient.post("/task/link", payload, {
        headers: headers
      });
      console.log("Proses: createTask, Respon Pembuatan Task:", createTaskResponse);
      if (createTaskResponse?.data?.data?.task_id) {
        const taskId = createTaskResponse.data.data.task_id;
        console.log("Proses: createTask, ID Task:", taskId);
        console.log("Proses: createTask, Memulai polling task hingga selesai...");
        return await this.pollTaskUntilProgressComplete(taskId, interval);
      } else {
        console.log("Proses: createTask, Status: Gagal, Pesan:", createTaskResponse?.message || "Gagal mendapatkan task ID dari respon.");
        throw new Error(createTaskResponse?.message || "Gagal mendapatkan task ID dari respon.");
      }
    } catch (error) {
      console.error("Proses: createTask, Status: Error, Gagal membuat dan memproses task:", error);
      throw error;
    }
  }
  async queryTask(taskId) {
    const {
      nonce,
      timestamp
    } = await this.generateAuthData();
    const payload = {
      nonce: nonce,
      web_app_key: this.webAppKey,
      task_id: taskId
    };
    const sign = this.generateSign(payload, timestamp);
    const headers = {
      timestamp: timestamp.toString(),
      sign: sign
    };
    try {
      const response = await this.apiClient.get(`/task/query/${taskId}`, {
        headers: headers
      });
      return response.data;
    } catch (error) {
      console.error(`Proses: queryTask, ID: ${taskId}, Status: Gagal, Gagal melakukan query task:`, error);
      throw error;
    }
  }
  async pollTaskUntilProgressComplete(taskId, interval = 2e3) {
    while (true) {
      try {
        const taskInfo = await this.queryTask(taskId);
        console.log(`Proses: pollTask, ID: ${taskId}, Status: ${taskInfo?.code === 200 ? "Memeriksa" : "Gagal"}, Progress: ${taskInfo?.data?.progress || 0}%, Memeriksa status task...`);
        if (taskInfo?.code === 200 && taskInfo.data?.progress === 100) {
          console.log(`Proses: pollTask, ID: ${taskId}, Status: Selesai, Progress: 100%, Task selesai:`, taskInfo.data);
          return taskInfo.data;
        } else if (taskInfo?.code !== 200) {
          console.error(`Proses: pollTask, ID: ${taskId}, Status: Gagal, Polling gagal dengan kode: ${taskInfo?.code}, pesan: ${taskInfo?.message}`);
          throw new Error(`Polling gagal dengan kode: ${taskInfo?.code}, pesan: ${taskInfo?.message}`);
        }
      } catch (error) {
        console.error(`Proses: pollTask, ID: ${taskId}, Status: Error, Terjadi kesalahan saat polling:`, error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
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
    const vocalRemover = new VocalRemoverAPI();
    const response = await vocalRemover.createTask(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}