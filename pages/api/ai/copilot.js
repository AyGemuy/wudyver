import axios from "axios";
import WebSocket from "ws";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class Copilot {
  constructor() {
    console.log("[LOG] Proses: Inisialisasi Copilot client...");
    this.axios = axios.create();
    this.baseHeaders = this.genHeader();
    this.conversation = null;
    this.cookies = "";
  }
  genHeader() {
    return {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "id,ms;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      Origin: "https://copilot.microsoft.com",
      Referer: "https://copilot.microsoft.com/",
      "Sec-Ch-Ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      ...SpoofHead()
    };
  }
  _logError(error, context) {
    console.error(`[ERROR] Terjadi kesalahan pada: ${context}`);
    if (error.response) {
      console.error(`  Status Code: ${error.response.status}`);
      console.error(`  Data       : ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error("  Request    : Tidak ada respons yang diterima dari server.");
    } else {
      console.error(`  Pesan      : ${error.message}`);
    }
  }
  _getImageType(buffer) {
    const header = buffer.toString("hex", 0, 4).toUpperCase();
    if (header.startsWith("FFD8FF")) return "image/jpeg";
    if (header.startsWith("89504E47")) return "image/png";
    if (header.startsWith("47494638")) return "image/gif";
    if (header.startsWith("52494646")) {
      const webpHeader = buffer.toString("ascii", 8, 12);
      if (webpHeader === "WEBP") return "image/webp";
    }
    if (header.startsWith("424D")) return "image/bmp";
    return "image/jpeg";
  }
  async genConversation() {
    console.log("[LOG] Proses: Membuat percakapan baru...");
    try {
      const response = await this.axios.post("https://copilot.microsoft.com/c/api/conversations", null, {
        headers: {
          ...this.baseHeaders,
          "Content-Type": "application/json"
        }
      });
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.map(cookie => cookie.split(";")[0]).join("; ");
        console.log("[LOG] Info: Cookies berhasil diekstrak dan disimpan.");
      }
      this.conversation = response.data;
      const conversationId = this.conversation?.id || "Tidak Ditemukan";
      console.log(`[LOG] Proses: Percakapan berhasil dibuat. ID: ${conversationId}`);
      return this.conversation;
    } catch (error) {
      this._logError(error, "genConversation()");
      throw new Error("Gagal membuat percakapan.");
    }
  }
  async genImage(imageUrl) {
    console.log("[LOG] Proses: Mengunggah gambar...");
    if (!this.conversation?.id) {
      throw new Error("Sesi belum diinisialisasi. Panggil genConversation() terlebih dahulu.");
    }
    try {
      let imageData;
      let contentType = "image/jpeg";
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        const imgResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        imageData = Buffer.from(imgResponse.data);
        contentType = imgResponse.headers["content-type"] || this._getImageType(imageData);
      } else if (Buffer.isBuffer(imageUrl)) {
        imageData = imageUrl;
        contentType = this._getImageType(imageData);
      } else {
        throw new Error("Format imageUrl tidak valid (harus URL atau Buffer).");
      }
      console.log(`[LOG] Info: Menggunakan Content-Type: ${contentType}`);
      const uploadHeaders = {
        "Content-Type": contentType,
        "User-Agent": this.baseHeaders["User-Agent"],
        Referer: `https://copilot.microsoft.com/chats/${this.conversation.id}`,
        Cookie: this.cookies,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9"
      };
      const response = await this.axios.post("https://copilot.microsoft.com/c/api/attachments", imageData, {
        headers: uploadHeaders,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      console.log(`[LOG] Proses: Gambar berhasil diunggah. URL: ${response.data?.url}`);
      return response.data;
    } catch (error) {
      this._logError(error, "genImage()");
      throw new Error("Gagal mengunggah gambar.");
    }
  }
  async chat({
    prompt,
    imageUrl,
    mode,
    conversationId,
    ...rest
  }) {
    const promptLog = prompt ? `"${prompt.substring(0, 30)}..."` : "(Hanya Gambar)";
    console.log(`[LOG] Proses: Mulai chat untuk prompt: ${promptLog}`);
    return new Promise(async (resolve, reject) => {
      try {
        if (conversationId) {
          this.conversation = {
            id: conversationId
          };
          console.log(`[LOG] Info: Menggunakan conversation ID eksternal: ${conversationId}`);
        } else if (!this.conversation?.id) {
          try {
            await this.genConversation();
          } catch (initError) {
            const fallbackId = crypto.randomUUID();
            this.conversation = {
              id: fallbackId
            };
            console.warn(`[WARN] Inisiasi sesi HTTP gagal. Menggunakan fallback conversation ID dari crypto: ${fallbackId}`);
          }
        }
        const validModes = ["chat", "smart", "reasoning"];
        let finalMode = "chat";
        if (mode && validModes.includes(mode)) {
          finalMode = mode;
        } else if (mode) {
          console.warn(`[WARN] Mode "${mode}" tidak valid. Menggunakan mode default 'chat'.`);
        }
        console.log(`[LOG] Info: Menggunakan mode: ${finalMode}`);
        let attachment = null;
        if (imageUrl) {
          try {
            attachment = await this.genImage(imageUrl);
          } catch (uploadError) {
            console.warn(`[WARN] ${uploadError.message}. Melanjutkan dengan prompt teks saja.`);
          }
        }
        const wsUrl = new URL("wss://copilot.microsoft.com/c/api/chat");
        wsUrl.search = new URLSearchParams({
          "api-version": "2",
          features: "-,ncedge,edgepagecontext",
          setflight: "-,ncedge,edgepagecontext",
          ncedge: "1"
        }).toString();
        console.log(`[LOG] Info: Mencoba koneksi WebSocket ke ${wsUrl.href}`);
        const wsHeaders = {
          ...this.baseHeaders,
          Cookie: this.cookies
        };
        const ws = new WebSocket(wsUrl.href, {
          headers: wsHeaders
        });
        let isWsReady = false;
        let fullResponse = "";
        let responseMetadata = {
          conversationId: this.conversation.id,
          messageId: null,
          mode: finalMode,
          createdAt: null,
          requestId: null,
          attachment: attachment,
          events: []
        };
        ws.on("open", () => console.log('[LOG] Proses: Koneksi WebSocket berhasil dibuka, menunggu event "connected"...'));
        ws.on("message", data => {
          try {
            const message = JSON.parse(data.toString());
            console.log("[LOG] RECV <-", JSON.stringify(message));
            responseMetadata.events.push(message);
            if (!isWsReady && message.event === "connected") {
              isWsReady = true;
              responseMetadata.requestId = message.requestId;
              console.log(`[LOG] Info: WebSocket siap (requestId: ${message.requestId}). Mengirim payload...`);
              const content = [];
              if (attachment?.url) content.push({
                type: "image",
                url: attachment.url
              });
              if (prompt) content.push({
                type: "text",
                text: prompt
              });
              if (content.length === 0) {
                ws.close();
                return reject(new Error("Tidak ada konten (prompt atau gambar) untuk dikirim."));
              }
              const promptPayload = {
                event: "send",
                conversationId: this.conversation.id,
                content: content,
                mode: finalMode,
                context: {
                  ...rest
                }
              };
              ws.send(JSON.stringify(promptPayload));
              console.log("[LOG] SEND ->", JSON.stringify(promptPayload));
              return;
            }
            if (isWsReady) {
              if (message.event === "received" || message.event === "startMessage") {
                responseMetadata.messageId = message.messageId;
                responseMetadata.createdAt = message.createdAt;
              }
              if (message.event === "modeSelected") responseMetadata.mode = message.mode;
              const textChunk = message.event === "appendText" || message.event === "chainOfThought" ? message.text : "";
              fullResponse += textChunk;
              if (message.event === "done") {
                console.log("[LOG] Proses: Streaming selesai.");
                ws.close(1e3, "Streaming Selesai");
                resolve({
                  result: fullResponse.trim(),
                  metadata: {
                    conversationId: responseMetadata.conversationId,
                    messageId: responseMetadata.messageId,
                    mode: responseMetadata.mode,
                    createdAt: responseMetadata.createdAt,
                    requestId: responseMetadata.requestId,
                    attachment: responseMetadata.attachment,
                    totalEvents: responseMetadata.events.length,
                    timestamp: new Date().toISOString()
                  },
                  raw: {
                    events: responseMetadata.events
                  }
                });
              }
            }
          } catch (e) {
            console.error("[ERROR] Gagal mem-parsing pesan JSON dari WebSocket:", e.message);
          }
        });
        ws.on("close", (code, reason) => console.log(`[LOG] Proses: Koneksi WebSocket ditutup. Kode: ${code}, Alasan: ${String(reason)}`));
        ws.on("error", error => {
          this._logError(error, "WebSocket");
          reject(new Error("Terjadi error pada koneksi WebSocket."));
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  getCurrentConversationId() {
    return this.conversation?.id || null;
  }
  resetConversation() {
    this.conversation = null;
    this.cookies = "";
    console.log("[LOG] Info: Conversation direset. Akan dibuat baru pada chat() berikutnya.");
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
    const copilot = new Copilot();
    const response = await copilot.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}