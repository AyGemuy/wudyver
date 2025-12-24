import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import PROMPT from "@/configs/ai-prompt";
class ImageEditor {
  constructor() {
    this.baseUrl = "https://multimodalart-qwen-image-edit-fast.hf.space/gradio_api";
    this.sessionHash = Math.random().toString(36).substring(2);
  }
  async _handleImage(imageUrl) {
    console.log("Processing image input...");
    try {
      if (Buffer.isBuffer(imageUrl)) {
        console.log("Image is a buffer.");
        return imageUrl;
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        console.log("Downloading image from URL...");
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("data:image")) {
        console.log("Decoding base64 image...");
        return Buffer.from(imageUrl.split(",")[1], "base64");
      }
      throw new Error("Unsupported imageUrl type. Use URL, base64, or Buffer.");
    } catch (error) {
      console.error("Error handling image:", error?.message);
      throw error;
    }
  }
  async _upload(imageBuffer) {
    console.log("Uploading image...");
    try {
      const form = new FormData();
      form.append("files", imageBuffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const response = await axios.post(`${this.baseUrl}/upload?upload_id=${this.sessionHash}`, form, {
        headers: form.getHeaders()
      });
      console.log("Image uploaded successfully.");
      return response.data?.[0];
    } catch (error) {
      console.error("Error uploading image:", error?.message);
      throw error;
    }
  }
  _monitorUpload() {
    console.log("Waiting for upload to complete...");
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/upload_progress?upload_id=${this.sessionHash}`;
      const es = new EventSource(url);
      es.onmessage = event => {
        const data = JSON.parse(event.data);
        console.log("Upload progress:", data?.msg || "pending");
        if (data?.msg === "done") {
          es.close();
          resolve();
        }
      };
      es.onerror = err => {
        console.error("EventSource error during upload monitoring:", err);
        es.close();
        reject(err);
      };
    });
  }
  async _joinQueue(filePath, prompt, rest) {
    console.log("Joining queue...");
    try {
      const payload = {
        data: [{
          path: filePath,
          url: `${this.baseUrl}/file=${filePath}`,
          orig_name: "image.jpg",
          meta: {
            _type: "gradio.FileData"
          }
        }, prompt, rest.number ?? 0, rest.randomizeSeed ?? true, rest.seed ?? 1, rest.guidanceScale ?? 8, rest.randomizePrompt ?? true],
        event_data: null,
        fn_index: 0,
        trigger_id: rest.triggerId ?? 10,
        session_hash: this.sessionHash
      };
      const response = await axios.post(`${this.baseUrl}/queue/join?`, payload);
      console.log("Joined queue successfully.");
      return response.data?.event_id;
    } catch (error) {
      console.error("Error joining queue:", error?.message);
      throw error;
    }
  }
  _listenForResult() {
    console.log("Waiting for result...");
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`;
      const es = new EventSource(url);
      es.onmessage = event => {
        const data = JSON.parse(event.data);
        console.log("Received data:", data?.msg || "pending");
        if (data?.msg === "process_completed") {
          es.close();
          console.log("Processing complete.");
          resolve(data.output);
        }
      };
      es.onerror = err => {
        console.error("EventSource error while listening for result:", err);
        es.close();
        reject(err);
      };
    });
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    try {
      const imageBuffer = await this._handleImage(imageUrl);
      const filePath = await this._upload(imageBuffer);
      await this._monitorUpload();
      await this._joinQueue(filePath, prompt, rest);
      const result = await this._listenForResult();
      return result;
    } catch (error) {
      console.error("An error occurred during the generation process:", error?.message);
      throw error;
    }
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
    const api = new ImageEditor();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}