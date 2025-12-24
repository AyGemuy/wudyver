import axios from "axios";
class SpeechmaClient {
  constructor() {
    this.baseUrl = "https://speechma.com/com.api/tts-api.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://speechma.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://speechma.com/",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  async create({
    text,
    voice = "voice-107",
    pitch = 0,
    rate = 0,
    volume = 100
  }) {
    try {
      console.log(`[SpeechmaClient] Memulai proses text-to-speech untuk: "${text}"`);
      const submitPayload = {
        text: text,
        voice: voice,
        pitch: pitch,
        rate: rate,
        volume: volume
      };
      const {
        data: submitData
      } = await axios.post(this.baseUrl, submitPayload, {
        headers: this.headers
      });
      if (!submitData.success) throw new Error(`Gagal mengirimkan pekerjaan TTS: ${JSON.stringify(submitData)}`);
      const jobId = submitData.data.job_id;
      let completed = false;
      while (!completed) {
        const {
          data: statusData
        } = await axios.get(`${this.baseUrl}/status/${jobId}`, {
          headers: this.headers
        });
        if (!statusData.success) throw new Error(`Gagal mendapatkan status pekerjaan: ${JSON.stringify(statusData)}`);
        const status = statusData.data.status;
        if (status === "completed") completed = true;
        else if (status === "failed") throw new Error(`Pekerjaan gagal: ${JSON.stringify(statusData)}`);
        else await new Promise(resolve => setTimeout(resolve, 1e3));
      }
      const {
        data: audioData
      } = await axios.get(`${this.baseUrl}/audio/${jobId}`, {
        headers: this.headers,
        responseType: "arraybuffer"
      });
      if (!audioData) throw new Error("Gagal mengunduh audio: Tidak ada data yang diterima");
      const base64 = Buffer.from(audioData).toString("base64");
      const audioUrl = `${this.baseUrl}/audio/${jobId}`;
      console.log(`[SpeechmaClient] Audio berhasil diunduh, URL: ${audioUrl}`);
      return {
        url: audioUrl,
        base64: base64
      };
    } catch (error) {
      console.error(`[SpeechmaClient] Terjadi kesalahan dalam generate: ${error.message}`);
      throw error;
    }
  }
  async list() {
    try {
      const scriptUrl = "https://speechma.com/script.js?v=1747402984";
      const response = await axios.get(scriptUrl);
      const scriptContent = response.data;
      const arrayContainerRegex = /this\.voices\s*=\s*(\[[^\]]*\]);/;
      const arrayContainerMatch = scriptContent.match(arrayContainerRegex);
      if (!arrayContainerMatch || arrayContainerMatch.length < 2) {
        throw new Error("Tidak dapat menemukan deklarasi array 'this.voices' dalam konten skrip.");
      }
      const rawArrayContent = arrayContainerMatch[1];
      const voiceObjectRegex = /\{[^}]+\}/g;
      const matches = rawArrayContent.matchAll(voiceObjectRegex);
      const voices = [];
      for (const match of matches) {
        let objectString = match[0];
        const fixedObjectString = objectString.replace(/([{,]\s*)([a-zA-Z0-9_-]+)\s*:/g, '$1"$2":').replace(/'([^']+)'/g, '"$1"').replace(/,(\s*[}\]])/g, "$1");
        try {
          voices.push(JSON.parse(fixedObjectString));
        } catch (parseError) {
          console.warn(`[SpeechmaClient] Gagal mem-parse objek suara: "${fixedObjectString}". Error: ${parseError.message}`);
        }
      }
      console.log(`[SpeechmaClient] Data suara diurai: ${voices.length} suara.`);
      return voices;
    } catch (error) {
      console.error(`[SpeechmaClient] Gagal mendapatkan daftar suara: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "list | create"
      }
    });
  }
  const mic = new SpeechmaClient();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action](params);
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}