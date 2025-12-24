import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
class FantoraAI {
  constructor() {
    this.fingerprint = crypto.randomBytes(16).toString("hex");
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://fantoraai.com",
      referer: "https://fantoraai.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      cookie: `userFingerprint=${this.fingerprint}`,
      ...SpoofHead()
    };
    this.client = axios.create({
      baseURL: "https://fantoraai.com/api/wyh",
      headers: this.headers
    });
  }
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async solve_img(input) {
    try {
      console.log("🔄 Memproses input media...");
      if (Buffer.isBuffer(input)) {
        return {
          buffer: input,
          mime: "image/jpeg",
          ext: "jpg"
        };
      }
      if (typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"))) {
        const response = await axios.get(input, {
          responseType: "arraybuffer"
        });
        const contentType = response.headers["content-type"] || "image/jpeg";
        const ext = contentType.split("/")[1] || "jpg";
        return {
          buffer: Buffer.from(response.data),
          mime: contentType,
          ext: ext
        };
      }
      if (typeof input === "string" && input.includes("base64")) {
        const base64Data = input.split(";base64,").pop();
        const mime = input.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/) ? input.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1] : "image/jpeg";
        const ext = mime.split("/")[1] || "jpg";
        return {
          buffer: Buffer.from(base64Data, "base64"),
          mime: mime,
          ext: ext
        };
      }
      throw new Error("Format input tidak didukung");
    } catch (error) {
      console.log("❌ Gagal memproses input:", error.message);
      throw error;
    }
  }
  async pre_sign(fileSize, fileType, fileName) {
    try {
      console.log(`📡 Request Presigned URL untuk ${fileName}...`);
      const payload = {
        filename: fileName,
        filetype: fileType,
        fileSize: fileSize,
        userId: "",
        fingerprintId: this.fingerprint
      };
      const res = await this.client.post("/get-upload-url", payload);
      const data = res?.data;
      if (!data?.uploadUrl) throw new Error("Gagal mendapatkan uploadUrl");
      console.log("✅ Presigned URL didapatkan.");
      return data;
    } catch (error) {
      console.log("❌ Error pre_sign:", error?.response?.data || error.message);
      throw error;
    }
  }
  async up_r2(uploadUrl, buffer, mimeType) {
    try {
      console.log("📤 Mengupload file ke Storage...");
      await axios.put(uploadUrl, buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.length
        }
      });
      console.log("✅ Upload berhasil.");
    } catch (error) {
      console.log("❌ Error up_r2:", error.message);
      throw error;
    }
  }
  async poll_task(taskId) {
    console.log("⏳ Menunggu hasil generasi...");
    let status = "processing";
    let result = null;
    while (status !== "succeeded" && status !== "failed") {
      await this.delay(3e3);
      try {
        const res = await this.client.get(`/check-status?taskId=${taskId}`);
        const data = res?.data;
        status = data?.status || "processing";
        console.log(`🔎 Status: ${status}`);
        if (status === "succeeded") {
          result = data?.output;
        } else if (status === "failed") {
          throw new Error("Task AI Gagal diproses oleh server.");
        }
      } catch (err) {
        console.log("⚠️ Error saat polling (retrying):", err.message);
      }
    }
    return result;
  }
  async tryon({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("=== 👔 Virtual Try-On ===");
      const uploadedPublicUrls = [];
      const imageInputs = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
      for (const img of imageInputs) {
        const {
          buffer,
          mime,
          ext
        } = await this.solve_img(img);
        const filename = `tryon_${Date.now()}_${crypto.randomInt(1e4)}.${ext}`;
        const presignData = await this.pre_sign(buffer.length, mime, filename);
        await this.up_r2(presignData.uploadUrl, buffer, mime);
        uploadedPublicUrls.push(presignData.publicUrl);
      }
      const payload = {
        prompt: prompt || PROMPT.text,
        images: uploadedPublicUrls,
        userId: null,
        fingerprintId: this.fingerprint
      };
      const res = await this.client.post("/tryon", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async txt2img({
    prompt,
    aspectRatio = "1:1",
    ...rest
  }) {
    try {
      console.log("=== 🎨 Text to Image ===");
      const payload = {
        prompt: prompt || PROMPT.text,
        userId: null,
        fingerprintId: this.fingerprint,
        aspectRatio: aspectRatio
      };
      const res = await this.client.post("/generate-image", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async img2img({
    prompt,
    imageUrl,
    aspectRatio = "1:1",
    ...rest
  }) {
    try {
      console.log("=== 🖼️ Image to Image ===");
      const {
        buffer,
        mime,
        ext
      } = await this.solve_img(imageUrl);
      const filename = `img2img_${Date.now()}.${ext}`;
      const presignData = await this.pre_sign(buffer.length, mime, filename);
      await this.up_r2(presignData.uploadUrl, buffer, mime);
      const payload = {
        prompt: prompt || PROMPT.text,
        imageUrl: presignData.publicUrl,
        userId: null,
        fingerprintId: this.fingerprint,
        aspectRatio: aspectRatio
      };
      const res = await this.client.post("/generate-image", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async imgedit({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log("=== ✏️ Image Edit ===");
      const uploadedPublicUrls = [];
      const imageInputs = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      for (const img of imageInputs) {
        const {
          buffer,
          mime,
          ext
        } = await this.solve_img(img);
        const filename = `edit_${Date.now()}.${ext}`;
        const presignData = await this.pre_sign(buffer.length, mime, filename);
        await this.up_r2(presignData.uploadUrl, buffer, mime);
        uploadedPublicUrls.push(presignData.publicUrl);
      }
      const payload = {
        prompt: prompt || PROMPT.text,
        images: uploadedPublicUrls,
        userId: null,
        fingerprintId: this.fingerprint
      };
      const res = await this.client.post("/editor-image", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async txt2logo({
    prompt,
    aspectRatio = "1:1",
    styleType = "modern",
    seed,
    negativePrompt,
    ...rest
  }) {
    try {
      console.log("=== 🏷️ Text to Logo ===");
      const payload = {
        prompt: prompt || PROMPT.text,
        userId: null,
        fingerprintId: this.fingerprint,
        aspect_ratio: aspectRatio,
        style_type: styleType,
        seed: seed,
        negative_prompt: negativePrompt
      };
      const res = await this.client.post("/generate-logo", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async txt2poster({
    prompt,
    aspectRatio = "9:16",
    styleType = "modern",
    seed,
    negativePrompt,
    ...rest
  }) {
    try {
      console.log("=== 📰 Text to Poster ===");
      const payload = {
        prompt: prompt || PROMPT.text,
        userId: null,
        fingerprintId: this.fingerprint,
        aspect_ratio: aspectRatio,
        style_type: styleType,
        seed: seed,
        negative_prompt: negativePrompt
      };
      const res = await this.client.post("/generate-poster", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async img2poster({
    prompt,
    imageUrl,
    aspectRatio = "9:16",
    ...rest
  }) {
    try {
      console.log("=== 🖼️➡️📰 Image to Poster ===");
      const {
        buffer,
        mime,
        ext
      } = await this.solve_img(imageUrl);
      const filename = `poster_${Date.now()}.${ext}`;
      const presignData = await this.pre_sign(buffer.length, mime, filename);
      await this.up_r2(presignData.uploadUrl, buffer, mime);
      const payload = {
        prompt: prompt || PROMPT.text,
        aspectRatio: aspectRatio,
        imageUrl: presignData.publicUrl,
        userId: null,
        fingerprintId: this.fingerprint
      };
      const res = await this.client.post("/edit-generated-poster", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async faceswap({
    sourceImage,
    targetImage,
    ...rest
  }) {
    try {
      console.log("=== 😎 Face Swap ===");
      const {
        buffer: sourceBuf,
        mime: sourceMime,
        ext: sourceExt
      } = await this.solve_img(sourceImage);
      const {
        buffer: targetBuf,
        mime: targetMime,
        ext: targetExt
      } = await this.solve_img(targetImage);
      const sourceFilename = `source_${Date.now()}.${sourceExt}`;
      const targetFilename = `target_${Date.now()}.${targetExt}`;
      const sourcePresign = await this.pre_sign(sourceBuf.length, sourceMime, sourceFilename);
      await this.up_r2(sourcePresign.uploadUrl, sourceBuf, sourceMime);
      const targetPresign = await this.pre_sign(targetBuf.length, targetMime, targetFilename);
      await this.up_r2(targetPresign.uploadUrl, targetBuf, targetMime);
      const formData = new FormData();
      formData.append("sourceImage", sourceBuf, {
        filename: sourceFilename,
        contentType: sourceMime
      });
      formData.append("targetImage", targetBuf, {
        filename: targetFilename,
        contentType: targetMime
      });
      const res = await axios.post("https://fantoraai.com/api/wyh/faceswap", formData, {
        headers: {
          ...this.headers,
          ...formData.getHeaders()
        },
        responseType: "arraybuffer"
      });
      const resultBuffer = Buffer.from(res.data);
      const resultFilename = `faceswap_result_${Date.now()}.jpg`;
      const resultPresign = await this.pre_sign(resultBuffer.length, "image/jpeg", resultFilename);
      await this.up_r2(resultPresign.uploadUrl, resultBuffer, "image/jpeg");
      return {
        success: true,
        result: resultPresign.publicUrl,
        mime: "image/jpeg",
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  async img2vid({
    prompt,
    imageUrl,
    aspectRatio = "16:9",
    duration = 5,
    ...rest
  }) {
    try {
      console.log("=== 🎬 Image to Video ===");
      const {
        buffer,
        mime,
        ext
      } = await this.solve_img(imageUrl);
      const filename = `video_${Date.now()}.${ext}`;
      const presignData = await this.pre_sign(buffer.length, mime, filename);
      await this.up_r2(presignData.uploadUrl, buffer, mime);
      const payload = {
        prompt: prompt || PROMPT.text,
        imageUrl: presignData.publicUrl,
        userId: null,
        fingerprintId: this.fingerprint,
        aspectRatio: aspectRatio,
        duration: duration
      };
      const res = await this.client.post("/generate-video-from-image", payload);
      const taskId = res?.data?.taskId;
      if (!taskId) throw new Error("TaskId tidak ditemukan");
      const finalResult = await this.poll_task(taskId);
      return {
        success: true,
        taskId: taskId,
        result: finalResult,
        isVideo: true,
        ...rest
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
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
  const api = new FantoraAI();
  try {
    let response;
    switch (action) {
      case "tryon":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'imageUrl' wajib diisi untuk action 'tryon'."
          });
        }
        response = await api.tryon(params);
        break;
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2img'."
          });
        }
        response = await api.txt2img(params);
        break;
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'imageUrl' wajib diisi untuk action 'img2img'."
          });
        }
        response = await api.img2img(params);
        break;
      case "imgedit":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'imageUrl' wajib diisi untuk action 'imgedit'."
          });
        }
        response = await api.imgedit(params);
        break;
      case "txt2logo":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2logo'."
          });
        }
        response = await api.txt2logo(params);
        break;
      case "txt2poster":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'txt2poster'."
          });
        }
        response = await api.txt2poster(params);
        break;
      case "img2poster":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'imageUrl' wajib diisi untuk action 'img2poster'."
          });
        }
        response = await api.img2poster(params);
        break;
      case "faceswap":
        if (!params.sourceImage || !params.targetImage) {
          return res.status(400).json({
            error: "Parameter 'sourceImage' dan 'targetImage' wajib diisi untuk action 'faceswap'."
          });
        }
        response = await api.faceswap(params);
        break;
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Parameter 'prompt' dan 'imageUrl' wajib diisi untuk action 'img2vid'."
          });
        }
        response = await api.img2vid(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'tryon', 'txt2img', 'img2img', 'imgedit', 'txt2logo', 'txt2poster', 'img2poster', 'faceswap', 'img2vid'.`
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