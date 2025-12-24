import axios from "axios";
import crypto from "crypto";
class DescribePicture {
  constructor() {
    this.baseUrl = "https://us-central1-describepicture.cloudfunctions.net";
    this.storageBaseUrl = "https://storage.googleapis.com/describe-picture-image";
    this.encryptionKey = "8fb207b01e2e45d36cb26a1ae0a3b850ab1b86181110e7ddd5c27e54465c8dfd";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://describepicture.org",
      priority: "u=1, i",
      referer: "https://describepicture.org/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    };
    this.webcrypto = crypto.webcrypto;
  }
  _parse(response) {
    if (!response || typeof response !== "object") {
      throw new Error("Invalid response format");
    }
    const {
      encryptedResponse,
      ...restResponse
    } = response;
    const finalResponse = {
      ...restResponse
    };
    if (encryptedResponse?.answer) {
      try {
        const jsonContent = encryptedResponse.answer.replace(/^```json\n/, "").replace(/\n```$/, "");
        const parsedAnswer = JSON.parse(jsonContent);
        Object.assign(finalResponse, parsedAnswer);
        if (encryptedResponse.lastTrailChatCount !== undefined) {
          finalResponse.lastTrailChatCount = encryptedResponse.lastTrailChatCount;
        }
      } catch (error) {
        console.warn("Failed to parse answer JSON:", error.message);
        finalResponse.parseError = error.message;
      }
    }
    return finalResponse;
  }
  async describeImage({
    imageUrl,
    model = "StableDiffusionXL"
  }) {
    console.log("[1/6] Starting image description process...");
    console.log(`- Image URL: ${imageUrl}`);
    console.log(`- Selected model: ${model}`);
    try {
      console.log("[2/6] Generating random IDs...");
      const userId = this._generateRandomId("user");
      const deviceId = this._generateRandomId("device");
      console.log(`- User ID: ${userId}`);
      console.log(`- Device ID: ${deviceId}`);
      console.log("[3/6] Getting signed upload URL...");
      const filename = this._generateFilename(imageUrl);
      const contentType = await this._detectContentType(imageUrl);
      console.log(`- Detected content type: ${contentType}`);
      console.log(`- Generated filename: ${filename}`);
      const {
        signedUrl,
        filePath
      } = await this._getSignedUrl(filename, contentType);
      console.log(`- Signed URL received`);
      console.log(`- File path: ${filePath}`);
      console.log("[4/6] Uploading image to storage...");
      await this._uploadToStorage(signedUrl, imageUrl, contentType);
      console.log("- Image upload completed successfully");
      console.log("[5/6] Generating image description...");
      const requestData = {
        imageUrl: `${this.storageBaseUrl}/${filePath}`,
        mimeType: contentType,
        userId: userId,
        date: new Date().toISOString(),
        deviceId: deviceId,
        model: model
      };
      console.log("- Request data prepared:", JSON.stringify(requestData, null, 2));
      const encryptedResponse = await this._generateEncryptedPrompt(requestData);
      console.log("[6/6] Encrypted response received successfully!");
      return this._parse({
        success: true,
        encryptedResponse: encryptedResponse,
        model: model,
        imagePath: filePath,
        userId: userId,
        deviceId: deviceId,
        timestamp: requestData.date
      });
    } catch (error) {
      console.error("[ERROR] Process failed:", error.message);
      console.error("Error stack:", error.stack);
      return {
        success: false,
        error: error.message,
        errorDetails: {
          code: error.code,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  async _getSignedUrl(filename, contentType) {
    try {
      console.log(`- Requesting signed URL for ${filename} (${contentType})`);
      const response = await axios.get(`${this.baseUrl}/generateSignedUrl`, {
        params: {
          filename: filename,
          contentType: contentType
        },
        headers: this.headers
      });
      if (!response.data?.url || !response.data?.fileName) {
        throw new Error("Invalid signed URL response format");
      }
      return {
        signedUrl: response.data.url,
        filePath: response.data.fileName
      };
    } catch (error) {
      console.error("- Failed to get signed URL:", error.message);
      throw new Error(`Signed URL request failed: ${error.message}`);
    }
  }
  async _uploadToStorage(signedUrl, imageUrl, contentType) {
    try {
      console.log(`- Downloading image from ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15e3
      });
      console.log(`- Uploading ${response.data.length} bytes to storage`);
      await axios.put(signedUrl, response.data, {
        headers: {
          ...this.headers,
          "content-type": contentType,
          "content-length": response.data.length
        },
        timeout: 3e4
      });
      console.log("- Storage upload completed");
    } catch (error) {
      console.error("- Storage upload failed:", error.message);
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }
  async _encryptData(data) {
    try {
      const keyMaterial = await this._importKey(this.encryptionKey);
      const iv = this.webcrypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await this.webcrypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv
      }, keyMaterial, new TextEncoder().encode(data));
      return {
        encryptedData: new Uint8Array(encryptedData),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error("- Encryption failed:", error);
      throw new Error(`Data encryption failed: ${error.message}`);
    }
  }
  async _importKey(hexKey) {
    const keyBuffer = new Uint8Array(hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return await this.webcrypto.subtle.importKey("raw", keyBuffer, {
      name: "AES-GCM"
    }, false, ["encrypt", "decrypt"]);
  }
  async _generateEncryptedPrompt(requestData) {
    try {
      console.log("- Encrypting request data...");
      const {
        encryptedData,
        iv
      } = await this._encryptData(JSON.stringify(requestData));
      const encryptedBase64 = Buffer.from(encryptedData).toString("base64");
      const ivBase64 = Buffer.from(iv).toString("base64");
      console.log("- Data encrypted successfully");
      console.log("- Sending to prompt service...");
      const response = await axios.post(`${this.baseUrl}/image_prompt_service`, {
        encryptedData: encryptedBase64,
        iv: ivBase64
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        timeout: 45e3
      });
      if (!response.data) {
        throw new Error("Empty response from prompt service");
      }
      return response.data;
    } catch (error) {
      console.error("- Prompt generation failed:", error.message);
      throw new Error(`Prompt generation failed: ${error.message}`);
    }
  }
  _generateRandomId(prefix = "") {
    try {
      const randomBytes = crypto.randomBytes(4).toString("hex");
      return `${prefix}_${randomBytes}`;
    } catch (error) {
      console.error("- ID generation failed, using fallback");
      return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
    }
  }
  _generateFilename(imageUrl) {
    try {
      const ext = imageUrl.split(".").pop()?.split("?")[0] || "webp";
      const randomBytes = crypto.randomBytes(2).toString("hex");
      return `${Date.now()}_${randomBytes}.${ext}`;
    } catch (error) {
      console.error("- Filename generation failed, using fallback");
      return `image_${Date.now()}.webp`;
    }
  }
  async _detectContentType(imageUrl) {
    try {
      console.log("- Detecting content type...");
      const response = await axios.head(imageUrl, {
        timeout: 5e3
      });
      const contentType = response.headers["content-type"]?.split(";")[0];
      if (!contentType) {
        console.warn("- Could not detect content type, using default");
        return "image/webp";
      }
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(contentType)) {
        console.warn(`- Unsupported content type ${contentType}, using webp`);
        return "image/webp";
      }
      return contentType;
    } catch (error) {
      console.error("- Content type detection failed:", error.message);
      console.warn("- Using default content type");
      return "image/webp";
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
    const describer = new DescribePicture();
    const response = await describer.describeImage(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}