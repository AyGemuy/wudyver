import axios from "axios";
import {
  EventSource
} from "eventsource";
class SDXLFlashGenerator {
  constructor() {
    this.baseUrl = "https://parvalijaved-sdxl-flash.hf.space";
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
    prompt = "a ROBOT riding a BLUE horse on Mars, photorealistic, 4k",
    negativePrompt = "(deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, (mutated hands and fingers:1.4), disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation, NSFW",
    enableSafetyChecker = true,
    seed = "1",
    width = 1024,
    height = 1024,
    guidanceScale = 3,
    numInferenceSteps = 8,
    enableTiling = true
  } = {}) {
    try {
      const joinResponse = await this.joinQueue({
        prompt: prompt,
        negativePrompt: negativePrompt,
        enableSafetyChecker: enableSafetyChecker,
        seed: seed,
        width: width,
        height: height,
        guidanceScale: guidanceScale,
        numInferenceSteps: numInferenceSteps,
        enableTiling: enableTiling
      });
      if (joinResponse.data && joinResponse.data.event_id) {
        return await this.pollTask(joinResponse.data.event_id);
      } else {
        throw new Error("No event_id received from queue join");
      }
    } catch (error) {
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
    enableSafetyChecker,
    seed,
    width,
    height,
    guidanceScale,
    numInferenceSteps,
    enableTiling
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
      data: [prompt, negativePrompt, enableSafetyChecker, seed, width, height, guidanceScale, numInferenceSteps, enableTiling],
      event_data: null,
      fn_index: 2,
      trigger_id: Math.floor(Math.random() * 1e6),
      session_hash: this.sessionHash
    };
    try {
      const response = await this.axios.post(`${this.baseUrl}/queue/join?`, data, {
        headers: headers
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to join queue: ${error.message}`);
    }
  }
  async pollTask(eventId) {
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
                break;
              case "progress":
                break;
              case "process_completed":
                console.log("Process completed successfully!");
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
                  return reject(new Error("Invalid response format after process completion"));
                }
                break;
              case "close_stream":
                closeEventSource();
                if (!hasStarted && !data.success) {
                  return reject(new Error("Stream closed before process started or completed"));
                } else if (!data.success && hasStarted) {
                  return reject(new Error("Stream closed unexpectedly during processing"));
                }
                break;
            }
          } catch (parseError) {
            closeEventSource();
            return reject(new Error("Error parsing event data"));
          }
        };
        eventSource.onerror = error => {
          closeEventSource();
          reject(new Error("EventSource connection failed or encountered an error"));
        };
      } catch (initializationError) {
        reject(new Error(`Failed to initialize EventSource: ${initializationError.message}`));
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
  const generator = new SDXLFlashGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}