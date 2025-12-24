import axios from "axios";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
class DreamwaveAI {
  constructor() {
    this.baseUrl = "https://www.dreamwave.ai/api/studio";
    this.defaultHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "text/plain;charset=UTF-8",
      origin: "https://www.dreamwave.ai",
      priority: "u=1, i",
      referer: "https://www.dreamwave.ai/ai-image-generator",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  log(msg) {
    console.log(`[DreamwaveAI] ${msg}`);
  }
  randomId(len = 16) {
    return Array.from({
      length: len
    }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  async getImageFromUrl(url) {
    this.log(`Fetching image: ${url}`);
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const type = r.headers["content-type"] || "image/jpeg";
      const ext = type.split("/").pop() || "jpg";
      const buffer = Buffer.from(r.data, "binary");
      this.log(`Fetched image type=${type} size=${buffer.length}`);
      return {
        buffer: buffer,
        contentType: type,
        extension: ext,
        filename: `image-${Date.now()}.${ext}`
      };
    } catch (e) {
      this.log(`Error fetching image: ${e.message}`);
      throw e;
    }
  }
  async uploadReferencePhoto(extension = "jpg") {
    this.log("Requesting presigned upload URL...");
    try {
      const r = await axios.post(`${this.baseUrl}/upload-reference-photo`, {
        jobId: "",
        extension: extension
      }, {
        headers: this.defaultHeaders
      });
      this.log("Got presigned upload URL");
      this.log(JSON.stringify(r.data, null, 2));
      return r.data;
    } catch (e) {
      this.log(`Error presign: ${e.response?.data || e.message}`);
      throw e;
    }
  }
  async uploadImageToStorage(uploadData, imageData) {
    this.log("Uploading image to storage...");
    try {
      const form = new FormData();
      Object.entries(uploadData.response.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", imageData.buffer, {
        filename: imageData.filename,
        contentType: imageData.contentType
      });
      const storageUrl = uploadData.response.url || "https://storage.googleapis.com/photo-lab-primary-7938/";
      await axios.post(storageUrl, form, {
        headers: {
          ...form.getHeaders(),
          ...this.defaultHeaders,
          "sec-fetch-site": "cross-site",
          referer: "https://www.dreamwave.ai/"
        }
      });
      this.log("Image uploaded successfully");
      return uploadData.photoInfo;
    } catch (e) {
      this.log(`Error upload: ${e.response?.data || e.message}`);
      throw e;
    }
  }
  async create({
    prompt,
    imageUrl,
    totalPhotosToGenerate = 1,
    ...rest
  }) {
    this.log("Creating generation task...");
    try {
      const seeds = Math.floor(Math.random() * 1e6).toString();
      const payload = {
        isFullPromptMode: false,
        prompt: prompt,
        orientation: "Portrait",
        imageSize: "large",
        totalPhotosToGenerate: totalPhotosToGenerate,
        imageStyle: "photo",
        seeds: seeds,
        weight: 1,
        userId: `anon_${this.randomId(8)}`,
        ...rest
      };
      if (imageUrl) {
        this.log("Processing reference image...");
        const img = await this.getImageFromUrl(imageUrl);
        const upInfo = await this.uploadReferencePhoto(img.extension);
        const photoInfo = await this.uploadImageToStorage(upInfo, img);
        payload.inspiration = photoInfo.filename;
        payload.inspiration_strength = .91;
      }
      const r = await axios.post(`${this.baseUrl}/v2/generate`, payload, {
        headers: this.defaultHeaders
      });
      this.log("Generation task created");
      const result = {
        task_ids: r.data.requestIds || [],
        output_filenames: r.data.outputFilenames?.flat() || []
      };
      this.log(JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      this.log(`Error create: ${e.response?.data || e.message}`);
      throw e;
    }
  }
  async status({
    task_id
  }) {
    this.log(`Checking task status: ${task_id}`);
    try {
      const r = await axios.post(`${this.baseUrl}/v2/status`, {
        requestId: task_id
      }, {
        headers: this.defaultHeaders
      });
      if (r.data?.status === "completed") {
        this.log("Task complete, fetching result...");
        return await this.result({
          task_id: task_id
        });
      }
      this.log(`Task status: ${r.data?.status}`);
      this.log(JSON.stringify(r.data, null, 2));
      return r.data;
    } catch (e) {
      this.log(`Error status: ${e.response?.data || e.message}`);
      throw e;
    }
  }
  async result({
    task_id
  }) {
    this.log(`Fetching result for task: ${task_id}`);
    try {
      const r = await axios.post(`${this.baseUrl}/v2/result`, {
        requestId: task_id
      }, {
        headers: this.defaultHeaders
      });
      this.log("Result fetched");
      this.log(JSON.stringify(r.data, null, 2));
      return r.data;
    } catch (e) {
      this.log(`Error result: ${e.response?.data || e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (create or status) is required."
    });
  }
  const dream = new DreamwaveAI();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await dream.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await dream.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}