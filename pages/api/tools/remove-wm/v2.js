import axios from "axios";
import CryptoJS from "crypto-js";
class AirmoreClient {
  constructor() {
    this.base = "https://airmore.ai/wp-json/airmore/v1";
    this.client = axios.create({
      jar: this.jar,
      withCredentials: true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    this.browserUserAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.ossUserAgent = "aliyun-sdk-js/6.18.0 Chrome Mobile 127.0.0.0 on K (Android 10)";
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      "Content-Type": "application/json",
      Origin: "https://airmore.ai",
      Referer: "https://airmore.ai/watermark-remove",
      "User-Agent": this.browserUserAgent,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  sign(secret, message) {
    return CryptoJS.HmacSHA1(message, secret).toString(CryptoJS.enc.Base64);
  }
  async toBuffer(input) {
    if (!input) throw new Error("Input tidak boleh kosong");
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        const base64Data = input.split(",")[1];
        if (!base64Data) throw new Error("Format Base64 Data URI tidak valid");
        return Buffer.from(base64Data, "base64");
      }
      if (input.startsWith("http")) {
        try {
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data);
        } catch (e) {
          throw new Error(`Gagal download gambar dari URL: ${e.message}`);
        }
      }
      try {
        return Buffer.from(input, "base64");
      } catch {
        throw new Error("String input tidak dikenali (bukan URL/Base64 valid)");
      }
    }
    throw new Error("Tipe input tidak didukung. Gunakan Buffer, URL, atau Base64.");
  }
  async getAuth(filename) {
    console.log(`\n🔑 [1/4] Auth OSS (${filename})...`);
    try {
      const {
        data
      } = await this.client.post(`${this.base}/oss-auth`, {
        filenames: [filename],
        task_type: 302
      }, {
        headers: this.headers
      });
      if (!data?.data?.bucket) throw new Error("Auth response invalid");
      console.log(`✅ Auth OK. Bucket: ${data?.data?.bucket}`);
      return data?.data;
    } catch (e) {
      throw new Error(`Auth Error: ${e.message}`);
    }
  }
  async uploadAndGetUrl(auth, buffer, filename) {
    console.log(`\n📤 [2/4] Uploading to Aliyun OSS...`);
    const bucket = auth?.bucket;
    const endpoint = auth?.endpoint;
    const objectKey = auth?.objects?.[filename];
    const host = `${bucket}.${endpoint}`;
    const url = `https://${host}/${objectKey}`;
    const baseCallbackBody = auth?.callback?.callbackBody;
    const customVars = `&x:filename=${encodeURIComponent(filename)}&x:object=${objectKey}&x:endpoint=${endpoint}&x:bucket=${bucket}`;
    const finalCallbackBody = baseCallbackBody + customVars;
    const callbackJson = {
      callbackUrl: auth?.callback?.callbackUrl,
      callbackBody: finalCallbackBody,
      callbackBodyType: auth?.callback?.callbackBodyType
    };
    const callbackBase64 = Buffer.from(JSON.stringify(callbackJson)).toString("base64");
    const date = new Date().toGMTString();
    const contentType = "image/jpeg";
    const canonicalizedHeaders = `x-oss-callback:${callbackBase64}\n` + `x-oss-date:${date}\n` + `x-oss-security-token:${auth?.security_token}\n` + `x-oss-user-agent:${this.ossUserAgent}\n`;
    const stringToSign = `PUT\n\n${contentType}\n${date}\n${canonicalizedHeaders}/${bucket}/${objectKey}`;
    const signature = this.sign(auth?.access_secret, stringToSign);
    try {
      const response = await axios.put(url, buffer, {
        headers: {
          "Content-Type": contentType,
          Date: date,
          Authorization: `OSS ${auth?.access_id}:${signature}`,
          "x-oss-callback": callbackBase64,
          "x-oss-date": date,
          "x-oss-security-token": auth?.security_token,
          "x-oss-user-agent": this.ossUserAgent,
          "User-Agent": this.browserUserAgent
        }
      });
      const validUrl = response?.data?.data?.url;
      if (validUrl) {
        console.log(`✅ Upload OK. Callback Success.`);
        return validUrl.replace(/&amp;/g, "&");
      } else {
        throw new Error("Callback OSS tidak mengembalikan URL valid.");
      }
    } catch (e) {
      throw new Error(`Upload Failed: ${e.response?.status} - ${e.message}`);
    }
  }
  async createTask(signedUrl) {
    console.log(`\n🚀 [3/4] Create Task...`);
    const deviceInfo = {
      canvas: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      webgl: JSON.stringify({
        vendor: "Google Inc. (Qualcomm)",
        renderer: "ANGLE (Qualcomm, Adreno (TM) 610, OpenGL ES 3.2)",
        parameters: [3379, 34024, 34921, 36347, 35660, 36348, 36349, 34930, 35661]
      }),
      hardware: "cores:8|memory:8",
      platform: "platform:Linux armv81"
    };
    try {
      const {
        data
      } = await this.client.post(`${this.base}/watermark-remove/create`, {
        url: signedUrl,
        sync: 0,
        device_info: deviceInfo
      }, {
        headers: {
          ...this.headers,
          "X-Lang-Code": "en"
        }
      });
      const taskId = data?.task_id || data?.data?.task_id;
      if (!taskId) throw new Error(`Task ID missing. Resp: ${JSON.stringify(data)}`);
      console.log(`✅ Task ID: ${taskId}`);
      return taskId;
    } catch (e) {
      throw new Error(`Create Task Failed: ${e.response?.data?.message || e.message}`);
    }
  }
  async pollStatus(taskId) {
    console.log(`\n⏳ [4/4] Polling...`);
    const maxRetries = 60;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const {
          data
        } = await this.client.get(`${this.base}/watermark-remove/status/${taskId}?_=${Date.now()}`, {
          headers: this.headers
        });
        const stateMsg = data?.state_detail || data?.status_message || "Processing";
        const progress = data?.progress || 0;
        process.stdout.write(`\r📊 Poll ${i + 1}/${maxRetries} - ${progress}% [${stateMsg}]   `);
        if (data?.is_completed || data?.state === 1) {
          const resultUrl = data?.file_url || data?.data?.file;
          console.log(`\n\n✅ SELESAI!`);
          return {
            result: resultUrl
          };
        }
        if (data?.is_failed || data?.state === -7) {
          throw new Error(`\n❌ Gagal: ${data?.data?.err_message || stateMsg}`);
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        if (e.message.includes("Gagal")) throw e;
      }
    }
    throw new Error("\n❌ Timeout polling.");
  }
  async generate({
    imageUrl: input
  }) {
    const start = Date.now();
    const filename = `image_${Date.now()}.jpeg`;
    try {
      const buffer = await this.toBuffer(input);
      const auth = await this.getAuth(filename);
      const signedUrl = await this.uploadAndGetUrl(auth, buffer, filename);
      console.log(`🔗 OSS URL: ${signedUrl.substring(0, 40)}...`);
      const taskId = await this.createTask(signedUrl);
      const resultUrl = await this.pollStatus(taskId);
      console.log(`\n🎉 Total Waktu: ${((Date.now() - start) / 1e3).toFixed(2)}s`);
      console.log(`🔗 HASIL: ${resultUrl}`);
      return resultUrl;
    } catch (e) {
      console.error(`\n💥 ERROR: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new AirmoreClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}