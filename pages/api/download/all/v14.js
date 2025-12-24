import WebSocket from "ws";
class VidExtractWS {
  constructor() {
    this.url = "wss://vidextract-8p20.onrender.com/";
    this.ws = null;
  }
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, {
          headers: {
            Upgrade: "websocket",
            Origin: "https://www.vidextract.com",
            "Cache-Control": "no-cache",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            Pragma: "no-cache",
            Connection: "Upgrade",
            "Sec-WebSocket-Key": "H7X6TmBTXiOxclojDZf4yA==",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
          }
        });
        this.ws.on("open", () => resolve());
        this.ws.on("error", err => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }
  async sendMessage(msg) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return reject(new Error("WebSocket belum terhubung"));
        }
        const data = JSON.stringify({
          post: "validate",
          msg: msg,
          mode: "all"
        });
        this.ws.send(data, err => {
          if (err) return reject(err);
        });
        this.ws.on("message", message => {
          resolve(JSON.parse(message.toString()));
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  close() {
    try {
      if (this.ws) {
        this.ws.close();
      }
    } catch (error) {
      console.error("Error saat menutup koneksi:", error);
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const wsClient = new VidExtractWS();
    await wsClient.connect();
    const response = await wsClient.sendMessage(url);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  } finally {
    wsClient.close();
  }
}