import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
class ImageToPrompt {
  constructor() {
    this.baseUrl = "https://ovi054-image-to-prompt.hf.space/gradio_api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://ovi054-image-to-prompt.hf.space",
      priority: "u=1, i",
      referer: "https://ovi054-image-to-prompt.hf.space/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.defaultMimeType = "image/jpeg";
  }
  async describeImage({
    imageUrl
  }) {
    try {
      const sessionHash = this._generateSessionId();
      const uploadId = this._generateUploadId();
      const {
        filePath,
        mimeType
      } = await this._uploadImageWithRetry(imageUrl, uploadId, 3);
      const eventId = await this._joinProcessingQueue(filePath, sessionHash, mimeType);
      const result = await this._streamResultsWithTimeout(eventId, sessionHash, 3e4);
      return result;
    } catch (error) {
      console.error("[ImageToPrompt] Processing failed:", error.message);
      throw this._formatError(error);
    }
  }
  async _uploadImageWithRetry(imageUrl, uploadId, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 1e4,
          headers: {
            Accept: "image/*"
          }
        });
        const mimeType = response.headers["content-type"]?.split(";")[0] || this.defaultMimeType;
        const extension = mimeType.split("/")[1] || "jpeg";
        const filename = this._extractFilename(imageUrl, extension);
        const formData = new FormData();
        formData.append("files", Buffer.from(response.data), {
          filename: filename,
          contentType: mimeType
        });
        const uploadResponse = await axios.post(`${this.baseUrl}/upload?upload_id=${uploadId}`, formData, {
          headers: {
            ...this.headers,
            "content-type": `multipart/form-data; boundary=${formData.getBoundary()}`
          },
          timeout: 2e4
        });
        await this._monitorUploadProgress(uploadId);
        return {
          filePath: uploadResponse.data[0],
          mimeType: mimeType
        };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1e3 * attempt));
        }
      }
    }
    throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
  async _monitorUploadProgress(uploadId) {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${this.baseUrl}/upload_progress?upload_id=${uploadId}`, {
        headers: {
          ...this.headers,
          accept: "text/event-stream"
        }
      });
      const timeout = setTimeout(() => {
        es.close();
        reject(new Error("Upload progress monitoring timeout"));
      }, 3e4);
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg === "done") {
            clearTimeout(timeout);
            es.close();
            resolve();
          }
        } catch (error) {
          clearTimeout(timeout);
          es.close();
          reject(error);
        }
      };
      es.onerror = error => {
        clearTimeout(timeout);
        es.close();
        reject(new Error("Upload progress error"));
      };
    });
  }
  async _joinProcessingQueue(filePath, sessionHash, mimeType) {
    try {
      const response = await axios.post(`${this.baseUrl}/queue/join`, {
        data: [{
          path: filePath,
          url: `${this.baseUrl}/file=${filePath}`,
          orig_name: this._extractFilename(filePath),
          size: 0,
          mime_type: mimeType,
          meta: {
            _type: "gradio.FileData"
          }
        }],
        event_data: null,
        fn_index: 0,
        session_hash: sessionHash
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        timeout: 1e4
      });
      return response.data.event_id;
    } catch (error) {
      throw new Error(`Failed to join processing queue: ${error.message}`);
    }
  }
  async _streamResultsWithTimeout(eventId, sessionHash, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        es.close();
        reject(new Error("Processing timeout"));
      }, timeoutMs);
      const es = new EventSource(`${this.baseUrl}/queue/data?session_hash=${sessionHash}`, {
        headers: {
          ...this.headers,
          accept: "text/event-stream"
        }
      });
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg === "process_completed") {
            clearTimeout(timeout);
            es.close();
            if (data.success) {
              resolve(data.output);
            } else {
              reject(new Error(data.error || "Processing failed"));
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          es.close();
          reject(error);
        }
      };
      es.onerror = error => {
        clearTimeout(timeout);
        es.close();
        reject(new Error("Result streaming error"));
      };
    });
  }
  _extractFilename(url, fallbackExtension = "webp") {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split("/").pop() || `image.${fallbackExtension}`;
    } catch {
      return `image.${fallbackExtension}`;
    }
  }
  _generateSessionId() {
    return Math.random().toString(36).substring(2, 15);
  }
  _generateUploadId() {
    return Math.random().toString(36).substring(2, 10);
  }
  _formatError(error) {
    return {
      error: true,
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString()
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl are required"
    });
  }
  try {
    const describer = new ImageToPrompt();
    const response = await describer.describeImage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}