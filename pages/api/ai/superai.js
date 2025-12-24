import axios from "axios";
import {
  randomBytes
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class SuperAI {
  constructor() {
    console.log("Proses: Inisialisasi SuperAI client...");
    this.axios = axios.create();
    this.supabaseUrl = "https://rfwmbtfmrnshqktfjptx.supabase.co";
    this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmd21idGZtcm5zaHFrdGZqcHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQzNDE3ODUsImV4cCI6MjAzOTkxNzc4NX0.k0z-YGaJ0iBFmFED1Qjl3B4FHCKADkgtATBtj5cNCXo";
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://www.superai.id",
      referer: "https://www.superai.id/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.session = {};
  }
  _rand(length = 8) {
    return randomBytes(length).toString("hex");
  }
  applyPatch(currentText, patchString) {
    const lines = patchString.split("\n");
    let additions = "";
    for (const line of lines) {
      if (line.startsWith("+")) {
        additions += decodeURIComponent(line.substring(1));
      }
    }
    return currentText + additions;
  }
  parseStreamData(rawData) {
    const lines = rawData.trim().split("\n");
    let result = "",
      id = null,
      status = "incomplete";
    const chunk = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.artifacts) {
          const key = Object.keys(data.artifacts).find(k => k !== "_t");
          if (!key) continue;
          const artifact = data.artifacts[key];
          if (Array.isArray(artifact)) {
            const itemWithId = artifact.find(item => item && item.id);
            if (itemWithId) id = itemWithId.id;
            if (itemWithId?.content && !chunk.length) {
              result = itemWithId.content;
              chunk.push(result);
            }
          } else if (artifact?.content && Array.isArray(artifact.content)) {
            const contentArray = artifact.content;
            if (typeof contentArray[0] === "string" && contentArray[0].startsWith("@@")) {
              result = this.applyPatch(result, contentArray[0]);
            } else {
              result = contentArray[1] || result;
            }
            chunk.push(result);
          }
        } else if (data.status && ["created", "finished"].every(s => data.status.includes(s))) {
          status = "finished";
        }
      } catch (e) {}
    }
    return {
      status: status,
      result: result,
      id: id,
      chunk: chunk
    };
  }
  async _login() {
    console.log("Proses: Otentikasi...");
    try {
      const resp = await this.axios.post(`${this.supabaseUrl}/auth/v1/signup`, {
        email: `${this._rand(12)}@mail.com`,
        password: `Super_${this._rand(10)}`,
        data: {
          region: "id"
        }
      }, {
        headers: {
          ...this.baseHeaders,
          apikey: this.supabaseKey,
          authorization: `Bearer ${this.supabaseKey}`,
          "content-type": "application/json"
        }
      });
      this.session.accessToken = resp.data?.access_token ?? null;
      this.session.userId = resp.data?.user?.id ?? null;
      if (this.session.accessToken) console.log("Proses: Otentikasi berhasil.");
      return !!this.session.accessToken;
    } catch (error) {
      console.error("Error saat otentikasi:", error.response?.data?.msg || error.message);
      return false;
    }
  }
  async _regDev() {
    console.log("Proses: Registrasi perangkat...");
    if (!this.session.userId) return false;
    try {
      await this.axios.post("https://www.superai.id/api/device/register", {
        userId: this.session.userId,
        deviceFingerprint: this._rand(16)
      }, {
        headers: {
          ...this.baseHeaders,
          authorization: `Bearer ${this.session.accessToken}`
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  async _getRoom() {
    console.log("Proses: Mendapatkan room...");
    if (!this.session.accessToken) return false;
    try {
      const roomUrl = `${this.supabaseUrl}/rest/v1/room?select=id&purpose=eq.chat&limit=1`;
      const resp = await this.axios.get(roomUrl, {
        headers: {
          ...this.baseHeaders,
          apikey: this.supabaseKey,
          authorization: `Bearer ${this.session.accessToken}`
        }
      });
      this.session.roomId = resp.data[0]?.id || `32c${this._rand(10)}`;
      return true;
    } catch (e) {
      return false;
    }
  }
  async chat({
    prompt,
    ...rest
  }) {
    console.log(`\nProses: Memulai chat dengan prompt: "${prompt}"`);
    try {
      if (!await this._login()) throw new Error("Otentikasi gagal.");
      if (!await this._regDev()) throw new Error("Registrasi perangkat gagal.");
      if (!await this._getRoom()) throw new Error("Gagal mendapatkan room.");
      const replyId = `32c${this._rand(10)}`;
      const payload = {
        message: {
          id: `32c${this._rand(10)}`,
          created_at: new Date().toISOString(),
          content: prompt,
          participant_type: "customer",
          room_id: this.session.roomId,
          profile_id: this.session.userId,
          platform: "mobile_web",
          ...rest
        },
        reply: {
          id: replyId,
          created_at: new Date().toISOString(),
          participant_type: "bot",
          room_id: this.session.roomId,
          status: "created",
          content: "",
          platform: "mobile_web"
        },
        mode: "ask",
        platform: "mobile_web",
        options: {
          purpose: "chat"
        }
      };
      console.log("Proses: Mengirim pesan...");
      const chatResponse = await this.axios.post("https://www.superai.id/api/stream/pro", payload, {
        headers: {
          ...this.baseHeaders,
          "x-authorization": `Bearer ${this.session.accessToken}`,
          "x-reply-id": replyId
        },
        responseType: "stream"
      });
      return new Promise(resolve => {
        let rawData = "";
        chatResponse.data.on("data", chunk => {
          rawData += chunk.toString("utf-8");
        });
        chatResponse.data.on("end", () => {
          console.log("\nProses: Stream selesai. Mem-parsing data...");
          const parsedResult = this.parseStreamData(rawData);
          resolve(parsedResult);
        });
        chatResponse.data.on("error", err => {
          console.error("\nError pada stream:", err);
          resolve({
            status: "error",
            result: err.message,
            id: null,
            chunk: []
          });
        });
      });
    } catch (error) {
      console.error("Error dalam proses chat:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const client = new SuperAI();
    const response = await client.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}