import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class RTLIT {
  constructor() {
    this.baseURL = "https://rtlit-copy.hf.space/gradio_api";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "accept-language": "id-ID,id;q=0.9",
      ...SpoofHead()
    };
    this.uploadId = "up" + Math.random().toString(36).slice(2);
    this.sessionHash = "hash" + Math.random().toString(36).slice(2);
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  async upload(imageUrl) {
    try {
      console.log(`[UPLOAD] Start → ${imageUrl}`);
      const imgRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: this.headers
      });
      const buffer = Buffer.from(imgRes.data);
      const mime = imgRes.headers["content-type"] || "image/png";
      const filename = `upload.${mime.split("/")[1] || "png"}`;
      const form = new FormData();
      form.append("files", buffer, {
        filename: filename,
        contentType: mime
      });
      const res = await axios.post(`${this.baseURL}/upload?upload_id=${this.uploadId}`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders()
        }
      });
      console.log(`[UPLOAD] File uploaded → ${res.data[0]}`);
      await this.listenUploadProgress();
      return {
        path: res.data[0],
        mime: mime
      };
    } catch (err) {
      console.error(`[UPLOAD] Error:`, err.message);
      throw err;
    }
  }
  listenUploadProgress() {
    return new Promise((resolve, reject) => {
      const es = new EventSource(`${this.baseURL}/upload_progress?upload_id=${this.uploadId}`, {
        headers: this.headers
      });
      es.onmessage = e => {
        if (e.data && e.data !== "[DONE]") {
          const data = JSON.parse(e.data);
          console.log(`[UPLOAD PROGRESS]`, data);
          if (data.msg === "done") {
            es.close();
            resolve();
          }
        }
      };
      es.onerror = err => {
        console.error(`[UPLOAD PROGRESS] Error`, err);
        es.close();
        reject(err);
      };
    });
  }
  async img2vid({
    imageUrl,
    prompt,
    n_prompt = "worst quality, inconsistent motion, blurry, jittery, distorted",
    width = 1024,
    height = 768,
    type = "image-to-video",
    duration = 5,
    ...rest
  }) {
    try {
      console.log(`[IMG2VID] Starting...`);
      const {
        path,
        mime
      } = await this.upload(imageUrl);
      const imageData = {
        path: path,
        url: `${this.baseURL}/file=${path}`,
        orig_name: path.split("/").pop(),
        size: null,
        mime_type: mime,
        meta: {
          _type: "gradio.FileData"
        }
      };
      const payload = {
        data: [prompt, n_prompt, imageData, "", width, height, type, duration, 9, 42, true, 1, true],
        fn_index: 7,
        trigger_id: 9,
        session_hash: this.sessionHash,
        event_data: null,
        ...rest
      };
      console.log(`[IMG2VID] Sending request...`);
      await axios.post(`${this.baseURL}/queue/join?__theme=system`, payload, {
        headers: this.headers
      });
      const task_id = await this.enc({
        session_hash: this.sessionHash
      });
      return {
        task_id: task_id
      };
    } catch (err) {
      console.error(`[IMG2VID] Error:`, err.message);
      throw err;
    }
  }
  async txt2vid({
    prompt,
    n_prompt = "worst quality, inconsistent motion, blurry, jittery, distorted",
    width = 1024,
    height = 768,
    type = "text-to-video",
    duration = 5,
    seed = 3702559852,
    ...rest
  }) {
    try {
      console.log(`[TXT2VID] Starting...`);
      const payload = {
        data: [prompt, n_prompt, "", "", width, height, type, duration, 9, seed, true, 1, true],
        fn_index: 6,
        trigger_id: 16,
        session_hash: this.sessionHash,
        event_data: null,
        ...rest
      };
      console.log(`[TXT2VID] Sending request...`);
      await axios.post(`${this.baseURL}/queue/join?__theme=system`, payload, {
        headers: this.headers
      });
      const task_id = await this.enc({
        session_hash: this.sessionHash
      });
      return {
        task_id: task_id
      };
    } catch (err) {
      console.error(`[TXT2VID] Error:`, err.message);
      throw err;
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) {
      throw new Error("task_id is required to check status.");
    }
    const decryptedData = await this.dec(task_id);
    const {
      session_hash
    } = decryptedData;
    if (!session_hash) {
      throw new Error("Invalid task_id: Missing videoId after decryption.");
    }
    return new Promise((resolve, reject) => {
      console.log(`[QUEUE] Listening for results...`);
      const es = new EventSource(`${this.baseURL}/queue/data?session_hash=${session_hash}`, {
        headers: this.headers
      });
      es.onmessage = e => {
        if (e.data && e.data !== "[DONE]") {
          const data = JSON.parse(e.data);
          console.log(`[QUEUE] ${data.msg}`);
          if (data.msg === "process_completed") {
            es.close();
            console.log(`[QUEUE] Process completed.`);
            resolve(data.output);
          }
        }
      };
      es.onerror = err => {
        console.error(`[QUEUE] Error`, err);
        es.close();
        reject(err);
      };
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const ai = new RTLIT();
  try {
    switch (action) {
      case "txt2vid": {
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'txt2vid'."
          });
        }
        const result = await ai.txt2vid(params);
        return res.status(200).json(result);
      }
      case "img2vid": {
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: !params.prompt ? "Prompt is required for 'img2vid'." : "imageUrl is required for 'img2vid'."
          });
        }
        const result = await ai.img2vid(params);
        return res.status(200).json(result);
      }
      case "status": {
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status'."
          });
        }
        const result = await ai.status(params);
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions: 'txt2vid', 'img2vid', 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}