import axios from "axios";
import {
  EventSource
} from "eventsource";
class UnfilteredAIGenV2 {
  constructor() {
    this.baseUrl = "https://armen425221356-unfilteredai-nsfw-gen-v2-self-parms.hf.space";
    this.sessionHash = this.generateSessionHash();
    this.axios = axios;
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async generate({
    prompt = "little girl, naked, big breasts, wet, spread legs",
    negativePrompt = "(low quality, worst quality:1.2), very displeasing, 3d, watermark, signature, ugly, poorly drawn, (deformed | distorted | disfigured:1.3), bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated hands and fingers:1.4, disconnected limbs, blurry, amputation.",
    guidanceScale = 7,
    numInferenceSteps = 7,
    width = 1024,
    height = 1024,
    seed = 1,
    fn_index = 0,
    trigger_id = 15
  } = {}) {
    try {
      const joinResponse = await this.joinQueue({
        prompt: prompt,
        negativePrompt: negativePrompt,
        guidanceScale: guidanceScale,
        numInferenceSteps: numInferenceSteps,
        width: width,
        height: height,
        seed: seed,
        fn_index: fn_index,
        trigger_id: trigger_id
      });
      if (joinResponse.data && joinResponse.data.event_id) {
        return await this.pollTask();
      } else {
        throw new Error("Tidak ada event_id yang diterima dari antrean.");
      }
    } catch (error) {
      console.error("Gagal membuat gambar:", error.message);
      return {
        success: false,
        error: error.message,
        imageUrl: null
      };
    }
  }
  async joinQueue({
    prompt,
    negativePrompt,
    guidanceScale,
    numInferenceSteps,
    width,
    height,
    seed,
    fn_index,
    trigger_id
  }) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.baseUrl,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-fetch-storage-access": "none",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    const data = {
      data: [prompt, negativePrompt, guidanceScale, numInferenceSteps, width, height, seed],
      event_data: null,
      fn_index: fn_index,
      trigger_id: trigger_id,
      session_hash: this.sessionHash
    };
    try {
      const response = await this.axios.post(`${this.baseUrl}/queue/join?`, data, {
        headers: headers
      });
      return response;
    } catch (error) {
      throw new Error(`Gagal bergabung dengan antrean: ${error.message}`);
    }
  }
  async pollTask() {
    return new Promise((resolve, reject) => {
      try {
        const eventSource = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`, {
          headers: {
            accept: "text/event-stream",
            "accept-language": "id-ID,id;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache",
            priority: "u=1, i",
            referer: `${this.baseUrl}/`,
            "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-fetch-storage-access": "none",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
          }
        });
        let hasStarted = false;
        const closeEventSource = () => {
          if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
          }
        };
        eventSource.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            switch (data.msg) {
              case "estimation":
                break;
              case "process_starts":
                hasStarted = true;
                console.log("Proses pembuatan gambar dimulai...");
                break;
              case "progress":
                break;
              case "process_completed":
                console.log("Proses selesai!");
                closeEventSource();
                if (data.output && data.output.data && data.output.data[0] && data.output.data[0][0] && data.output.data[0][0].image) {
                  const result = {
                    success: data.success,
                    imageUrl: data.output.data[0][0].image.url,
                    imagePath: data.output.data[0][0].image.path,
                    fileName: data.output.data[0][0].image.orig_name,
                    duration: data.output.duration,
                    averageDuration: data.output.average_duration,
                    isGenerating: data.output.is_generating
                  };
                  return resolve(result);
                } else {
                  return reject(new Error("Format respons tidak valid setelah proses selesai."));
                }
                break;
              case "close_stream":
                closeEventSource();
                if (!hasStarted && !data.success) {
                  return reject(new Error("Stream ditutup sebelum proses dimulai atau selesai."));
                } else if (!data.success && hasStarted) {
                  return reject(new Error("Stream ditutup secara tidak terduga selama pemrosesan."));
                }
                break;
            }
          } catch (parseError) {
            closeEventSource();
            return reject(new Error("Kesalahan saat mengurai data event: " + parseError.message));
          }
        };
        eventSource.onerror = error => {
          closeEventSource();
          reject(new Error("Koneksi EventSource gagal atau mengalami kesalahan: " + error.message));
        };
      } catch (initializationError) {
        reject(new Error(`Gagal menginisialisasi EventSource: ${initializationError.message}`));
      }
    });
  }
  regenerateSession() {
    this.sessionHash = this.generateSessionHash();
    return this.sessionHash;
  }
  getSessionHash() {
    return this.sessionHash;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new UnfilteredAIGenV2();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}