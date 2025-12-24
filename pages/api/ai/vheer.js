import axios from "axios";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
import crypto from "crypto";
class VheerEncryption {
  constructor() {
    this.encryptionKey = "vH33r_2025_AES_GCM_S3cur3_K3y_9X7mP4qR8nT2wE5yU1oI6aS3dF7gH0jK9lZ";
    this.key = this.deriveKey(this.encryptionKey);
  }
  async deriveKey(keyString) {
    console.log("🔑 Deriving encryption key...");
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyString);
    const importedKey = await crypto.subtle.importKey("raw", keyData, {
      name: "PBKDF2"
    }, false, ["deriveKey"]);
    const salt = encoder.encode("vheer-salt-2024");
    const derivedKey = await crypto.subtle.deriveKey({
      name: "PBKDF2",
      salt: salt,
      iterations: 1e4,
      hash: "SHA-256"
    }, importedKey, {
      name: "AES-GCM",
      length: 256
    }, false, ["encrypt", "decrypt"]);
    console.log("✅ Encryption key derived successfully");
    return derivedKey;
  }
  async encrypt(plaintext) {
    try {
      console.log("🔒 Encrypting data:", typeof plaintext, plaintext.length > 100 ? plaintext.substring(0, 100) + "..." : plaintext);
      const key = await this.key;
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv
      }, key, encoder.encode(plaintext));
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      const binaryString = Array.from(combined).map(byte => String.fromCharCode(byte)).join("");
      const result = btoa(binaryString);
      console.log("✅ Encryption successful, length:", result.length);
      return result;
    } catch (error) {
      console.error("❌ Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }
  async decrypt(ciphertextBase64) {
    try {
      console.log("🔓 Decrypting data, length:", ciphertextBase64.length);
      const key = await this.key;
      const decoder = new TextDecoder();
      const binaryString = atob(ciphertextBase64);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
      }
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: iv
      }, key, ciphertext);
      const result = decoder.decode(decrypted);
      console.log("✅ Decryption successful:", result.length > 100 ? result.substring(0, 100) + "..." : result);
      return result;
    } catch (error) {
      console.error("❌ Decryption error:", error);
      console.error("❌ Input was:", ciphertextBase64.substring(0, 50) + "...");
      throw new Error("Failed to decrypt data");
    }
  }
}
class VheerAPI {
  constructor() {
    this.baseURL = "https://vheer.com";
    this.uploadURL = "https://access.vheer.com/api/Vheer/UploadByFileNew";
    this.encryption = new VheerEncryption();
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://vheer.com",
      referer: "https://vheer.com/",
      "sec-ch-ua": '"Lemur";v="135", "Chromium";v="135", "Microsoft Edge";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    console.log("🚀 VheerAPI initialized");
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
  async txt2img({
    prompt,
    width = 1248,
    height = 702,
    aspect_ratio = "16:9",
    flux_model = 1,
    email = "",
    lan_code = "en",
    ...rest
  }) {
    console.log("🎨 Starting txt2img generation...");
    try {
      const uploadPayload = {
        prompt: prompt,
        type: 1,
        width: width,
        height: height,
        email: email,
        lan_code: lan_code,
        aspect_ratio: aspect_ratio,
        flux_model: flux_model,
        ...rest
      };
      console.log("📤 Upload payload:", uploadPayload);
      const encryptedParams = await this.encryption.encrypt(JSON.stringify(uploadPayload));
      const formData = new FormData();
      formData.append("params", encryptedParams);
      console.log("🌐 Sending upload request...");
      const uploadResponse = await axios.post(this.uploadURL, formData, {
        headers: {
          ...this.headers,
          "content-type": "multipart/form-data"
        }
      });
      console.log("📥 Upload response:", uploadResponse.data);
      if (!uploadResponse.data || !uploadResponse.data.data.code) {
        throw new Error("Failed to get task code from upload");
      }
      const taskCode = uploadResponse.data.data.code;
      console.log("🏷️ Task code received:", taskCode);
      const submitPayload = {
        type: 1,
        code: taskCode,
        email: email || ""
      };
      const encryptedSubmit = await this.encryption.encrypt(JSON.stringify(submitPayload));
      console.log("🌐 Sending submit request...");
      const submitResponse = await axios.post(`${this.baseURL}/app/text-to-image`, [{
        params: encryptedSubmit
      }], {
        headers: {
          ...this.headers,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "1eeefc61e5469e1a173b48743a3cb8dd77eed91b",
          referer: `${this.baseURL}/app/text-to-image`
        }
      });
      console.log("📥 Submit response:", submitResponse.data);
      const encryptedData = {
        success: true,
        taskCode: taskCode,
        type: "txt2img",
        message: "Generation started successfully"
      };
      const result = {
        task_id: await this.enc(encryptedData)
      };
      console.log("✅ txt2img generation initiated successfully");
      return result;
    } catch (error) {
      console.error("❌ txt2img generation error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async img2img({
    prompt,
    imageUrl,
    positive_prompts = "",
    negative_prompts = "low quality, bad quality, blurry, pixelated, distorted, poorly drawn, out of focus",
    strength = .9,
    control_strength = .2,
    width = 1024,
    height = 1024,
    email = "",
    lora = "",
    batch_size = 1,
    ...rest
  }) {
    console.log("🖼️ Starting img2img generation...");
    try {
      console.log("⬇️ Downloading image from:", imageUrl);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      console.log("✅ Image downloaded, size:", imageBuffer.length, "bytes");
      const formData = new FormData();
      formData.append("file", new Blob([imageBuffer], {
        type: "image/jpeg"
      }), "uploaded_image.jpg");
      const uploadPayload = {
        positive_prompts: prompt + (positive_prompts ? "," + positive_prompts : ""),
        negative_prompts: negative_prompts,
        strength: strength,
        control_strength: control_strength,
        type: 4,
        width: width,
        height: height,
        email: email,
        lora: lora,
        batch_size: batch_size,
        ...rest
      };
      console.log("📤 Upload payload:", uploadPayload);
      const encryptedParams = await this.encryption.encrypt(JSON.stringify(uploadPayload));
      formData.append("params", encryptedParams);
      console.log("🌐 Sending upload request...");
      const uploadResponse = await axios.post(this.uploadURL, formData, {
        headers: this.headers
      });
      console.log("📥 Upload response:", uploadResponse.data);
      if (!uploadResponse.data || !uploadResponse.data.data.code) {
        throw new Error("Failed to get task code from upload");
      }
      const taskCode = uploadResponse.data.data.code;
      console.log("🏷️ Task code received:", taskCode);
      const submitPayload = {
        type: 4,
        code: taskCode,
        email: email || ""
      };
      const encryptedSubmit = await this.encryption.encrypt(JSON.stringify(submitPayload));
      console.log("🌐 Sending submit request...");
      const submitResponse = await axios.post(`${this.baseURL}/app/image-to-image`, [{
        params: encryptedSubmit
      }], {
        headers: {
          ...this.headers,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "1eeefc61e5469e1a173b48743a3cb8dd77eed91b",
          referer: `${this.baseURL}/app/image-to-image`
        }
      });
      console.log("📥 Submit response:", submitResponse.data);
      const encryptedData = {
        taskCode: taskCode,
        type: "img2img",
        email: email || ""
      };
      const result = {
        task_id: await this.enc(encryptedData)
      };
      console.log("✅ img2img generation initiated successfully");
      return result;
    } catch (error) {
      console.error("❌ img2img generation error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async img2vid({
    prompt,
    imageUrl,
    positive_prompts = "",
    negative_prompts = "low quality, bad quality, blurry, pixelated, distorted, poorly drawn, out of focus",
    width = 1100,
    height = 733,
    frameRate = 24,
    videoLength = 5,
    videoFormat = "mp4",
    videoDimension = 768,
    model = 1,
    email = "",
    costCredits = 0,
    ...rest
  }) {
    console.log("🎬 Starting img2vid generation...");
    console.log("📝 Paramenters:", {
      prompt: prompt,
      imageUrl: imageUrl.substring(0, 50) + "...",
      width: width,
      height: height,
      frameRate: frameRate,
      videoLength: videoLength,
      videoFormat: videoFormat,
      videoDimension: videoDimension,
      model: model,
      email: email,
      costCredits: costCredits
    });
    try {
      console.log("⬇️ Downloading image from:", imageUrl);
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(imageResponse.data);
      console.log("✅ Image downloaded, size:", imageBuffer.length, "bytes");
      const formData = new FormData();
      formData.append("file", new Blob([imageBuffer], {
        type: "image/jpeg"
      }), "uploaded_image.jpg");
      const uploadPayload = {
        positive_prompts: prompt + (positive_prompts ? "," + positive_prompts : ""),
        negative_prompts: negative_prompts,
        type: 5,
        width: parseInt(width),
        height: parseInt(height),
        frameRate: parseInt(frameRate),
        videoLength: parseInt(videoLength),
        videoFormat: String(videoFormat),
        videoDimension: parseInt(videoDimension),
        model: parseInt(model),
        email: String(email),
        costCredits: parseInt(costCredits),
        ...rest
      };
      console.log("📤 Upload payload:", uploadPayload);
      const encryptedParams = await this.encryption.encrypt(JSON.stringify(uploadPayload));
      formData.append("params", encryptedParams);
      console.log("🌐 Sending upload request...");
      const uploadResponse = await axios.post(this.uploadURL, formData, {
        headers: this.headers
      });
      console.log("📥 Upload response:", uploadResponse.data);
      if (!uploadResponse.data || !uploadResponse.data.data.code) {
        throw new Error("Failed to get task code from upload");
      }
      const taskCode = uploadResponse.data.data.code;
      console.log("🏷️ Task code received:", taskCode);
      const submitPayload = {
        type: 5,
        code: String(taskCode),
        email: String(email || ""),
        model: parseInt(model)
      };
      console.log("📤 Submit payload:", submitPayload);
      const encryptedSubmit = await this.encryption.encrypt(JSON.stringify(submitPayload));
      console.log("🌐 Sending submit request...");
      const submitResponse = await axios.post(`${this.baseURL}/app/image-to-video`, [{
        params: encryptedSubmit
      }], {
        headers: {
          ...this.headers,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "1eeefc61e5469e1a173b48743a3cb8dd77eed91b",
          referer: `${this.baseURL}/app/image-to-video`
        }
      });
      console.log("📥 Submit response:", submitResponse.data);
      const encryptedData = {
        taskCode: String(taskCode),
        type: "img2vid",
        email: String(email || "")
      };
      console.log("🔐 Encrypting final data:", encryptedData);
      const result = {
        task_id: await this.enc(encryptedData)
      };
      console.log("✅ img2vid generation initiated successfully");
      return result;
    } catch (error) {
      console.error("❌ img2vid generation error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    console.log("📊 Checking status for task_id:", task_id.substring(0, 20) + "...");
    try {
      console.log("🔓 Decrypting task data...");
      const decryptedData = await this.dec(task_id);
      console.log("✅ Decrypted task data:", decryptedData);
      const {
        taskCode,
        type,
        email
      } = decryptedData;
      if (!taskCode) {
        throw new Error("No taskCode found in decrypted data");
      }
      if (!type) {
        throw new Error("No type found in decrypted data");
      }
      const fileExtension = type === "img2vid" ? "mp4" : "jpg";
      const mediaUrl = `https://access.vheer.com/results/${taskCode}.${fileExtension}`;
      console.log("🔗 Checking media URL:", mediaUrl);
      try {
        const headResponse = await axios.head(mediaUrl, {
          headers: this.headers,
          timeout: 1e4
        });
        console.log("✅ Media found - Status:", headResponse.status);
        if (headResponse.status === 200) {
          const contentLength = headResponse.headers["content-length"];
          const contentType = headResponse.headers["content-type"];
          const result = {
            success: true,
            status: "completed",
            result: mediaUrl,
            taskCode: taskCode,
            type: type,
            detail: {
              url: mediaUrl,
              size: contentLength ? parseInt(contentLength) : null,
              contentType: contentType,
              filename: `${taskCode}.${fileExtension}`
            }
          };
          console.log("✅ Media available:", result);
          return result;
        }
      } catch (headError) {
        if (headError.response && headError.response.status === 404) {
          console.log("⏳ Media not ready yet - still processing");
          return {
            success: true,
            status: "processing",
            taskCode: taskCode,
            type: type,
            message: "Task is still being processed",
            detail: {
              url: mediaUrl,
              expected: `https://access.vheer.com/results/${taskCode}.${fileExtension}`
            }
          };
        } else {
          console.log("⚠️ HEAD request error:", headError.message);
          return {
            success: false,
            status: "error",
            taskCode: taskCode,
            type: type,
            error: "Failed to check media status",
            detail: {
              url: mediaUrl,
              error: headError.message
            }
          };
        }
      }
      return {
        success: false,
        status: "unknown",
        taskCode: taskCode,
        type: type,
        error: "Unexpected status response"
      };
    } catch (error) {
      console.error("❌ Status check error:", error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
  getTypeNumber(type) {
    const typeMap = {
      txt2img: 1,
      img2img: 4,
      img2vid: 5
    };
    const result = typeMap[type];
    console.log("🔄 Type mapping:", type, "->", result);
    return result !== undefined ? result : 1;
  }
  getStatusEndpoint(type) {
    const endpointMap = {
      txt2img: "/app/text-to-image",
      img2img: "/app/image-to-image",
      img2vid: "/app/image-to-video"
    };
    const result = endpointMap[type] || "/app/text-to-image";
    console.log("🔄 Endpoint mapping:", type, "->", result);
    return result;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "txt2img | img2img | img2vid | status"
      }
    });
  }
  const generator = new VheerAPI();
  try {
    let result;
    switch (action) {
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await generator.txt2img(params);
        break;
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: prompt, imageUrl (required for ${action})`
          });
        }
        result = await generator.img2img(params);
        break;
      case "img2vid":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: `Missing required field: prompt, imageUrl (required for ${action})`
          });
        }
        result = await generator.img2vid(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required fields: task_id (required for ${action})`
          });
        }
        result = await generator.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: txt2img | img2img | img2vid | status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}