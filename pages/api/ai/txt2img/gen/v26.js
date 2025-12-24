import WebSocket from "ws";
import crypto from "crypto";
class TrooperImageGenerator {
  constructor() {
    this.url = "wss://imagine.trooper.ai/";
    this.userId = this._generateUUID();
    this.ws = null;
    this.pendingPromise = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.connectionPromise = null;
    const randomIp = this._generateRandomIP();
    this.headers = {
      Upgrade: "websocket",
      Origin: "https://imagine.trooper.ai",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Connection: "Upgrade",
      "Sec-WebSocket-Key": crypto.randomBytes(16).toString("base64"),
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "X-Forwarded-For": randomIp,
      "Client-IP": randomIp
    };
    console.log("Initializing TrooperImageGenerator");
    console.log(`User ID: ${this.userId}`);
    console.log(`Target URL: ${this.url}`);
    console.log(`Spoofed IP: ${randomIp}`);
  }
  _generateUUID() {
    return crypto.randomUUID();
  }
  _generateRandomIP() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 256)).join(".");
  }
  async _connectAndInitialize() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isInitialized) {
      console.log("Log: WebSocket is already connected and initialized.");
      return;
    }
    console.log("Proses: Memulai koneksi WebSocket.");
    this.ws = new WebSocket(this.url, {
      headers: this.headers
    });
    this.connectionPromise = new Promise((resolve, reject) => {
      this.ws.on("open", () => {
        console.log("Log: WebSocket connection established.");
        resolve();
      });
      this.ws.on("error", error => {
        console.error(`Error: WebSocket error: ${error.message}`);
        this.pendingPromise?.reject(error);
        this.initPromise?.reject(error);
        reject(error);
      });
      this.ws.on("close", (code, reason) => {
        console.log(`Log: WebSocket connection closed - Code: ${code}, Reason: ${reason}`);
        const closeError = new Error("WebSocket connection closed unexpectedly.");
        this.pendingPromise?.reject(closeError);
        this.initPromise?.reject(closeError);
        reject(closeError);
      });
    });
    this.ws.on("message", data => {
      console.log(`Log: Received message: ${data.length} bytes`);
      this._handleMessage(data);
    });
    await this.connectionPromise;
    await this._initialize();
    console.log("Proses: Koneksi dan inisialisasi selesai.");
  }
  async _initialize() {
    console.log("Proses: Starting initialization sequence...");
    return new Promise((resolve, reject) => {
      this.initPromise = {
        resolve: resolve,
        reject: reject
      };
      const helloMessage = {
        type: "hello",
        user: this.userId,
        channel: "socket",
        user_profile: null
      };
      console.log("Log: Sending hello message:", JSON.stringify(helloMessage));
      this.ws.send(JSON.stringify(helloMessage));
      const hiMessage = {
        type: "message",
        text: "Hi!",
        user: this.userId,
        channel: "websocket"
      };
      console.log("Log: Sending Hi! message:", JSON.stringify(hiMessage));
      this.ws.send(JSON.stringify(hiMessage));
    });
  }
  _handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Log: Parsed message type: ${message.type}`);
      if (!this.isInitialized && this.initPromise) {
        if (message.type === "message" && message.text && message.text.includes("Welcome! I create images")) {
          console.log("Log: Received welcome message - initialization complete.");
          this.isInitialized = true;
          this.initPromise.resolve();
          this.initPromise = null;
          return;
        }
      }
      if (this.pendingPromise && this.isInitialized) {
        if (message.type === "message" && message.attachment && message.attachment.type === "image") {
          if (message.quick_replies) {
            console.log("Log: Final image data received. Resolving promise and closing connection.");
            this.pendingPromise.resolve(message);
            this.pendingPromise = null;
            this.close();
          } else {
            console.log("Log: Intermediate image data received. Waiting for the final result.");
          }
        } else {
          console.log("Log: Message received but not a valid image data payload.");
        }
      }
    } catch (error) {
      console.error(`Error: Failed to parse message: ${error.message}`);
      if (this.pendingPromise) {
        this.pendingPromise.reject(new Error("Failed to parse response message."));
        this.pendingPromise = null;
      }
      if (this.initPromise) {
        this.initPromise.reject(new Error("Failed to parse initialization message."));
        this.initPromise = null;
      }
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log("Proses: Starting generation request");
    console.log(`Proses: Prompt: "${prompt}"`);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isInitialized) {
      await this._connectAndInitialize();
    }
    console.log("Proses: Initialization completed, proceeding with generation.");
    if (this.pendingPromise) {
      console.log("Error: A generation request is already in progress.");
      throw new Error("A generation request is already in progress.");
    }
    return new Promise((resolve, reject) => {
      this.pendingPromise = {
        resolve: resolve,
        reject: reject
      };
      const payload = {
        type: "message",
        text: prompt,
        user: this.userId,
        channel: "websocket",
        ...rest
      };
      console.log("Log: Sending payload to WebSocket.");
      this.ws.send(JSON.stringify(payload));
      console.log("Proses: Request sent, waiting for response...");
    });
  }
  close() {
    console.log("Proses: Closing WebSocket connection");
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new TrooperImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}