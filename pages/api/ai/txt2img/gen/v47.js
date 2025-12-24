import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
class HeartSyncImageGenerator {
  constructor() {
    this.baseUrl = "https://heartsync-nsfw-uncensored-image.hf.space/gradio_api";
    this.sessionHash = Math.random().toString(36).substring(2);
  }
  async _handleImage(imageUrl) {
    console.log("Processing image input...");
    try {
      if (Buffer.isBuffer(imageUrl)) {
        console.log("Image is a buffer.");
        return {
          buffer: imageUrl,
          orig_name: "image.jpg",
          size: imageUrl.length,
          mime_type: "image/jpeg"
        };
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("http")) {
        console.log("Downloading image from URL...");
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          validateStatus: status => status === 200
        });
        const buffer = Buffer.from(response.data);
        const contentType = response.headers["content-type"] || "image/jpeg";
        const contentLength = parseInt(response.headers["content-length"]) || buffer.length;
        let filename = "image.jpg";
        const contentDisposition = response.headers["content-disposition"];
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
          if (filenameMatch) filename = filenameMatch[1];
        } else {
          const urlPath = new URL(imageUrl).pathname;
          const urlFilename = urlPath.split("/").pop();
          if (urlFilename && urlFilename.includes(".")) {
            filename = urlFilename;
          }
        }
        return {
          buffer: buffer,
          orig_name: filename,
          size: contentLength,
          mime_type: contentType
        };
      }
      if (typeof imageUrl === "string" && imageUrl.startsWith("data:image")) {
        console.log("Decoding base64 image...");
        const matches = imageUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) {
          throw new Error("Invalid base64 image data");
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        const ext = mimeType.split("/")[1] || "jpg";
        return {
          buffer: buffer,
          orig_name: `image.${ext}`,
          size: buffer.length,
          mime_type: mimeType
        };
      }
      throw new Error("Unsupported imageUrl type. Use URL, base64, or Buffer.");
    } catch (error) {
      console.error("Error handling image:", error?.message);
      throw error;
    }
  }
  async _upload(imageData) {
    console.log("Uploading image...");
    try {
      const form = new FormData();
      form.append("files", imageData.buffer, {
        filename: imageData.orig_name,
        contentType: imageData.mime_type
      });
      const response = await axios.post(`${this.baseUrl}/upload?upload_id=${this.sessionHash}`, form, {
        headers: form.getHeaders()
      });
      console.log("Image uploaded successfully.");
      const uploadedFile = response.data?.[0];
      if (uploadedFile) {
        return {
          ...uploadedFile,
          orig_name: imageData.orig_name,
          size: imageData.size,
          mime_type: imageData.mime_type
        };
      }
      return uploadedFile;
    } catch (error) {
      console.error("Error uploading image:", error?.message);
      throw error;
    }
  }
  async _monitorUpload() {
    console.log("Waiting for upload to complete...");
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/upload_progress?upload_id=${this.sessionHash}`;
      const es = new EventSource(url);
      let hasResolved = false;
      const cleanup = () => {
        if (!hasResolved) {
          hasResolved = true;
          es.close();
        }
      };
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          console.log("Upload progress:", data?.msg || "pending");
          if (data?.msg === "done") {
            cleanup();
            resolve();
          }
        } catch (error) {
          console.error("Error parsing upload progress:", error);
        }
      };
      es.onerror = err => {
        console.error("EventSource error during upload monitoring:", err);
        cleanup();
        reject(err);
      };
      setTimeout(() => {
        cleanup();
        reject(new Error("Upload timeout"));
      }, 12e4);
    });
  }
  async _joinQueueTxt2Img(prompt, rest) {
    console.log("Joining txt2img queue...");
    try {
      const {
        negative_prompt = "text, talk bubble, low quality, watermark, signature",
          batch_size = 1,
          randomize_seed = true,
          width = 1024,
          height = 1024,
          guidance_scale = 7,
          steps = 28
      } = rest;
      const payload = {
        data: [prompt, negative_prompt, batch_size, randomize_seed, width, height, guidance_scale, steps],
        event_data: null,
        fn_index: 2,
        trigger_id: 16,
        session_hash: this.sessionHash
      };
      await axios.post(`${this.baseUrl}/queue/join?`, payload);
      console.log("Joined txt2img queue successfully.");
    } catch (error) {
      console.error("Error joining txt2img queue:", error?.message);
      throw error;
    }
  }
  async _joinQueueImg2Img(fileData, prompt, rest) {
    console.log("Joining img2img queue...");
    try {
      const {
        negative_prompt = "low quality, watermark, signature",
          denoising_strength = .75,
          batch_size = 0,
          randomize_seed = true,
          width = 1024,
          height = 1024,
          guidance_scale = 7.5,
          steps = 30
      } = rest;
      const payload = {
        data: [{
          path: fileData.path,
          url: `${this.baseUrl}/file=${fileData.path}`,
          orig_name: fileData.orig_name || "image.jpg",
          size: fileData.size || 279101,
          mime_type: fileData.mime_type || "image/jpeg",
          meta: {
            _type: "gradio.FileData"
          }
        }, prompt, negative_prompt, denoising_strength, batch_size, randomize_seed, width, height, guidance_scale, steps],
        event_data: null,
        fn_index: 4,
        trigger_id: 37,
        session_hash: this.sessionHash
      };
      await axios.post(`${this.baseUrl}/queue/join?`, payload);
      console.log("Joined img2img queue successfully.");
    } catch (error) {
      console.error("Error joining img2img queue:", error?.message);
      throw error;
    }
  }
  _listenForResult() {
    console.log("Waiting for result...");
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`;
      const es = new EventSource(url);
      let hasResolved = false;
      const cleanup = () => {
        if (!hasResolved) {
          hasResolved = true;
          es.close();
        }
      };
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          console.log("Processing status:", data?.msg || "pending");
          if (data?.msg === "process_completed") {
            cleanup();
            console.log("Processing complete.");
            resolve(data.output?.data || data.output);
          }
          if (data?.msg === "process_failed" || data?.msg === "error") {
            cleanup();
            reject(new Error(data?.output?.error || "Processing failed"));
          }
        } catch (error) {
          console.error("Error parsing event data:", error);
        }
      };
      es.onerror = err => {
        console.error("EventSource error while listening for result:", err);
        cleanup();
        reject(err);
      };
      setTimeout(() => {
        cleanup();
        reject(new Error("Generation timeout"));
      }, 3e5);
    });
  }
  async txt2img({
    prompt,
    ...rest
  }) {
    try {
      console.log("Starting txt2img generation...");
      await this._joinQueueTxt2Img(prompt, rest);
      const result = await this._listenForResult();
      return result;
    } catch (error) {
      console.error("Error in txt2img:", error?.message);
      throw error;
    }
  }
  async img2img({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("Starting img2img generation...");
      const imageData = await this._handleImage(imageUrl);
      const fileData = await this._upload(imageData);
      await this._monitorUpload();
      await this._joinQueueImg2Img(fileData, prompt, rest);
      const result = await this._listenForResult();
      return result;
    } catch (error) {
      console.error("Error in img2img:", error?.message);
      throw error;
    }
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      let result;
      if (imageUrl) {
        result = await this.img2img({
          prompt: prompt,
          imageUrl: imageUrl,
          ...rest
        });
      } else {
        result = await this.txt2img({
          prompt: prompt,
          ...rest
        });
      }
      return result;
    } catch (error) {
      console.error("Error in generate:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  try {
    const api = new HeartSyncImageGenerator();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}