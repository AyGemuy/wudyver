import axios from "axios";
import WebSocket from "ws";
class BlackInkGenerator {
  constructor() {
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuamFjZHRtYm54YW1iYWxuaWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjUyNTYzNzAsImV4cCI6MTk4MDgzMjM3MH0.rhxw6YU4yr7sk42UhC2zQDOR-u5Nx7OkII8w70KMaqk";
    this.baseUrl = "https://img.blackink.ai/";
  }
  async generate({
    prompt,
    style = ["surrealism"],
    bodyPart = "tall",
    height = 768,
    width = 512,
    is_public = true,
    modifiers = []
  }) {
    try {
      const authResponse = await axios.post("https://sb.blackink.ai/auth/v1/signup", {
        data: {},
        gotrue_meta_security: {}
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          apikey: this.apiKey,
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json;charset=UTF-8",
          origin: "https://blackink.ai",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-client-info": "supabase-js-web/2.54.0",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      const accessToken = authResponse.data?.access_token;
      const userId = authResponse.data?.user?.id;
      if (!accessToken || !userId) {
        throw new Error("Gagal mendapatkan token akses atau ID pengguna.");
      }
      const creationResponse = await axios.post("https://siqsgcrzci.execute-api.us-east-2.amazonaws.com/creations", {
        owner: userId,
        prompt: prompt,
        style: style,
        bodyPart: bodyPart,
        public: is_public,
        params: {
          height: height,
          width: width
        },
        modifiers: modifiers
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          origin: "https://blackink.ai",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const creationId = creationResponse.data?.data?.id;
      if (!creationId) {
        throw new Error("Gagal membuat permintaan pembuatan gambar.");
      }
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(`wss://sb.blackink.ai/realtime/v1/websocket?apikey=${this.apiKey}&vsn=1.0.0`);
        ws.on("open", () => {
          console.log("Koneksi WebSocket terbuka.");
          const joinPayload = {
            topic: `realtime:public:creations:id=eq.${creationId}`,
            event: "phx_join",
            payload: {
              config: {
                broadcast: {
                  ack: false,
                  self: false
                },
                presence: {
                  key: "",
                  enabled: false
                },
                postgres_changes: [{
                  event: "UPDATE",
                  schema: "public",
                  table: "creations",
                  filter: `id=eq.${creationId}`
                }],
                private: false
              }
            },
            ref: "1",
            join_ref: "1"
          };
          ws.send(JSON.stringify(joinPayload));
        });
        ws.on("message", data => {
          const message = JSON.parse(data);
          if (message.event === "postgres_changes" && message.payload?.data?.record?.status === "SUCCESS") {
            const imagePaths = message.payload.data.record.imagePaths ?? [];
            const result = imagePaths.map(path => `${this.baseUrl}${path}`);
            ws.close();
            resolve({
              result: result
            });
          }
        });
        ws.on("error", error => {
          console.error("Error WebSocket:", error);
          reject(error);
        });
        ws.on("close", () => {
          console.log("Koneksi WebSocket ditutup.");
        });
      });
    } catch (error) {
      console.error("Terjadi kesalahan:", error.response?.data || error.message);
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
    const generator = new BlackInkGenerator();
    const response = await generator.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}