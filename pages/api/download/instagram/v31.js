import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import WebSocket from "ws";
import crypto from "crypto";
import * as cheerio from "cheerio";
const BASE_URL = "https://instasaver.io";
const API_URL = "https://media.instasaver.io/api";
const WS_URL = "wss://media.instasaver.io/socket.io/?EIO=4&transport=websocket";
const SIGN_KEY = "7f8a9b2c4d6e1f3a5b7c9d0e2f4a6b8c9d1e3f5a7b9c0d2e4f6a8b0c2d4e6f8a0";
class InstaWs {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        origin: BASE_URL,
        referer: BASE_URL + "/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID"
      }
    }));
    this.csrfToken = null;
  }
  log(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);
  }
  nonce() {
    return crypto.randomBytes(16).toString("hex");
  }
  sign(data, ts) {
    const str = Object.keys(data).sort().map(k => `${k}=${JSON.stringify(data[k])}`).join("&");
    const payload = `${str}&ts=${ts}`;
    return crypto.createHmac("sha256", Buffer.from(SIGN_KEY)).update(new TextEncoder().encode(payload)).digest("hex");
  }
  headers(data) {
    const ts = Date.now().toString();
    const n = this.nonce();
    const s = this.sign(data, ts);
    return {
      "x-timestamp": ts,
      "x-signature": s,
      "x-nonce": n,
      "x-csrf-token": this.csrfToken || "",
      "content-type": "application/json"
    };
  }
  async init() {
    try {
      this.log("Mengambil halaman utama & token...");
      const home = await this.client.get(BASE_URL);
      const $ = cheerio.load(home.data);
      const title = $("title").text();
      this.log(`Terhubung ke: ${title}`);
      const res = await this.client.get(`${API_URL}/csrf-token`);
      this.csrfToken = res.data?.token;
      if (!this.csrfToken) throw new Error("Gagal mengambil CSRF Token");
      this.log(`CSRF Token didapat: ${this.csrfToken.substring(0, 10)}...`);
    } catch (e) {
      this.log(e.message, "error");
      throw e;
    }
  }
  async makeJob(url) {
    try {
      const body = {
        url: url
      };
      const conf = {
        headers: this.headers(body)
      };
      this.log("Membuat job pemrosesan...");
      const res = await this.client.post(`${API_URL}/instagram/job`, body, conf);
      const jobId = res.data?.data?.jobId;
      if (!jobId) throw new Error("Job ID tidak ditemukan");
      this.log(`Job Created: ${jobId}`);
      return jobId;
    } catch (e) {
      this.log(`Gagal membuat job: ${e.message}`, "error");
      throw e;
    }
  }
  async ws(jobId) {
    return new Promise((resolve, reject) => {
      this.log("Menghubungkan WebSocket...");
      const ws = new WebSocket(WS_URL, {
        headers: {
          Origin: BASE_URL,
          "User-Agent": this.client.defaults.headers["user-agent"]
        }
      });
      let pingInterval;
      ws.on("open", () => {
        this.log("WS Terbuka, menunggu handshake...");
      });
      ws.on("message", raw => {
        const msg = raw.toString();
        if (msg.startsWith("0")) {
          const data = JSON.parse(msg.slice(1));
          this.log(`WS Handshake OK. Ping Interval: ${data.pingInterval}`);
          ws.send("40");
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send("3");
          }, data.pingInterval || 25e3);
        } else if (msg.startsWith("40")) {
          this.log("WS Connected (40). Mengirim Join Job...");
          ws.send(`42["join-job","${jobId}"]`);
        } else if (msg.startsWith("42")) {
          try {
            const [event, payload] = JSON.parse(msg.slice(2));
            if (event === "job:analyzing:global" || event === "job:status") {
              const progress = payload?.progress || 0;
              const status = payload?.status || "processing";
              this.log(`Status: ${status} (${progress}%)`);
            }
            if (event === "job:completed:global") {
              this.log("Job Selesai!");
              ws.send(`42["leave-job","${jobId}"]`);
              ws.close();
              clearInterval(pingInterval);
              resolve(payload?.result);
            }
          } catch (e) {}
        }
      });
      ws.on("error", e => {
        clearInterval(pingInterval);
        reject(e);
      });
      ws.on("close", () => {
        clearInterval(pingInterval);
      });
    });
  }
  async download({
    url,
    ...rest
  }) {
    const start = Date.now();
    this.log(`Memulai download untuk: ${url}`);
    try {
      if (!this.csrfToken) await this.init();
      const jobId = await this.makeJob(url);
      const result = await this.ws(jobId);
      const duration = ((Date.now() - start) / 1e3).toFixed(2);
      this.log(`Proses selesai dalam ${duration} detik.`);
      return result;
    } catch (e) {
      this.log(`Download fatal error: ${e.message}`, "error");
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new InstaWs();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}