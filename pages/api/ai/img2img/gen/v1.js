import axios from "axios";
import {
  EventSource
} from "eventsource";
class AnimeAIGenerator {
  constructor() {
    this.baseUrl = "https://broyang-anime-ai.hf.space";
    this.sessionHash = this.generateSessionHash();
    this.axios = axios;
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  generateUploadId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  async uploadImage(imageUrl) {
    try {
      const uploadId = this.generateUploadId();
      const imageResponse = await this.axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      const blob = new Blob([imageBuffer], {
        type: imageResponse.headers["content-type"] || "image/jpeg"
      });
      const formData = new FormData();
      formData.append("files", blob, "image.jpg");
      const uploadResponse = await this.axios.post(`${this.baseUrl}/upload?upload_id=${uploadId}`, formData, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          origin: this.baseUrl,
          pragma: "no-cache",
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
      if (uploadResponse.data && uploadResponse.data.length > 0) {
        const uploadedPath = uploadResponse.data[0];
        return {
          path: uploadedPath,
          url: `${this.baseUrl}/file=${uploadedPath}`,
          orig_name: "image.jpg",
          size: imageBuffer.length,
          mime_type: imageResponse.headers["content-type"] || "image/jpeg",
          meta: {
            _type: "gradio.FileData"
          }
        };
      } else {
        throw new Error("Upload failed: No path returned");
      }
    } catch (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }
  async generate({
    imageUrl,
    gender = "men",
    prompt = "",
    negativePrompt = "EasyNegativeV2, fcNeg, (badhandv4:1.4), chubby face, young kids, (worst quality, low quality, bad quality, normal quality:2.0), (bad hands, missing fingers, extra fingers:2.0)",
    seed = 1,
    width = 768,
    height = 768,
    numInferenceSteps = 12,
    guidanceScale = 5.5,
    strength = 0
  } = {}) {
    try {
      const uploadedImage = await this.uploadImage(imageUrl);
      const joinResponse = await this.joinQueue({
        uploadedImage: uploadedImage,
        gender: gender,
        prompt: prompt,
        negativePrompt: negativePrompt,
        seed: seed,
        width: width,
        height: height,
        numInferenceSteps: numInferenceSteps,
        guidanceScale: guidanceScale,
        strength: strength
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
    uploadedImage,
    gender,
    prompt,
    negativePrompt,
    seed,
    width,
    height,
    numInferenceSteps,
    guidanceScale,
    strength
  }) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: this.baseUrl,
      pragma: "no-cache",
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
    };
    const data = {
      data: [uploadedImage, gender, prompt, negativePrompt, seed, width, height, numInferenceSteps, guidanceScale, strength],
      event_data: null,
      fn_index: 0,
      trigger_id: Math.floor(Math.random() * 1e6),
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
  async pollTask(eventId) {
    return new Promise((resolve, reject) => {
      try {
        const eventSource = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`, {
          headers: {
            accept: "text/event-stream",
            "accept-language": "id-ID,id;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            pragma: "no-cache",
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
                break;
              case "progress":
                break;
              case "process_completed":
                if (data.event_id === eventId) {
                  console.log("Process completed successfully!");
                  closeEventSource();
                  if (data.output && data.output.data && data.output.data[0] && data.output.data[0].url) {
                    const result = {
                      success: data.success,
                      imageUrl: data.output.data[0].url,
                      imagePath: data.output.data[0].path,
                      fileName: data.output.data[0].orig_name,
                      fileSize: data.output.data[0].size,
                      mimeType: data.output.data[0].mime_type,
                      duration: data.output.duration,
                      averageDuration: data.output.average_duration,
                      isGenerating: data.output.is_generating
                    };
                    return resolve(result);
                  } else {
                    return reject(new Error("Invalid response format after process completion"));
                  }
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
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const api = new AnimeAIGenerator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}