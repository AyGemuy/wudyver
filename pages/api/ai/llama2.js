import axios from "axios";
import {
  EventSource
} from "eventsource";
class GradioAPI {
  constructor(type = 1) {
    const baseUrls = {
      1: "https://huggingface-projects-llama-2-7b-chat.hf.space/gradio_api"
    };
    this.baseURL = baseUrls[type] || baseUrls[1];
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: new URL(this.baseURL).origin,
      pragma: "no-cache",
      referer: `${new URL(this.baseURL).origin}/?__theme=light`,
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": "Android",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
    };
  }
  generateHash() {
    return Math.random().toString(36).slice(2);
  }
  async predict(prompt) {
    const sessionHash = this.generateHash();
    const response = await axios.post(`${this.baseURL}/run/predict?__theme=light`, {
      data: [prompt],
      event_data: null,
      fn_index: 1,
      trigger_id: 15,
      session_hash: sessionHash
    }, {
      headers: this.headers
    });
    return {
      sessionHash: sessionHash,
      response: response.data
    };
  }
  async joinQueue(data, sessionHash) {
    const response = await axios.post(`${this.baseURL}/queue/join?__theme=light`, {
      ...data,
      session_hash: sessionHash
    }, {
      headers: this.headers
    });
    return {
      response: response.data
    };
  }
  async pollQueue(sessionHash) {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.baseURL}/queue/data?session_hash=${sessionHash}`);
      eventSource.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data.msg === "process_completed") {
          resolve(data.output.data);
          eventSource.close();
        } else if (data.msg === "close_stream") {
          resolve(null);
          eventSource.close();
        }
      };
      eventSource.onerror = err => {
        reject(err);
        eventSource.close();
      };
    });
  }
  async process(prompt, params) {
    const {
      sessionHash
    } = await this.predict(prompt);
    const queueData = {
      data: [null, null, "", params.maxTokens, params.temperature, params.topP, params.topK, params.repetitionPenalty],
      event_data: null,
      fn_index: 3,
      trigger_id: 15
    };
    const {
      response
    } = await this.joinQueue(queueData, sessionHash);
    if (response.event_id) {
      return await this.pollQueue(sessionHash);
    }
    throw new Error("Failed to join queue");
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    type = 1,
    maxTokens = 1024,
    temperature = 1.4,
    topP = .9,
    topK = 50,
    repetitionPenalty = 1.2
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const api = new GradioAPI(Number(type));
  try {
    const result = await api.process(prompt, {
      maxTokens: maxTokens,
      temperature: temperature,
      topP: topP,
      topK: topK,
      repetitionPenalty: repetitionPenalty
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}