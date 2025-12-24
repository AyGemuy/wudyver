import fetch from "node-fetch";
import FormData from "form-data";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class DeeVidAPI {
  constructor() {
    this.apiUrl = "https://api.deevid.ai";
    this.visitorId = null;
    this.deviceId = null;
    this.baseHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      origin: "https://aikissing.pro",
      priority: "u=1, i",
      referer: "https://aikissing.pro/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-device": "MOBILE",
      "x-mobile-platform": "WEB",
      "x-os": "ANDROID",
      "x-platform": "WEB",
      ...SpoofHead()
    };
  }
  async enc(data) {
    try {
      console.log("[ENC] Mulai enkripsi data...");
      const {
        uuid: jsonUuid
      } = await Encoder.enc({
        data: data,
        method: "combined"
      });
      console.log("[ENC] Enkripsi berhasil");
      return jsonUuid;
    } catch (error) {
      console.error("[ENC] Error saat enkripsi:", error.message);
      throw new Error(`Gagal enkripsi data: ${error.message}`);
    }
  }
  async dec(uuid) {
    try {
      console.log("[DEC] Mulai dekripsi uuid...");
      const decryptedJson = await Encoder.dec({
        uuid: uuid,
        method: "combined"
      });
      console.log("[DEC] Dekripsi berhasil");
      return decryptedJson.text;
    } catch (error) {
      console.error("[DEC] Error saat dekripsi:", error.message);
      throw new Error(`Gagal dekripsi uuid: ${error.message}`);
    }
  }
  async _loginVisitor() {
    if (this.visitorId) {
      console.log("[LOGIN] Menggunakan visitor ID yang sudah ada");
      return {
        visitorId: this.visitorId,
        deviceId: this.deviceId
      };
    }
    try {
      console.log("\n[LOGIN] Memulai login sebagai visitor...");
      const deviceId = `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
      console.log(`[LOGIN] Device ID dibuat: ${deviceId}`);
      const response = await fetch(`${this.apiUrl}/account/visitor/login`, {
        method: "POST",
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json",
          "x-device-id": deviceId
        },
        body: JSON.stringify({
          productName: "aikissing"
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("[LOGIN] Response diterima:", JSON.stringify(data, null, 2));
      if (data.error?.code !== 0) {
        throw new Error(`Visitor login gagal: ${JSON.stringify(data.error)}`);
      }
      this.visitorId = data.data.data.visitorId;
      this.deviceId = data.data.data.deviceId || deviceId;
      console.log("[LOGIN] ✓ Visitor login berhasil");
      console.log(`[LOGIN]   Visitor ID: ${this.visitorId}`);
      console.log(`[LOGIN]   Device ID: ${this.deviceId}`);
      return {
        visitorId: this.visitorId,
        deviceId: this.deviceId
      };
    } catch (error) {
      console.error("[LOGIN] ✗ Error saat login visitor:", error.message);
      throw new Error(`Login visitor gagal: ${error.message}`);
    }
  }
  async _uploadVisitorImage(imageInput, width = 1024, height = 1024) {
    try {
      console.log("\n[UPLOAD] Memulai upload gambar...");
      const {
        visitorId
      } = await this._loginVisitor();
      console.log("[UPLOAD] Mengkonversi gambar ke buffer...");
      const buffer = await this._convertToBuffer(imageInput);
      console.log(`[UPLOAD] Buffer size: ${buffer.length} bytes`);
      const form = new FormData();
      form.append("file", buffer, {
        filename: `${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      form.append("width", width.toString());
      form.append("height", height.toString());
      console.log("[UPLOAD] Mengirim request upload...");
      const response = await fetch(`${this.apiUrl}/file-upload/visitor/image`, {
        method: "POST",
        headers: {
          ...this.baseHeaders,
          "content-type": `multipart/form-data; boundary=${form._boundary}`,
          "x-device-id": this.deviceId,
          "x-visitor-id": visitorId
        },
        body: form
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("[UPLOAD] Response diterima:", JSON.stringify(data, null, 2));
      if (data.error?.code !== 0) {
        throw new Error(`Upload gambar gagal: ${JSON.stringify(data.error)}`);
      }
      const imageId = data.data.data.id;
      console.log(`[UPLOAD] ✓ Gambar berhasil diupload dengan ID: ${imageId}`);
      return imageId;
    } catch (error) {
      console.error("[UPLOAD] ✗ Error saat upload gambar:", error.message);
      throw new Error(`Upload gambar gagal: ${error.message}`);
    }
  }
  async _convertToBuffer(input) {
    try {
      console.log("[CONVERT] Mendeteksi tipe input...");
      if (Buffer.isBuffer(input)) {
        console.log("[CONVERT] Input sudah berupa Buffer");
        return input;
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log("[CONVERT] Input adalah URL, mengunduh...");
          const response = await fetch(input);
          if (!response.ok) {
            throw new Error(`Gagal mengunduh gambar: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          console.log("[CONVERT] ✓ Gambar berhasil diunduh");
          return Buffer.from(arrayBuffer);
        }
        if (input.startsWith("data:image/")) {
          console.log("[CONVERT] Input adalah base64 data URL");
          const base64Data = input.replace(/^data:image\/\w+;base64,/, "");
          return Buffer.from(base64Data, "base64");
        }
        console.log("[CONVERT] Input adalah base64 string");
        return Buffer.from(input, "base64");
      }
      throw new Error("Input harus URL, base64, atau Buffer.");
    } catch (error) {
      console.error("[CONVERT] ✗ Error saat konversi:", error.message);
      throw new Error(`Konversi gambar gagal: ${error.message}`);
    }
  }
  async generate({
    image1,
    image2,
    prompt = "Make the two people in the photo smile and kiss. Keep the same original function.",
    templateId = 1
  }) {
    try {
      console.log("\n[GENERATE] ========================================");
      console.log("[GENERATE] Memulai proses AI Kissing...");
      console.log(`[GENERATE] Template ID: ${templateId}`);
      console.log(`[GENERATE] Prompt: ${prompt}`);
      const {
        visitorId
      } = await this._loginVisitor();
      console.log("\n[GENERATE] Upload gambar pertama...");
      const image1Id = await this._uploadVisitorImage(image1);
      console.log("\n[GENERATE] Upload gambar kedua...");
      const image2Id = await this._uploadVisitorImage(image2);
      console.log("\n[GENERATE] Submit task AI Kissing...");
      const response = await fetch(`${this.apiUrl}/visitor/template-to-video/task/submit`, {
        method: "POST",
        headers: {
          ...this.baseHeaders,
          "content-type": "application/json",
          "x-device-id": this.deviceId,
          "x-visitor-id": visitorId
        },
        body: JSON.stringify({
          templateId: templateId,
          originalUserImageId: [image1Id, image2Id],
          userImageId: image1Id,
          prompt: prompt
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("[GENERATE] Response diterima:", JSON.stringify(data, null, 2));
      if (data.error?.code !== 0) {
        throw new Error(`AI Kissing gagal: ${JSON.stringify(data.error)}`);
      }
      console.log("[GENERATE] ✓ Task AI Kissing berhasil dibuat");
      const statusPayload = {
        ...data.data.data,
        visitorId: this.visitorId,
        deviceId: this.deviceId,
        baseHeaders: this.baseHeaders
      };
      console.log("[GENERATE] Membuat task_id terenkripsi...");
      const task_id = await this.enc(statusPayload);
      console.log(`[GENERATE] ✓ task_id berhasil dibuat: ${task_id.substring(0, 50)}...`);
      console.log("[GENERATE] ========================================\n");
      return {
        task_id: task_id,
        taskId: data.data.data.taskId
      };
    } catch (error) {
      console.error("[GENERATE] ✗ Error pada proses generate:", error.message);
      console.error("[GENERATE] Stack trace:", error.stack);
      throw new Error(`Generate gagal: ${error.message}`);
    }
  }
  async status({
    task_id
  }) {
    try {
      if (!task_id) {
        throw new Error("`task_id` diperlukan.");
      }
      console.log("\n[STATUS] ========================================");
      console.log(`[STATUS] Mengecek status task...`);
      console.log(`[STATUS] task_id: ${task_id.substring(0, 50)}...`);
      console.log("[STATUS] Mendekode task_id...");
      const decryptedPayload = await this.dec(task_id);
      const {
        visitorId,
        deviceId,
        baseHeaders,
        taskId
      } = decryptedPayload;
      if (!visitorId || !deviceId || !taskId) {
        throw new Error("Gagal mendekripsi atau task_id tidak valid.");
      }
      console.log(`[STATUS] ✓ Dekripsi berhasil`);
      console.log(`[STATUS]   Task ID: ${taskId}`);
      console.log(`[STATUS]   Visitor ID: ${visitorId}`);
      this.visitorId = visitorId;
      this.deviceId = deviceId;
      this.baseHeaders = baseHeaders;
      console.log("[STATUS] Mengirim request status...");
      const response = await fetch(`${this.apiUrl}/visitor/video/task/${taskId}?taskId=${taskId}`, {
        method: "GET",
        headers: {
          ...this.baseHeaders,
          "x-device-id": this.deviceId,
          "x-visitor-id": this.visitorId
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("[STATUS] Response diterima:", JSON.stringify(data, null, 2));
      if (data.error?.code !== 0) {
        throw new Error(`Status video gagal: ${JSON.stringify(data.error)}`);
      }
      const taskData = data.data.data;
      console.log(`[STATUS] ✓ Status: ${taskData.status}`);
      if (taskData.videoUrl) {
        console.log(`[STATUS] ✓ Video URL: ${taskData.videoUrl}`);
      }
      console.log("[STATUS] ========================================\n");
      return taskData;
    } catch (error) {
      console.error("[STATUS] ✗ Error saat cek status:", error.message);
      console.error("[STATUS] Stack trace:", error.stack);
      throw new Error(`Status check gagal: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const startTime = Date.now();
  console.log("\n========================================");
  console.log(`[HANDLER] Request diterima: ${req.method} ${req.url}`);
  console.log(`[HANDLER] Timestamp: ${new Date().toISOString()}`);
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    console.log(`[HANDLER] Action: ${action}`);
    console.log(`[HANDLER] Params:`, JSON.stringify(params, null, 2));
    if (!action) {
      console.error("[HANDLER] ✗ Parameter 'action' tidak ditemukan");
      return res.status(400).json({
        error: "Parameter 'action' wajib diisi.",
        availableActions: ["generate", "status"]
      });
    }
    const api = new DeeVidAPI();
    let response;
    switch (action) {
      case "generate":
        if (!params.image1 || !params.image2) {
          console.error("[HANDLER] ✗ Parameter image1/image2 tidak lengkap");
          return res.status(400).json({
            error: "Parameter 'image1' dan 'image2' wajib untuk generate."
          });
        }
        console.log("[HANDLER] Menjalankan action: generate");
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          console.error("[HANDLER] ✗ Parameter task_id tidak ditemukan");
          return res.status(400).json({
            error: "Parameter 'task_id' wajib untuk status."
          });
        }
        console.log("[HANDLER] Menjalankan action: status");
        response = await api.status(params);
        break;
      default:
        console.error(`[HANDLER] ✗ Action tidak valid: ${action}`);
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          availableActions: ["generate", "status"]
        });
    }
    const duration = Date.now() - startTime;
    console.log(`[HANDLER] ✓ Request berhasil diproses dalam ${duration}ms`);
    console.log("[HANDLER] Response:", JSON.stringify(response, null, 2));
    console.log("========================================\n");
    return res.status(200).json({
      success: true,
      data: response,
      duration: `${duration}ms`
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("\n[HANDLER] ✗✗✗ FATAL ERROR ✗✗✗");
    console.error(`[HANDLER] Action: ${req.body?.action || req.query?.action}`);
    console.error(`[HANDLER] Error: ${error.message}`);
    console.error(`[HANDLER] Stack: ${error.stack}`);
    console.error(`[HANDLER] Duration: ${duration}ms`);
    console.error("========================================\n");
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal.",
      duration: `${duration}ms`
    });
  }
}