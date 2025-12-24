import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class AnimeCharacterFinder {
  constructor() {
    this.uploadUrl = "https://smilingwolf-wd-tagger.hf.space/gradio_api/upload";
    this.queueUrl = "https://smilingwolf-wd-tagger.hf.space/gradio_api/queue/join?";
    this.dataUrl = "https://smilingwolf-wd-tagger.hf.space/gradio_api/queue/data?session_hash=";
  }
  generateSessionHash() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let hash = "guid";
    for (let i = 0; i < 8; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
  async uploadImage({
    url: imgUrl
  }) {
    try {
      console.log("[INFO] Downloading image:", imgUrl);
      const {
        data: fileBuffer,
        headers
      } = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"].split("/")[1];
      console.log("[INFO] Creating form data...");
      const form = new FormData();
      form.append("files", new Blob([fileBuffer], {
        type: headers["content-type"]
      }), `image.${ext}`);
      console.log("[INFO] Uploading image...");
      const response = await axios.post(this.uploadUrl, form, {
        headers: {
          ...form.headers,
          accept: "*/*",
          origin: "https://www.animecharacterfinder.com",
          referer: "https://www.animecharacterfinder.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const uploadedFiles = response.data;
      console.log("[INFO] Upload success:", uploadedFiles);
      if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
        return await this.processImage(uploadedFiles[0]);
      }
      console.error("[ERROR] Upload failed or empty response.");
      return null;
    } catch (error) {
      console.error("[ERROR] Upload failed:", error.message);
      return null;
    }
  }
  async processImage(filePath) {
    try {
      const sessionHash = this.generateSessionHash();
      console.log("[INFO] Processing image:", filePath, "Session:", sessionHash);
      const requestData = {
        data: [{
          path: filePath,
          meta: {
            _type: "gradio.FileData"
          }
        }, "SmilingWolf/wd-swinv2-tagger-v3", 0, true, 0, true],
        event_data: null,
        fn_index: 2,
        trigger_id: null,
        session_hash: sessionHash
      };
      const response = await axios.post(this.queueUrl, requestData, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://www.animecharacterfinder.com",
          referer: "https://www.animecharacterfinder.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const {
        event_id
      } = response.data;
      if (!event_id) {
        console.error("[ERROR] Processing failed, no event_id received.");
        return null;
      }
      console.log("[INFO] Processing result:", response.data);
      return await this.getProcessingResult(sessionHash);
    } catch (error) {
      console.error("[ERROR] Processing failed:", error.message);
      return null;
    }
  }
  async getProcessingResult(sessionHash) {
    try {
      console.log("[INFO] Fetching processing result for session:", sessionHash);
      const response = await axios.get(`${this.dataUrl}${sessionHash}`, {
        headers: {
          accept: "text/event-stream",
          origin: "https://www.animecharacterfinder.com",
          referer: "https://www.animecharacterfinder.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const lines = response.data.split("\n").filter(line => line.startsWith("data: ")).map(line => JSON.parse(line.slice(6)));
      const completedData = lines.find(item => item.msg === "process_completed");
      if (completedData && completedData.output) {
        console.log("[INFO] Final processing result:", completedData.output.data);
        return completedData.output;
      }
      console.error("[ERROR] No completed processing found.");
      return null;
    } catch (error) {
      console.error("[ERROR] Fetching result failed:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const finder = new AnimeCharacterFinder();
  try {
    const data = await finder.uploadImage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}