import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class AxiosScinito {
  constructor(options = {}) {
    console.log("Proses: Inisialisasi AxiosScinito");
    this.api = axios.create({
      baseURL: options.baseURL || "https://ekb.scinito.ai/api/v2",
      headers: {
        accept: "text/event-stream",
        "accept-language": "id-ID",
        "content-type": "application/json",
        cookie: `countryCode=ID; anonymousUID=${this._generateUUID()}`,
        origin: "https://ekb.scinito.ai",
        priority: "u=1, i",
        referer: "https://ekb.scinito.ai/ai/chat/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  _generateId() {
    return crypto.randomBytes(16).toString("hex");
  }
  _generateUUID() {
    return crypto.randomUUID();
  }
  _parseStreamData(rawData) {
    console.log("Proses: Mem-parsing data stream (SSE) tanpa trim/replace...");
    const eventBlocks = rawData.split("\n\n");
    const textChunks = [];
    for (const block of eventBlocks) {
      if (block.length === 0) continue;
      const lines = block.split("\n");
      let isChunkEvent = false;
      for (const line of lines) {
        if (line === "event: chunk") {
          isChunkEvent = true;
          break;
        }
      }
      if (isChunkEvent) {
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            textChunks.push(line.substring(6));
          } else if (line === "data:") {
            textChunks.push("");
          }
        }
      }
    }
    console.log("Proses: Menggabungkan semua text chunk...");
    return textChunks.join("");
  }
  async chat({
    query,
    ...rest
  }) {
    if (!query) {
      console.error("Proses: Gagal! Paramenter `query` wajib diisi.");
      return {
        success: false,
        error: "Input tidak valid. Harap berikan `query` string.",
        statusCode: 400
      };
    }
    console.log(`Proses: Memulai permintaan chat untuk query: "${query}"`);
    try {
      const data = {
        id: this._generateId(),
        query: query,
        responseId: this._generateUUID(),
        researchId: this._generateUUID(),
        sourceIds: [],
        agent: "chat",
        capabilities: {
          deepInsight: false
        },
        filters: {},
        reconnect: false,
        ...rest
      };
      console.log("Proses: Mengirim data payload ke API:", data);
      const response = await this.api.post("/chat", data, {
        responseType: "stream"
      });
      console.log("Proses: Menerima stream respons dari server...");
      let rawResponse = "";
      for await (const chunk of response.data) {
        rawResponse += chunk.toString();
      }
      const resultText = this._parseStreamData(rawResponse);
      console.log("Proses: Permintaan chat berhasil diselesaikan.");
      return {
        success: true,
        result: resultText
      };
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat permintaan chat!");
      const errorMessage = error.response?.data || error.message || "Terjadi kesalahan yang tidak diketahui";
      const statusCode = error.response?.status || 500;
      console.error(`Detail Error: Status ${statusCode} - ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        statusCode: statusCode
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "query are required"
    });
  }
  try {
    const scinito = new AxiosScinito();
    const response = await scinito.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}