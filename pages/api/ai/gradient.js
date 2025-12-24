import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const DEFAULT_HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  "content-type": "application/json",
  origin: "https://chat.gradient.network",
  priority: "u=1, i",
  referer: "https://chat.gradient.network/",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  ...SpoofHead()
};
class AxiosGradient {
  constructor(options = {}) {
    console.log("Proses: Inisialisasi AxiosGradient");
    this.api = axios.create({
      baseURL: options.baseURL || "https://chat.gradient.network/api",
      headers: DEFAULT_HEADERS
    });
  }
  _parseStreamData(rawData) {
    console.log("Proses: Mem-parsing data stream...");
    return rawData.trim().split("\n").map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(item => item !== null);
  }
  _extractFullText(events) {
    console.log("Proses: Mengekstrak teks dari event...");
    return events.filter(event => event.type === "reply" && event.data?.reasoningContent).map(event => event.data.reasoningContent).join("");
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    if (!prompt && (!messages || messages.length === 0)) {
      console.error("Proses: Gagal! Harus ada `prompt` atau `messages` array yang valid.");
      return {
        success: false,
        error: "Input tidak valid. Harap berikan `prompt` string atau `messages` array.",
        statusCode: 400
      };
    }
    console.log("Proses: Memulai permintaan chat...");
    try {
      const model = rest.model ? rest.model : "GPT OSS 120B";
      const clusterMode = rest.clusterMode || "nvidia";
      const enableThinking = rest.enableThinking !== undefined ? rest.enableThinking : true;
      const messagePayload = messages && messages.length ? messages : [{
        role: "user",
        content: prompt
      }];
      console.log("Proses: Payload pesan yang akan dikirim:", messagePayload);
      const data = {
        model: model,
        clusterMode: clusterMode,
        messages: messagePayload,
        enableThinking: enableThinking
      };
      console.log("Proses: Mengirim data payload ke API...");
      const response = await this.api.post("/generate", data, {
        responseType: "stream"
      });
      console.log("Proses: Menerima stream respons dari server...");
      let rawResponse = "";
      for await (const chunk of response.data) {
        rawResponse += chunk.toString();
      }
      const events = this._parseStreamData(rawResponse);
      const fullText = this._extractFullText(events);
      console.log("Proses: Permintaan chat berhasil diselesaikan.");
      return {
        success: true,
        fullText: fullText,
        events: events
      };
    } catch (error) {
      console.error("Proses: Terjadi kesalahan saat permintaan chat!");
      const errorMessage = error.response?.data?.message || error.message || "Terjadi kesalahan yang tidak diketahui";
      const statusCode = error.response?.status || 500;
      console.error(`Detail Error: Status ${statusCode} - ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        statusCode: statusCode,
        details: error.response?.data || null
      };
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
    const ai = new AxiosGradient();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}