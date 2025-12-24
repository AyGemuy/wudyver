import axios from "axios";
class MusicAIClient {
  constructor() {
    this.apiClient = axios.create({
      baseURL: "https://musicai-v2.kzy.app/api",
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.token = null;
    this.config = {
      platform: "android",
      deviceId: `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
    };
  }
  async _ensureAuth() {
    if (this.token) return;
    console.log("[AUTH] Token tidak ditemukan, melakukan registrasi otomatis...");
    try {
      const response = await this.apiClient.post("/auth/login", {
        device_id: this.config.deviceId,
        platform: this.config.platform
      });
      const receivedToken = response.data?.token;
      if (!receivedToken) throw new Error("Respons registrasi tidak mengandung token.");
      this.token = receivedToken;
      this.apiClient.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
      console.log("[AUTH] Registrasi berhasil dan token telah diatur.");
    } catch (error) {
      console.error("[AUTH] Gagal melakukan registrasi otomatis.", error.response?.data || error.message);
      throw error;
    }
  }
  async lyrics({
    prompt
  }) {
    if (!prompt) throw new Error("Properti `prompt` wajib diisi untuk membuat lirik.");
    await this._ensureAuth();
    console.log(`\n[API] Mengirim permintaan lirik dengan prompt: "${prompt}"...`);
    try {
      const response = await this.apiClient.post("/producer/lyrics", {
        prompt: prompt
      });
      console.log(`[API] Berhasil! Status: ${response.status}`);
      console.log("[API] Data Respons:\n", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`[API] Gagal membuat lirik.`);
      if (error.response) {
        console.error(`       -> Status: ${error.response.status}`);
        console.error(`       -> Data Error: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        console.error(`       -> Error: ${error.message}`);
      }
      throw error;
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
    const client = new MusicAIClient();
    const response = await client.lyrics(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}