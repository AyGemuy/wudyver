import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class MicMonster {
  constructor() {
    this.baseURL = "https://micmonster.com/";
    this.apiHost = "https://mmhomepageapi.azurewebsites.net/api/MMHomePageApi";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.code = "";
    this.cookies = "";
    this.headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/json",
      origin: this.baseURL,
      referer: this.baseURL,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async init() {
    try {
      console.log("[INFO] Fetching main page...");
      const res = await axios.get(this.baseURL, {
        headers: this.headers,
        withCredentials: true
      });
      const setCookies = res.headers["set-cookie"];
      this.cookies = setCookies?.map(c => c.split(";")[0]).join("; ") || "";
      console.log("[INFO] Cookies:", this.cookies);
      const match = res.data.match(/code=([\w-=]+)/);
      if (!match) throw new Error("Code not found in HTML");
      this.code = match[1];
      console.log("[INFO] Code:", this.code);
      return res.data;
    } catch (err) {
      console.error("[ERROR] Failed to init:", err.message);
      throw err;
    }
  }
  async list() {
    try {
      const html = await this.init();
      console.log("[INFO] Parsing voices using split and trim...");
      const scriptPart = html.split("voices: [{")[1];
      if (!scriptPart) throw new Error("Voice list not found");
      const cleaned = scriptPart.trim();
      const jsonRaw = "[{" + cleaned.split("}],")[0].trim() + "}]";
      const voices = JSON.parse(jsonRaw);
      console.log(`[INFO] Found ${voices.length} voices`);
      return voices;
    } catch (err) {
      console.error("[ERROR] Failed to parse voices:", err.message);
      throw err;
    }
  }
  toBuffer(inputString) {
    const base64Data = inputString.startsWith("data:") ? inputString.split(",")[1] : inputString;
    return Buffer.from(base64Data, "base64");
  }
  async uploadMedia(buffer, mimeType = "audio/mpeg", fileName = "audio.mp3") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async create({
    voice = "en-US-JennyNeural",
    locale = "en-US",
    text = "Hello world"
  }) {
    try {
      if (!this.code || !this.cookies) {
        console.log("[INFO] Initializing...");
        await this.init();
      }
      const data = {
        content: `<voice name='${voice}'>${text}</voice>`,
        locale: locale,
        ip: "20.161.75.210"
      };
      console.log("[INFO] Sending request to voice API...");
      const res = await axios.post(`${this.apiHost}?code=${this.code}`, data, {
        headers: {
          ...this.headers,
          cookie: this.cookies
        }
      });
      console.log("[SUCCESS] Voice API response received.");
      if (!res.data) throw new Error("No audio returned");
      const base64 = res.data;
      const upload = await this.uploadMedia(this.toBuffer(base64));
      console.log(upload);
      return upload;
    } catch (err) {
      console.error("[ERROR] Failed to generate or upload:", err.message);
      throw err;
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
      error: "Missing required field: action",
      required: {
        action: "list | create"
      }
    });
  }
  const mic = new MicMonster();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action]();
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}