import axios from "axios";
import {
  EventSource
} from "eventsource";
class MidjourneyGenerator {
  constructor() {
    this.baseUrl = "https://ijohn07-midjourney.hf.space";
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
    prompt = "men in the forest",
    negativePrompt = "(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, close up, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
    style = "Photo",
    guidanceScale = 6,
    width = 1024,
    height = 1024,
    seed = 0,
    fn_index = 3,
    trigger_id = 6
  } = {}) {
    try {
      const joinResponse = await this.joinQueue({
        prompt: prompt,
        negativePrompt: negativePrompt,
        style: style,
        guidanceScale: guidanceScale,
        width: width,
        height: height,
        seed: seed,
        fn_index: fn_index,
        trigger_id: trigger_id
      });
      if (joinResponse.data && joinResponse.data.event_id) {
        return await this.pollTask();
      } else {
        throw new Error("No event_id received from the queue.");
      }
    } catch (error) {
      console.error("Failed to generate image:", error.message);
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
    style,
    guidanceScale,
    width,
    height,
    seed,
    fn_index,
    trigger_id
  }) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/json",
      origin: this.baseUrl,
      priority: "u=1, i",
      referer: `${this.baseUrl}/?__theme=system`,
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-fetch-storage-access": "active",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-zerogpu-uuid": this.generateSessionHash()
    };
    const data = {
      data: [prompt, negativePrompt, true, style, seed, width, height, guidanceScale, true],
      event_data: null,
      fn_index: fn_index,
      trigger_id: trigger_id,
      session_hash: this.sessionHash
    };
    try {
      const response = await this.axios.post(`${this.baseUrl}/queue/join?__theme=system`, data, {
        headers: headers
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to join queue: ${error.message}`);
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
            priority: "u=1, i",
            referer: `${this.baseUrl}/?__theme=system`,
            "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-fetch-storage-access": "active",
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
                console.log("Image generation process started...");
                break;
              case "progress":
                break;
              case "process_completed":
                console.log("Process completed!");
                closeEventSource();
                if (data.output && data.output.data && data.output.data[0] && Array.isArray(data.output.data[0])) {
                  const images = data.output.data[0].filter(item => item.image).map(item => ({
                    url: item.image.url,
                    path: item.image.path,
                    orig_name: item.image.orig_name
                  }));
                  const result = {
                    success: data.success,
                    images: images,
                    duration: data.output.duration,
                    average_duration: data.output.average_duration,
                    is_generating: data.output.is_generating
                  };
                  return resolve(result);
                } else {
                  return reject(new Error("Invalid response format after process completed."));
                }
              case "close_stream":
                closeEventSource();
                if (!hasStarted && !data.success) {
                  return reject(new Error("Stream closed before process started or completed."));
                } else if (!data.success && hasStarted) {
                  return reject(new Error("Stream closed unexpectedly during processing."));
                }
                break;
            }
          } catch (parseError) {
            closeEventSource();
            return reject(new Error("Error parsing event data: " + parseError.message));
          }
        };
        eventSource.onerror = error => {
          closeEventSource();
          reject(new Error("EventSource connection failed or encountered an error: " + error.message));
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
  const generator = new MidjourneyGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}