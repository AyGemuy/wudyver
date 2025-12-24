import axios from "axios";
import crypto from "crypto";
import Encoder from "@/lib/encoder";
class SoraClient {
  constructor() {
    this.baseUrl = "https://www.sora-2.tools";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers
    });
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
  createAnonId() {
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  createFingerprint() {
    return crypto.randomBytes(16).toString("hex");
  }
  processImage(img) {
    if (!img) return null;
    if (Buffer.isBuffer(img)) return `data:image/jpeg;base64,${img.toString("base64")}`;
    if (typeof img === "string" && !img.startsWith("http") && !img.startsWith("data:")) return `data:image/jpeg;base64,${img}`;
    return img;
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    console.log(`[SoraClient] Memulai generate...`);
    const anonymousId = rest.anonymousId || this.createAnonId();
    const fingerprint = rest.browserFingerprint || this.createFingerprint();
    const imageSource = this.processImage(imageUrl);
    const modelType = imageSource ? "image-to-video" : "text-to-video";
    const referenceImageUrls = imageSource ? [imageSource] : [];
    const payload = {
      prompt: prompt || "car in the tokyo",
      anonymousId: anonymousId,
      browserFingerprint: fingerprint,
      referenceImageUrls: referenceImageUrls,
      duration: rest.duration || 10,
      resolution: rest.resolution || "720p",
      model: modelType,
      ...rest
    };
    try {
      console.log(`[SoraClient] Mode: ${modelType}, Prompt: ${payload.prompt}`);
      const response = await this.client.post("/api/video/generate", payload);
      const requestId = response?.data?.requestId;
      const id = response?.data?.id;
      if (!requestId) throw new Error("No Request ID returned");
      console.log(`[SoraClient] Request ID: ${requestId}`);
      const task_id = await this.enc({
        requestId: requestId,
        anonymousId: anonymousId,
        fingerprint: fingerprint,
        id: id
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error(`[SoraClient] Error Generate: ${error?.response?.data?.error || error.message}`);
      return {
        error: true,
        message: error.message
      };
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
      requestId,
      anonymousId,
      fingerprint
    } = decryptedData;
    if (!requestId || !anonymousId || !fingerprint) {
      console.error(`[SoraClient] Parameter status kurang lengkap.`);
      return null;
    }
    try {
      const response = await this.client.get("/api/video/task", {
        params: {
          requestId: requestId,
          anonymousId: anonymousId,
          fingerprint: fingerprint
        }
      });
      const resultData = response?.data?.data;
      if (!resultData) {
        console.log(`[SoraClient] Menunggu data...`);
        return {
          status: "waiting"
        };
      }
      const {
        status,
        videoUrl,
        failReason,
        metadata
      } = resultData;
      const detailState = metadata?.kieState || metadata?.status || "N/A";
      if (status === "succeeded") {
        console.log(`[SoraClient] SUKSES! Video URL: ${videoUrl}`);
      } else if (status === "failed") {
        console.log(`[SoraClient] GAGAL! Alasan: ${failReason}`);
      } else {
        console.log(`[SoraClient] Status: ${status} | Detail: ${detailState}`);
      }
      return resultData;
    } catch (error) {
      console.error(`[SoraClient] Error Status: ${error?.message}`);
      return null;
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
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new SoraClient();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate', 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}