import axios from "axios";
import OSS from "ali-oss";
import SpoofHead from "@/lib/spoof-head";
class OverscaleAPI {
  constructor() {
    this.base = "https://overscale.imagewith.ai/api";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json;charset=utf-8",
      origin: "https://overscale.imagewith.ai",
      referer: "https://overscale.imagewith.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
  }
  async getToken(fileName) {
    try {
      console.log("[Token] Requesting...");
      const {
        data
      } = await axios.post(`${this.base}/token`, {
        fileName: fileName,
        __KEY: "UPSCALE_IMAGE_TOKEN_CALL_LIMIT"
      }, {
        headers: this.headers
      });
      console.log("[Token] Success:", data?.data?.configId);
      return data?.data || null;
    } catch (e) {
      console.error("[Token] Error:", e?.message);
      throw e;
    }
  }
  async upload(tokenData, buffer) {
    try {
      console.log("[Upload] Starting...");
      const endpoint = `oss-${tokenData?.region}.aliyuncs.com`;
      const client = new OSS({
        accessKeyId: tokenData?.accessKey,
        accessKeySecret: tokenData?.accessSecret,
        stsToken: tokenData?.securityToken,
        bucket: tokenData?.bucket,
        endpoint: `https://${endpoint}`,
        secure: true,
        timeout: 12e4
      });
      const result = await client.put(tokenData?.filePath, buffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      console.log("[Upload] Success:", result?.name);
      return tokenData?.accessUrl || null;
    } catch (e) {
      console.error("[Upload] Error:", e?.message);
      throw e;
    }
  }
  async make(url, factor = 2, model = 1) {
    try {
      console.log("[Make] Processing...");
      const event = JSON.stringify({
        process_event_type: 54,
        image_sr_event: {
          out_image_type: 1,
          factor: factor,
          model_type: model
        }
      });
      const {
        data
      } = await axios.post(`${this.base}/make`, {
        event: event,
        datas: [{
          url: url
        }],
        __KEY: "UPSCALE_MAKE_CALL_LIMIT"
      }, {
        headers: this.headers
      });
      console.log("[Make] TaskID:", data?.data?.taskId);
      return data?.data || null;
    } catch (e) {
      console.error("[Make] Error:", e?.message);
      throw e;
    }
  }
  async query(businessId) {
    try {
      const {
        data
      } = await axios.post(`${this.base}/query_make`, {
        businessId: businessId,
        lastQuery: false
      }, {
        headers: this.headers
      });
      return data?.data || null;
    } catch (e) {
      console.error("[Query] Error:", e?.message);
      throw e;
    }
  }
  async poll(businessId, maxAttempts = 60, interval = 3e3) {
    console.log("[Poll] Starting...");
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.query(businessId);
        if (result?.fileUrl) {
          console.log("[Poll] Complete!");
          return result;
        }
        console.log(`[Poll] Attempt ${i + 1}/${maxAttempts}...`);
        await new Promise(r => setTimeout(r, interval));
      } catch (e) {
        console.error("[Poll] Attempt failed:", e?.message);
      }
    }
    throw new Error("Polling timeout");
  }
  async toBuffer(imageUrl) {
    try {
      if (Buffer.isBuffer(imageUrl)) return imageUrl;
      if (imageUrl?.startsWith("data:")) {
        const base64 = imageUrl.split(",")[1] || imageUrl;
        return Buffer.from(base64, "base64");
      }
      console.log("[Download] Fetching image...");
      const {
        data
      } = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      return Buffer.from(data);
    } catch (e) {
      console.error("[Download] Error:", e?.message);
      throw e;
    }
  }
  async generate({
    imageUrl,
    factor = 2,
    model = 1,
    ...rest
  }) {
    try {
      const buffer = await this.toBuffer(imageUrl);
      const fileName = `upscale-${Date.now()}.jpg`;
      const tokenData = await this.getToken(fileName);
      const uploadedUrl = await this.upload(tokenData, buffer);
      const taskData = await this.make(uploadedUrl, factor, model);
      const result = await this.poll(taskData?.businessId);
      return {
        success: true,
        url: result?.fileUrl,
        taskId: result?.taskId,
        businessId: result?.businessId,
        ...rest
      };
    } catch (e) {
      console.error("[Generate] Failed:", e?.message);
      return {
        success: false,
        error: e?.message,
        ...rest
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Paramenter 'imageUrl' is required"
    });
  }
  try {
    const api = new OverscaleAPI();
    const result = await api.generate(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}