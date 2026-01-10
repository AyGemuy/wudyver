import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class PixsterAI {
  constructor() {
    this.pkgName = "com.pixsterstudio.chatgpt";
    this.cert = "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81";
    this.apiKey = "AIzaSyDFMgD8sdmOY2bo7Il4ZTwbSme8AGeTLSI";
    this.request = axios.create();
    this.CONSTANTS = {
      APP_NAME: "AI Chat(Android)3.8",
      OS_TYPE: "Android",
      DEFAULT_MODEL: "gpt-4o-mini",
      VISION_MODEL: "gemini-2.5-flash",
      AVAILABLE_MODES: ["chat", "vision", "generate"]
    };
    this.SERVICES = {
      MULTI_MODEL: "https://multimodelhandler-746036526161.us-central1.run.app",
      VISION: "https://us-central1-automation-functions-a13e7.cloudfunctions.net/",
      IMAGE_GEN: "https://geminiimagenforaichat-746036526161.us-central1.run.app/",
      FIREBASE_INSTALL: "https://firebaseinstallations.googleapis.com/v1/projects/chatgpt-c1cfb/installations",
      IDENTITY_SIGNUP: `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.apiKey}`
    };
    this.session = {
      fid: null,
      idToken: null,
      userId: null
    };
  }
  _generateFid() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const randomBytes = crypto.randomBytes(22);
    let result = "";
    for (let i = 0; i < 22; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return result;
  }
  getCommonHeaders() {
    return {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Accept: "application/json",
      "Content-Type": "application/json",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "X-Android-Package": this.pkgName,
      "X-Android-Cert": this.cert,
      "X-Firebase-GMPID": "1:146345438954:android:0c0a80569e990f3844f193",
      "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
    };
  }
  async _processMedia(input, returnBuffer = true) {
    try {
      if (!input) return null;
      console.log(`[Media] Processing input type: ${typeof input}`);
      if (Buffer.isBuffer(input)) {
        return returnBuffer ? input : `data:image/jpeg;base64,${input.toString("base64")}`;
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          if (returnBuffer) {
            console.log(`[Media] Fetching URL: ${input}`);
            const response = await axios.get(input, {
              responseType: "arraybuffer"
            });
            return Buffer.from(response.data);
          }
          return input;
        }
        const base64Clean = input.replace(/^data:image\/\w+;base64,/, "");
        if (returnBuffer) return Buffer.from(base64Clean, "base64");
        return input.startsWith("data:") ? input : `data:image/jpeg;base64,${base64Clean}`;
      }
      throw new Error("Invalid media format (Must be Buffer, URL, or Base64).");
    } catch (error) {
      console.error(`[Media] Error: ${error.message}`);
      throw error;
    }
  }
  async authenticate() {
    if (this.session.idToken) return this.session.idToken;
    console.log("[Auth] Starting authentication process...");
    const headers = this.getCommonHeaders();
    const fakeFid = this._generateFid();
    try {
      console.log(`[Auth] Generated FID: ${fakeFid}`);
      const installRes = await this.request.post(this.SERVICES.FIREBASE_INSTALL, JSON.stringify({
        fid: fakeFid,
        appId: "1:146345438954:android:0c0a80569e990f3844f193",
        authVersion: "FIS_v2",
        sdkVersion: "a:17.2.0"
      }), {
        headers: {
          ...headers,
          "x-goog-api-key": this.apiKey
        }
      });
      const authRes = await this.request.post(this.SERVICES.IDENTITY_SIGNUP, JSON.stringify({
        clientType: "CLIENT_TYPE_ANDROID"
      }), {
        headers: headers
      });
      this.session.idToken = authRes.data.idToken;
      this.session.userId = authRes.data.localId;
      console.log(`[Auth] Success! UserID: ${this.session.userId}`);
      return this.session.idToken;
    } catch (error) {
      console.error("[Auth] Failed:", error.message);
      if (error.response) console.error("[Auth] Response:", error.response.data);
      throw new Error("Authentication failed.");
    }
  }
  async run({
    mode,
    prompt,
    image,
    ...rest
  }) {
    console.log(`\n[PixsterAI] Request received. Mode: ${mode}`);
    const errorResponse = msg => ({
      status: false,
      message: msg,
      available_modes: this.CONSTANTS.AVAILABLE_MODES,
      guide: {
        chat: "Requires 'prompt'",
        vision: "Requires 'prompt' and 'image'",
        generate: "Requires 'prompt'"
      }
    });
    if (!mode || !this.CONSTANTS.AVAILABLE_MODES.includes(mode)) {
      console.warn(`[Validation] Invalid mode: ${mode}`);
      return errorResponse(`Invalid mode '${mode}'. Allowed: ${this.CONSTANTS.AVAILABLE_MODES.join(", ")}`);
    }
    if (mode === "chat" && !prompt) return errorResponse("Missing 'prompt' for chat.");
    if (mode === "vision" && (!image && !rest.image_urls)) return errorResponse("Missing 'image' for vision.");
    if (mode === "generate" && !prompt) return errorResponse("Missing 'prompt' for generate.");
    try {
      const token = await this.authenticate();
      const headers = this.getCommonHeaders();
      headers["Authorization"] = `Bearer ${token}`;
      let url, payloadObj, finalPayload;
      let isMultipart = false;
      switch (mode) {
        case "chat":
          console.log("[Mode: Chat] Preparing payload...");
          url = this.SERVICES.MULTI_MODEL;
          payloadObj = {
            appName: this.CONSTANTS.APP_NAME,
            responseType: "normal",
            userQuery: prompt,
            context: rest.context || "",
            userId: this.session.userId,
            osType: this.CONSTANTS.OS_TYPE,
            maxTokens: rest.maxTokens || 4e3,
            model: rest.model || this.CONSTANTS.DEFAULT_MODEL,
            country_code: rest.countryCode || "ID",
            ...rest
          };
          break;
        case "vision":
          console.log("[Mode: Vision] Processing images...");
          url = `${this.SERVICES.VISION}geminiVision`;
          const inputImages = Array.isArray(image) ? image : [image];
          const imageUrls = [];
          for (const img of inputImages) {
            const processed = await this._processMedia(img, false);
            if (processed) imageUrls.push(processed);
          }
          payloadObj = {
            model: rest.model || this.CONSTANTS.VISION_MODEL,
            image_urls: imageUrls,
            query: prompt || "Describe this",
            ...rest
          };
          break;
        case "generate":
          console.log("[Mode: Generate] Building FormData...");
          url = `${this.SERVICES.IMAGE_GEN}generate`;
          isMultipart = true;
          payloadObj = new FormData();
          payloadObj.append("prompt", prompt);
          if (image) {
            const genImage = Array.isArray(image) ? image[0] : image;
            const imgBuf = await this._processMedia(genImage, true);
            payloadObj.append("image", imgBuf, {
              filename: "ref_image.png"
            });
            console.log("[Mode: Generate] Reference image attached.");
          }
          break;
      }
      if (isMultipart) {
        finalPayload = payloadObj;
        delete headers["Content-Type"];
        const formDataHeaders = finalPayload.getHeaders();
        Object.assign(headers, formDataHeaders);
        console.log(`[Network] POST ${url} (Multipart)`);
      } else {
        finalPayload = JSON.stringify(payloadObj);
        console.log(`[Network] POST ${url}`);
      }
      const response = await this.request.post(url, finalPayload, {
        headers: headers
      });
      console.log(`[Network] Response Status: ${response.status}`);
      return {
        status: true,
        mode: mode,
        timestamp: new Date().toISOString(),
        data: response.data
      };
    } catch (error) {
      console.error(`[Error] Execution failed in mode '${mode}'`);
      let errorMessage = error.message;
      let errorDetails = null;
      if (error.response) {
        console.error(`[Error] Status: ${error.response.status}`);
        console.error(`[Error] Body:`, JSON.stringify(error.response.data, null, 2));
        errorMessage = "API Request Failed";
        errorDetails = error.response.data;
      } else {
        console.error(`[Error] Trace:`, error.stack);
      }
      return {
        status: false,
        mode: mode,
        message: errorMessage,
        details: errorDetails
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new PixsterAI();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}