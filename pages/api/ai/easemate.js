import fetch from "node-fetch";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class EaseMate {
  constructor() {
    this.API_URL_BASE = "https://api.easemate.ai/api2";
    this.AUTH_URL_BASE = "https://www.easemate.ai/lh-account-api";
    this.MAIL_API = `https://${apiConfig.DOMAIN_URL}/api/mails/v13`;
    this.DEVICE_UUID = crypto.randomBytes(16).toString("hex");
    this.LOCATION_HOST = "www.easemate.ai";
    this.BROWSER_PLATFORM = "Android,Chrome";
    this.LANG = "en";
    this.LANGUAGE = "en-US";
    this.MODEL_ID = 3;
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
  _md5(data) {
    return crypto.createHash("md5").update(data).digest("hex");
  }
  _getTimestamp() {
    return Math.round(new Date().getTime() / 1e3);
  }
  _jsonParse(e) {
    try {
      return JSON.parse(e);
    } catch (err) {
      console.error("❌ Gagal mem-parsing JSON:", err.message);
      return null;
    }
  }
  _sortParams(e) {
    return Object.keys(e).sort().reduce((r, o) => {
      const i = e[o];
      if (Array.isArray(i)) {
        r[o] = i.map(a => typeof a == "object" && a !== null ? this._sortParams(a) : a);
      } else if (typeof i == "object" && i !== null) {
        r[o] = this._sortParams(i);
      } else {
        r[o] = i;
      }
      return r;
    }, {});
  }
  _serializeQuery(e) {
    const r = [];

    function i(a, n) {
      if (n != null) {
        if (Array.isArray(n)) {
          n.forEach((s, l) => {
            i(`${a}[${l}]`, s);
          });
        } else if (typeof n == "object") {
          for (const [s, l] of Object.entries(n)) {
            i(`${a}[${s}]`, l);
          }
        } else {
          r.push(`${a}=${String(n)}`);
        }
      }
    }
    for (const [a, n] of Object.entries(e)) {
      i(a, n);
    }
    return r.join("&");
  }
  _getSigns(body) {
    try {
      const r = this._getTimestamp();
      const o = "TB";
      const i = this.DEVICE_UUID;
      let a;
      let n = body;
      if (n && typeof n === "string" && n.includes("{") && n.includes("}")) {
        n = this._jsonParse(n);
      }
      if (n && Object.keys(n).length) {
        const s = this._sortParams(n);
        s.appKey = o;
        s.timestamp = r;
        a = `${i}${this._serializeQuery(s)}${i}`;
      } else {
        a = `${i}&appKey=${o}&timestamp=${r}${i}`;
      }
      return {
        sign: this._md5(a),
        timestamp: `${r}`
      };
    } catch (error) {
      console.error("❌ Gagal membuat tanda tangan API:", error.message);
      throw error;
    }
  }
  async _apiCall(path, method, body, s3Upload = false, isStream = false, isAuth = false, token = null) {
    const baseUrl = isAuth ? this.AUTH_URL_BASE : s3Upload ? "" : this.API_URL_BASE;
    const url = s3Upload ? path : `${baseUrl}${path}`;
    try {
      let headers = {};
      if (!s3Upload && !path.startsWith(this.MAIL_API)) {
        const {
          sign,
          timestamp
        } = this._getSigns(body);
        headers = {
          ...headers,
          "client-name": "chatpdf",
          "client-type": "web",
          "device-identifier": this.DEVICE_UUID,
          "device-platform": this.BROWSER_PLATFORM,
          "device-type": "web",
          "device-uuid": this.DEVICE_UUID,
          lang: this.LANG,
          language: this.LANGUAGE,
          site: this.LOCATION_HOST,
          sign: sign,
          timestamp: timestamp,
          ...SpoofHead()
        };
        if (token) {
          headers.authorization = `Bearer ${token}`;
        }
      }
      headers = {
        ...headers,
        "Accept-Language": "id-ID,id;q=0.9",
        Connection: "keep-alive",
        Origin: "https://www.easemate.ai",
        Referer: "https://www.easemate.ai/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        accept: "application/json"
      };
      if (isStream) {
        headers.accept = "text/event-stream, text/event-stream";
        headers["Cache-Control"] = "no-cache";
      }
      let requestBody = body ? JSON.stringify(body) : undefined;
      if (s3Upload) {
        headers = {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9",
          Connection: "keep-alive",
          "Content-Type": "image/jpeg",
          Origin: "https://www.easemate.ai",
          Referer: "https://www.easemate.ai/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead()
        };
        requestBody = body;
      } else if (body) {
        headers["content-type"] = "application/json;charset=UTF-8";
      }
      console.log(`📡 Memanggil API: ${method} ${url}`);
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: requestBody
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Permintaan gagal: ${response.status} ${response.statusText} - ${errorText}`);
      }
      console.log(`✅ Panggilan API berhasil: ${method} ${url}`);
      if (s3Upload) {
        return {
          message: "Upload berhasil"
        };
      }
      if (isStream) {
        const fullResponseText = await response.text();
        let fullAnswer = "";
        const lines = fullResponseText.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonString = line.slice("data:".length).trim();
            try {
              const data = JSON.parse(jsonString);
              const answerPart = this._jsonParse(data.data).answer;
              fullAnswer += answerPart;
            } catch (e) {
              console.error("❌ Gagal mem-parsing JSON dari stream:", e.message);
            }
          }
        }
        return fullAnswer.trim();
      }
      const data = await response.json();
      if (!s3Upload && !path.startsWith(this.MAIL_API) && data.code !== 200) {
        throw new Error(`API Error: ${data.message} (Code: ${data.code})`);
      }
      return data.data;
    } catch (error) {
      console.error(`❌ Terjadi kesalahan dalam panggilan API ke ${url}:`, error.message);
      throw error;
    }
  }
  async _authenticate() {
    console.log("🔐 Memulai proses autentikasi...");
    const createMailUrl = `${this.MAIL_API}?action=create`;
    const mailResponse = await fetch(createMailUrl);
    const mailData = await mailResponse.json();
    const email = mailData.data.address;
    const authPayload1 = {
      email: email,
      type: "user_register",
      nonce: crypto.randomBytes(8).toString("hex"),
      timestamp: this._getTimestamp(),
      web_app_key: "account_web"
    };
    const {
      sign: sign1
    } = this._getSigns(authPayload1);
    authPayload1.sign = sign1;
    await this._apiCall("/auth/send-email-code", "POST", authPayload1, false, false, true);
    console.log(`✉️ Kode verifikasi dikirim ke: ${email}. Menunggu...`);
    await new Promise(resolve => setTimeout(resolve, 1e4));
    let emailCode = null;
    let attempts = 0;
    const maxAttempts = 60;
    while (!emailCode && attempts < maxAttempts) {
      const getMessageUrl = `${this.MAIL_API}?action=message&email=${email}`;
      const messageResponse = await fetch(getMessageUrl);
      const messageData = await messageResponse.json();
      if (messageData.data.rows.length === 0) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3e3));
        continue;
      }
      const htmlContent = messageData.data.rows[0].html;
      const match = /<span[^>]*>(\d{4})<\/span>/g.exec(htmlContent);
      emailCode = match ? match[1] : null;
      if (!emailCode) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    }
    if (!emailCode) {
      throw new Error("Gagal mendapatkan kode verifikasi setelah beberapa percobaan.");
    }
    const authPayload2 = {
      email: email,
      email_code: emailCode,
      type: "user_register",
      nonce: crypto.randomBytes(8).toString("hex"),
      timestamp: this._getTimestamp(),
      web_app_key: "account_web"
    };
    const {
      sign: sign2
    } = this._getSigns(authPayload2);
    authPayload2.sign = sign2;
    const checkCodeResponse = await this._apiCall("/auth/check-email-code", "POST", authPayload2, false, false, true);
    console.log("✅ Kode verifikasi berhasil diperiksa.");
    const registerPayload = {
      sign: checkCodeResponse.sign,
      nonce: checkCodeResponse.nonce,
      timestamp: this._getTimestamp(),
      web_app_key: "account_web"
    };
    const registerResponse = await this._apiCall("/auth/register", "POST", registerPayload, false, false, true);
    console.log("✅ Autentikasi berhasil.");
    return registerResponse.token;
  }
  async chat({
    imageUrl = null,
    prompt = "Describe this picture",
    ...rest
  }) {
    try {
      console.log("🚀 Memulai proses chat...");
      const createSessionPayload = {
        model_id: this.MODEL_ID,
        ...rest
      };
      const sessionResponse = await this._apiCall("/task/create_pure_session", "POST", createSessionPayload);
      const {
        session_id
      } = sessionResponse;
      console.log(`ℹ️ Sesi chat dibuat dengan ID: ${session_id}`);
      const objectInfo = [];
      if (imageUrl) {
        console.log("📷 Mengunggah gambar ke S3...");
        const timestamp = new Date().getTime();
        const uniqueId = crypto.randomBytes(16).toString("hex");
        const s3Name = `${uniqueId}_${timestamp}.jpg`;
        const s3Path = `pro/${this.DEVICE_UUID}/${s3Name}`;
        const uploadUrlPayload = {
          key: s3Path,
          value: s3Name
        };
        const uploadResponse = await this._apiCall("/task/query_upload_url", "POST", uploadUrlPayload);
        const {
          upload_url,
          download_url
        } = uploadResponse;
        const imageFetchResponse = await fetch(imageUrl);
        if (!imageFetchResponse.ok) {
          throw new Error(`Gagal mengambil gambar dari URL: ${imageUrl}`);
        }
        const imageArrayBuffer = await imageFetchResponse.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);
        await this._apiCall(upload_url, "PUT", imageBuffer, true);
        console.log(`✅ Gambar berhasil diunggah ke S3: ${download_url}`);
        objectInfo.push({
          img_info: {
            s3_name: s3Name,
            s3_url: download_url,
            size: imageBuffer.length,
            origin_name: "input_image.jpg"
          }
        });
      } else {
        console.log("ℹ️ Tidak ada URL gambar yang disediakan, melewati langkah unggah gambar.");
      }
      console.log("💬 Mengirim permintaan chat...");
      const execOperationPayload = {
        model_id: this.MODEL_ID,
        session_id: session_id,
        operation_info: {
          operation: prompt,
          id: 1e4
        },
        object_info: objectInfo,
        ...rest
      };
      const fullAnswer = await this._apiCall("/stream/exec_operation", "POST", execOperationPayload, false, true);
      console.log("✅ Permintaan chat selesai.");
      return fullAnswer;
    } catch (error) {
      console.error("❌ Terjadi kesalahan pada fungsi chat:", error.message);
      throw error;
    }
  }
  async image({
    imageUrl = null,
    prompt = "Create a ghibli-style image of this picture",
    ...rest
  }) {
    try {
      console.log("🎨 Memulai proses image...");
      const objectInfo = [];
      if (imageUrl) {
        const timestamp = new Date().getTime();
        const uniqueId = crypto.randomBytes(16).toString("hex");
        const imageKey = `pro/${this.DEVICE_UUID}/${uniqueId}_${timestamp}.jpg`;
        const uploadUrlPayload = {
          key: imageKey,
          value: crypto.randomBytes(16).toString("hex")
        };
        const uploadResponse = await this._apiCall("/task/query_upload_url", "POST", uploadUrlPayload);
        const {
          upload_url,
          download_url
        } = uploadResponse;
        const imageFetchResponse = await fetch(imageUrl);
        if (!imageFetchResponse.ok) {
          throw new Error(`Gagal mengambil gambar dari URL: ${imageUrl}`);
        }
        const imageArrayBuffer = await imageFetchResponse.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);
        await this._apiCall(upload_url, "PUT", imageBuffer, true);
        console.log("✅ Gambar sumber berhasil diunggah untuk image.");
        objectInfo.push({
          img_info: {
            s3_name: imageKey,
            s3_url: download_url,
            size: imageBuffer.length,
            origin_name: "input_image.jpg"
          }
        });
      } else {
        console.log("ℹ️ Tidak ada URL gambar yang disediakan, melewati langkah unggah gambar.");
      }
      const createTaskPayload = {
        model_id: 10002,
        operation_info: {
          id: 400,
          operation: "IMAGE_GENERATION"
        },
        object_info: objectInfo,
        parameters: JSON.stringify({
          ...rest,
          prompt: prompt
        })
      };
      const createResponse = await this._apiCall("/async/create_generate_image", "POST", createTaskPayload);
      const {
        taskId
      } = createResponse;
      console.log(`ℹ️ Tugas image dibuat dengan ID: ${taskId}`);
      return {
        task_id: taskId
      };
    } catch (error) {
      console.error("❌ Terjadi kesalahan pada fungsi image:", error.message);
      throw error;
    }
  }
  async image_status({
    task_id: taskId
  }) {
    try {
      console.log(`⏳ Memeriksa image_status tugas dengan ID: ${taskId}`);
      const queryPayload = {
        taskId: taskId,
        task_type: 10002
      };
      const queryResponse = await this._apiCall("/async/query_generate_image", "POST", queryPayload);
      console.log(`✅ image_status tugas berhasil diperiksa.`);
      return queryResponse;
    } catch (error) {
      console.error(`❌ Terjadi kesalahan saat memeriksa image_status tugas ${taskId}:`, error.message);
      throw error;
    }
  }
  async video({
    imageUrl = null,
    prompt = "Turn static image into dynamic video",
    duration = "5s",
    quality = "720p",
    aspectRatio = "9:16",
    ...rest
  }) {
    try {
      console.log("🎬 Memulai proses video...");
      const token = await this._authenticate();
      const objectInfo = [];
      if (imageUrl) {
        console.log("📷 Mengunggah gambar ke S3 untuk video...");
        const timestamp = new Date().getTime();
        const uniqueId = crypto.randomBytes(16).toString("hex");
        const imageKey = `pro/${this.DEVICE_UUID}/${uniqueId}_${timestamp}.jpg`;
        const uploadUrlPayload = {
          key: imageKey,
          value: crypto.randomBytes(16).toString("hex")
        };
        const uploadResponse = await this._apiCall("/task/query_upload_url", "POST", uploadUrlPayload, false, false, false, token);
        const {
          upload_url,
          download_url
        } = uploadResponse;
        const imageFetchResponse = await fetch(imageUrl);
        if (!imageFetchResponse.ok) {
          throw new Error(`Gagal mengambil gambar dari URL: ${imageUrl}`);
        }
        const imageArrayBuffer = await imageFetchResponse.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);
        await this._apiCall(upload_url, "PUT", imageBuffer, true, false, false, token);
        console.log("✅ Gambar sumber berhasil diunggah untuk video.");
        objectInfo.push({
          img_info: {
            s3_name: imageKey,
            s3_url: download_url,
            size: imageBuffer.length,
            origin_name: "input_image.jpg"
          }
        });
      } else {
        console.log("ℹ️ Tidak ada URL gambar yang disediakan, melewati langkah unggah gambar.");
      }
      const createTaskPayload = {
        model_id: 10001,
        operation_info: {
          id: 600,
          operation: "VIDEO_GENERATION"
        },
        object_info: objectInfo,
        parameters: JSON.stringify({
          prompt: prompt,
          duration: duration,
          quality: quality,
          aspectRatio: aspectRatio,
          ...rest
        })
      };
      const createResponse = await this._apiCall("/async/create_generate_video", "POST", createTaskPayload, false, false, false, token);
      const {
        taskId
      } = createResponse;
      console.log(`ℹ️ Tugas video dibuat dengan ID: ${taskId}`);
      const task_id = await this.enc({
        taskId: taskId,
        token: token
      });
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("❌ Terjadi kesalahan pada fungsi video:", error.message);
      throw error;
    }
  }
  async video_status({
    task_id: _taskId
  }) {
    try {
      if (!_taskId) {
        throw new Error("task_id is required to check status.");
      }
      console.log(`⏳ Memeriksa status tugas video dengan ID: ${_taskId}`);
      const decryptedData = await this.dec(_taskId);
      const {
        taskId,
        token
      } = decryptedData;
      if (!taskId) {
        throw new Error("Invalid task_id: Missing videoId after decryption.");
      }
      const queryPayload = {
        taskId: taskId,
        task_type: 10001
      };
      const queryResponse = await this._apiCall("/async/query_generate_video", "POST", queryPayload, false, false, false, token);
      console.log(`✅ Status tugas video berhasil diperiksa.`);
      return queryResponse;
    } catch (error) {
      console.error(`❌ Terjadi kesalahan saat memeriksa status tugas video ${taskId}:`, error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const ai = new EaseMate();
  if (!action) {
    console.error("⛔️ Paramenter 'action' tidak ditemukan.");
    return res.status(400).json({
      error: "Paramenter 'action' diperlukan."
    });
  }
  try {
    let response;
    switch (action) {
      case "chat": {
        console.log("➡️ Menerima permintaan 'chat'.");
        if (!params.prompt) {
          console.error("⛔️ Paramenter 'prompt' harus ada untuk aksi 'chat'.");
          return res.status(400).json({
            error: "Paramenter 'prompt' harus ada untuk aksi 'chat'."
          });
        }
        response = await ai.chat(params);
        console.log("✅ Mengirimkan respons 'chat' berhasil.");
        return res.status(200).json({
          answer: response
        });
      }
      case "image": {
        console.log("➡️ Menerima permintaan 'image'.");
        if (!params.prompt) {
          console.error("⛔️ Paramenter 'prompt' harus ada untuk aksi 'image'.");
          return res.status(400).json({
            error: "Paramenter 'prompt' harus ada untuk aksi 'image'."
          });
        }
        response = await ai.image(params);
        console.log("✅ Mengirimkan respons 'image' berhasil.");
        return res.status(200).json(response);
      }
      case "image_status": {
        console.log("➡️ Menerima permintaan 'image_status'.");
        if (!params.task_id) {
          console.error("⛔️ Paramenter 'task_id' hilang.");
          return res.status(400).json({
            error: "Paramenter 'task_id' diperlukan untuk aksi 'image_status'."
          });
        }
        response = await ai.image_status(params);
        console.log("✅ Mengirimkan respons 'image_status' berhasil.");
        return res.status(200).json(response);
      }
      case "video": {
        console.log("➡️ Menerima permintaan 'video'.");
        if (!params.prompt) {
          console.error("⛔️ Paramenter 'prompt' harus ada untuk aksi 'video'.");
          return res.status(400).json({
            error: "Paramenter 'prompt' harus ada untuk aksi 'video'."
          });
        }
        response = await ai.video(params);
        console.log("✅ Mengirimkan respons 'video' berhasil.");
        return res.status(200).json(response);
      }
      case "video_status": {
        console.log("➡️ Menerima permintaan 'video_status'.");
        if (!params.task_id) {
          console.error("⛔️ Paramenter 'task_id' hilang.");
          return res.status(400).json({
            error: "Paramenter 'task_id' diperlukan untuk aksi 'video_status'."
          });
        }
        response = await ai.video_status(params);
        console.log("✅ Mengirimkan respons 'video_status' berhasil.");
        return res.status(200).json(response);
      }
      default:
        console.error("⛔️ Aksi tidak valid:", action);
        return res.status(400).json({
          error: `Aksi tidak valid. Aksi yang didukung: 'chat', 'image', 'image_status', 'video', 'video_status'.`
        });
    }
  } catch (error) {
    console.error("❌ Kesalahan pada handler API:", error);
    res.status(500).json({
      error: error.message || "Kesalahan Server Internal."
    });
  }
}