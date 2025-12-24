import axios from "axios";
import WebSocket from "ws";
class Dropmail {
  constructor() {
    this.baseUrl = "https://dropmail.me/api/graphql/web-test-wgq6m5i";
  }
  async create() {
    console.log("[LOG] Membuat email sementara...");
    try {
      const query = `mutation { introduceSession { id, expiresAt, addresses { address } } }`;
      const response = await axios.get(`${this.baseUrl}?query=${encodeURIComponent(query)}`);
      const data = response.data.data.introduceSession;
      console.log(`[LOG] Email sementara dibuat: ${data.addresses[0].address}`);
      return {
        success: true,
        email: data.addresses[0].address,
        sessionId: data.id
      };
    } catch (error) {
      console.error("[ERROR] Gagal membuat email sementara:", error.message);
      return {
        success: false,
        email: null,
        sessionId: null
      };
    }
  }
  async getOtp(sessionId) {
    if (!sessionId) return null;
    console.log("[LOG] Menunggu OTP masuk ke email...");
    try {
      const query = `query ($id: ID!) { session(id: $id) { mails { text } } }`;
      const variables = JSON.stringify({
        id: sessionId
      });
      while (true) {
        const response = await axios.get(`${this.baseUrl}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(variables)}`);
        const mails = response.data.data.session.mails || [];
        for (const mail of mails) {
          const match = mail.text.match(/\b\d{6}\b/);
          if (match) {
            console.log(`[LOG] OTP ditemukan: ${match[0]}`);
            return match[0];
          }
        }
        console.log("[LOG] OTP belum ditemukan, cek lagi dalam 3 detik...");
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    } catch (error) {
      console.error("[ERROR] Gagal mendapatkan OTP:", error.message);
      return null;
    }
  }
}
class InstaphotoAI {
  constructor() {
    this.baseUrl = "https://thethrivingcompany.com/Candidate";
    this.wsUrl = "wss://thethrivingcompany.com:4000/";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: "https://instaphotoai.com",
      referer: "https://instaphotoai.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10)"
    };
    this.dropmail = new Dropmail();
  }
  async getOtp(email) {
    console.log(`[LOG] Meminta OTP untuk email: ${email}`);
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/getOtp`, {
        email: email,
        password: "",
        app: "instaphotoai"
      }, {
        headers: this.headers
      });
      console.log("[LOG] Permintaan OTP berhasil.");
      return data.success;
    } catch (error) {
      console.error("[ERROR] Gagal meminta OTP:", error.message);
      return false;
    }
  }
  async verifyOtp(email, otp) {
    console.log(`[LOG] Verifikasi OTP ${otp} untuk email: ${email}`);
    try {
      const {
        data
      } = await axios.post(`${this.baseUrl}/verifyOtp`, {
        email: email,
        otp: otp,
        app: "instaphotoai",
        hasProDashboard: true
      }, {
        headers: this.headers
      });
      if (data.success) {
        console.log("[LOG] Verifikasi OTP berhasil.");
        return data.data.user;
      } else {
        console.log("[LOG] Verifikasi OTP gagal.");
        return null;
      }
    } catch (error) {
      console.error("[ERROR] Gagal verifikasi OTP:", error.message);
      return null;
    }
  }
  async generate({
    prompt,
    model = "flux-realism",
    height = 1216,
    width = 832,
    ratio = "1:1",
    style = "anime",
    count = 1,
    denoise = .75
  }) {
    console.log("[LOG] Memulai proses pembuatan gambar...");
    const tempEmail = await this.dropmail.create();
    if (!tempEmail.success) return {
      error: "Failed to create temp email"
    };
    const {
      email,
      sessionId
    } = tempEmail;
    const otpSent = await this.getOtp(email);
    if (!otpSent) return {
      error: "Failed to request OTP"
    };
    const otp = await this.dropmail.getOtp(sessionId);
    if (!otp) return {
      error: "Failed to retrieve OTP"
    };
    const user = await this.verifyOtp(email, otp);
    if (!user) return {
      error: "Authentication failed"
    };
    console.log("[LOG] Berhasil login! Menghubungkan ke WebSocket...");
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl, {
        headers: {
          Upgrade: "websocket",
          Origin: "https://instaphotoai.com",
          "User-Agent": this.headers["user-agent"]
        }
      });
      ws.on("open", () => {
        console.log("[LOG] WebSocket terbuka. Mengirim permintaan pembuatan gambar...");
        ws.send(JSON.stringify({
          type: "any-ai-photo",
          body: {
            height: height,
            width: width,
            app: "instaphotoai",
            device: "mobile",
            steps: 50,
            tiling: false,
            request_id: `${user._id}-c58fro3-${Date.now()}`,
            prompt: prompt,
            count: count,
            denoising_strength: denoise,
            model: model,
            aspectRatio: ratio,
            style: style
          },
          "x-auth": user.token
        }));
      });
      ws.on("message", message => {
        const response = JSON.parse(message);
        if (response.isFinal) {
          console.log("[LOG] Gambar berhasil dibuat!");
          ws.close();
          resolve(response);
        }
      });
      ws.on("error", error => {
        console.error("[ERROR] WebSocket Error:", error.message);
        reject({
          error: "WebSocket Error",
          details: error.message
        });
      });
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const instaphoto = new InstaphotoAI();
  try {
    const data = await instaphoto.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}