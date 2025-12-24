import axios from "axios";
import WebSocket from "ws";
class NHentai {
  constructor() {
    this.baseUrl = "https://nhentai.zip";
    this.result = null;
  }
  parseId(input) {
    if (!input || typeof input !== "string") {
      throw new Error("Input harus berupa string");
    }
    console.log(`🔍 Parsing ID dari: ${input}`);
    if (/^\d+$/.test(input)) {
      console.log(`✅ ID langsung: ${input}`);
      return input;
    }
    let match = input.match(/nhentai\.zip\/g\/(\d+)/);
    if (match) {
      console.log(`✅ ID dari URL nhentai.zip: ${match[1]}`);
      return match[1];
    }
    match = input.match(/nhentai\.net\/g\/(\d+)/);
    if (match) {
      console.log(`✅ ID dari URL nhentai.net: ${match[1]}`);
      return match[1];
    }
    match = input.match(/\/g\/(\d+)/);
    if (match) {
      console.log(`✅ ID dari path: ${match[1]}`);
      return match[1];
    }
    match = input.match(/nhentai\.(zip|net)\/g\/(\d+)/);
    if (match) {
      console.log(`✅ ID dari domain nhentai: ${match[2]}`);
      return match[2];
    }
    const numbers = input.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const longestNumber = numbers.reduce((a, b) => a.length > b.length ? a : b);
      console.log(`✅ ID dari angka dalam string: ${longestNumber}`);
      return longestNumber;
    }
    throw new Error(`Tidak dapat mengekstrak ID dari: ${input}`);
  }
  validateId(id) {
    if (!id) {
      throw new Error("ID tidak boleh kosong");
    }
    if (!/^\d+$/.test(id)) {
      throw new Error(`ID harus berupa angka: ${id}`);
    }
    console.log(`✅ ID valid: ${id}`);
    return true;
  }
  async download({
    id: inputId
  }) {
    let extractedId;
    try {
      extractedId = this.parseId(inputId);
      this.validateId(extractedId);
      console.log(`🚀 Memulai proses untuk ID: ${extractedId} (dari input: "${inputId}")`);
    } catch (parseError) {
      console.error(`❌ Error parsing ID: ${parseError.message}`);
      const errorResult = {
        result: null,
        success: false,
        input: inputId,
        extractedId: null,
        status: "invalid_id",
        error: parseError.message
      };
      this.result = errorResult;
      return errorResult;
    }
    let ws;
    let timeoutId;
    try {
      const pageUrl = `${this.baseUrl}/g/${extractedId}`;
      console.log(`🌐 Mengecek halaman: ${pageUrl}`);
      const page = await axios.get(pageUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          referer: this.baseUrl
        },
        timeout: 1e4
      });
      if (page.status !== 200) throw new Error("Halaman tidak ditemukan");
      console.log("✅ Halaman valid");
      const wsUrl = `wss://nhentai.zip/ws/g/${extractedId}`;
      console.log(`🔗 Membuka WebSocket: ${wsUrl}`);
      ws = new WebSocket(wsUrl, {
        headers: {
          Origin: this.baseUrl,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const result = await new Promise((resolve, reject) => {
        let done = false;
        const info = {
          input: inputId,
          id: extractedId,
          status: "pending",
          progress: {
            current: 0,
            total: 0
          },
          timestamp: new Date().toISOString()
        };
        const end = (data, isError = false) => {
          if (done) return;
          done = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
            console.log("⏰ Timeout dibersihkan (proses selesai)");
          }
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.terminate();
              console.log("🔧 WS terminated (dalam end)");
            } catch (err) {
              console.warn("⚠️ Gagal terminate WS:", err.message);
            }
          }
          if (isError) {
            reject(data);
          } else {
            resolve(data);
          }
        };
        timeoutId = setTimeout(() => {
          if (!done) {
            console.error("⏰ Timeout 5 menit, hentikan koneksi.");
            end({
              result: null,
              success: false,
              input: inputId,
              id: extractedId,
              status: "timeout",
              error: "Timeout 5 menit"
            }, true);
          }
        }, 3e5);
        ws.on("open", () => console.log("🟢 WS terhubung, menunggu progres..."));
        ws.on("message", data => {
          try {
            const buf = Buffer.from(data);
            const type = buf[0];
            if (type === 0) {
              const current = buf.readUInt16BE(1);
              const total = buf.readUInt16BE(3);
              info.progress = {
                current: current,
                total: total
              };
              console.log(`📥 Progres: ${current}/${total}`);
              if (current === total && !done) {
                console.log("⚡ Semua halaman selesai, menunggu file...");
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  timeoutId = setTimeout(() => {
                    if (!done) {
                      console.error("⏰ Timeout 30 detik setelah progress 100%, hentikan koneksi.");
                      end({
                        result: null,
                        success: false,
                        input: inputId,
                        id: extractedId,
                        status: "file_timeout",
                        error: "File tidak muncul setelah progress 100%"
                      }, true);
                    }
                  }, 3e4);
                }
              }
            } else if (type === 32) {
              const path = buf.toString("utf8", 1).trim();
              info.status = "completed";
              info.downloadUrl = path;
              info.finalUrl = `${this.baseUrl}${path}`;
              console.log(`✅ Download siap:\n${info.finalUrl}`);
              end({
                result: info.finalUrl,
                success: true,
                ...info
              });
            } else {
              console.log(`📨 Message type: 0x${type.toString(16)}`);
            }
          } catch (err) {
            console.error("⚠️ Parsing error:", err.message);
            end({
              result: null,
              success: false,
              input: inputId,
              id: extractedId,
              status: "parse_error",
              error: err.message
            }, true);
          }
        });
        ws.on("error", err => {
          console.error("🔥 WS Error:", err.message);
          end({
            result: null,
            success: false,
            input: inputId,
            id: extractedId,
            status: "error",
            error: err.message
          }, true);
        });
        ws.on("close", (code, reason) => {
          if (!done) {
            console.warn(`🔒 WS closed (${code}) ${reason ? "- " + reason : ""}`);
            end({
              result: null,
              success: false,
              input: inputId,
              id: extractedId,
              status: "ws_closed",
              error: `WebSocket closed unexpectedly: ${code} ${reason || ""}`
            }, true);
          } else {
            console.log("🔒 WS closed (normal)");
          }
        });
      });
      this.result = result;
      return result;
    } catch (err) {
      console.error("❌ Kesalahan utama:", err.message);
      const errorResult = {
        result: null,
        success: false,
        input: inputId,
        id: extractedId,
        status: "failed",
        error: err.message
      };
      this.result = errorResult;
      return errorResult;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.terminate();
            console.log("🔧 WS terminated (finally)");
          }
        } catch (err) {
          console.warn("⚠️ Gagal terminate WS di finally:", err.message);
        }
      }
    }
  }
  getLastResult() {
    return this.result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.id) {
    return res.status(400).json({
      error: "id are required"
    });
  }
  try {
    const api = new NHentai();
    const response = await api.download(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}