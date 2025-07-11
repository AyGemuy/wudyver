import axios from "axios";
import mqtt from "mqtt";
import crypto from "crypto";
import {
  FormData,
  Blob
} from "formdata-node";
class FeloAPI {
  constructor() {
    this.dId = crypto.createHash("sha256").update(crypto.randomBytes(32).toString("hex")).digest("hex");
    this.tkn = null;
    this.uId = null;
    this.mqC = null;
    this.connD = null;
    this.cks = "";
    this.lastMqRid = null;
    this.setupAxios();
    this.log("🚀 FeloAPI initialized");
  }
  log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
  }
  genUUIDv4() {
    return crypto.randomUUID();
  }
  setupAxios() {
    const baseCfg = {
      timeout: 3e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://felo.ai",
        Referer: "https://felo.ai/"
      },
      maxRedirects: 5
    };
    this.authC = axios.create({
      ...baseCfg,
      baseURL: "https://account.felo.ai"
    });
    this.apiC = axios.create({
      ...baseCfg,
      baseURL: "https://api.felo.ai"
    });
    this.apiExtC = axios.create({
      ...baseCfg,
      baseURL: "https://api-ext.felo.ai"
    });
    this.uploadC = axios.create({
      ...baseCfg,
      baseURL: "https://api-ext-index-file.felo.ai"
    });
    this.logC = axios.create({
      ...baseCfg,
      baseURL: "https://log.felo.ai"
    });
    this.extAxiosInstance = axios.create({
      ...baseCfg,
      baseURL: "https://api-ext.felo.ai",
      withCredentials: true
    });
    const reqInt = config => {
      if (this.cks) {
        config.headers["Cookie"] = this.cks;
      }
      if (this.tkn && !config.url.includes("/api/user/sign")) {
        config.headers["Authorization"] = this.tkn;
      }
      return config;
    };
    const resInt = response => {
      const setCookieHdr = response.headers["set-cookie"];
      if (setCookieHdr) {
        const newCks = setCookieHdr.map(cookie => cookie.split(";")[0]).join("; ");
        const existingCksArr = this.cks.split("; ").filter(Boolean);
        const newCksArr = newCks.split("; ").filter(Boolean);
        const combinedCks = new Set([...existingCksArr, ...newCksArr]);
        this.cks = Array.from(combinedCks).join("; ");
      }
      return response;
    };
    [this.authC, this.apiC, this.apiExtC, this.uploadC, this.logC, this.extAxiosInstance].forEach(client => {
      client.interceptors.request.use(reqInt);
      client.interceptors.response.use(resInt);
    });
    this.log("📡 HTTP clients configured with manual cookie management via interceptors");
  }
  async encPass(input) {
    const saltedInput = `${input}randomSalt123`;
    const hash = crypto.createHash("sha256");
    hash.update(saltedInput);
    return hash.digest("hex");
  }
  genCreds() {
    const uuid = crypto.randomUUID().toLowerCase();
    return {
      email: `felo_${uuid.substring(0, 8)}@temp-mail.org`,
      password: crypto.createHash("sha256").update(uuid).digest("hex").substring(0, 16)
    };
  }
  async chkUsrEx(email) {
    try {
      this.log(`🔍 Checking user: ${email}`);
      const response = await this.authC.get(`/api/user/email?email=${encodeURIComponent(email)}`);
      return response.status === 200;
    } catch (error) {
      return error.response?.data?.code !== "USER_NOT_FOUND";
    }
  }
  async reg(email, password) {
    try {
      this.log(`📝 Registering user: ${email}`);
      const pld = {
        email: email,
        password: password,
        app_id: "glaritySearch",
        device_id: this.dId,
        client_type: "WEB",
        invitation_code: ""
      };
      const {
        data
      } = await this.authC.post("/api/user/sign.up", pld);
      const success = data.status === 200 && data.code === "OK";
      this.log(success ? "✅ Registration successful" : "❌ Registration failed");
      return success;
    } catch (error) {
      if (error.response?.data?.code === "USER_ALREADY_EXISTS") {
        this.log("⚠️ User already exists during registration attempt");
        return true;
      }
      throw error;
    }
  }
  async lgn(email, password) {
    try {
      this.log(`🔑 Logging in: ${email}`);
      const pld = {
        email: email,
        password: password,
        app_id: "glaritySearch",
        device_id: this.dId,
        client_type: "WEB"
      };
      const {
        data
      } = await this.authC.post("/api/user/sign.in", pld);
      if (data.status === 200 && data.code === "OK" && data.data?.token?.token_value) {
        this.tkn = data.data.token.token_value;
        this.uId = data.data.user.uid;
        this.log(`✅ Login successful - UID: ${this.uId}`);
        return true;
      }
      throw new Error(data.message || "Login failed");
    } catch (error) {
      this.log(`❌ Login failed: ${error.message}`);
      throw error;
    }
  }
  async auth() {
    try {
      this.log("🔐 Starting authentication");
      const {
        email,
        password
      } = this.genCreds();
      const hshdPass = await this.encPass(password);
      const usrExists = await this.chkUsrEx(email);
      if (!usrExists) {
        this.log("User not found, attempting to register...");
        const regSuccess = await this.reg(email, hshdPass);
        if (!regSuccess) {
          throw new Error("Registration failed.");
        }
      } else {
        this.log("User already exists, proceeding to login...");
      }
      await this.lgn(email, hshdPass);
      this.log("✅ Authentication completed");
      await this.getUsrData();
    } catch (error) {
      this.log(`❌ Authentication failed: ${error.message}`);
      throw error;
    }
  }
  async getUsrData() {
    if (!this.tkn) {
      this.log("Token tidak ditemukan, tidak bisa mengambil data pengguna.");
      return;
    }
    try {
      this.log("ℹ️ Mengambil info pengguna...");
      const usrInfo = await this.apiExtC.get("/user/info");
      this.log("✅ Info pengguna diterima:");
      console.log(usrInfo.data);
      this.log("💰 Mengambil info paket pengguna...");
      const usrPlan = await this.apiExtC.get("/user/plan");
      this.log("✅ Info paket diterima:");
      console.log(usrPlan.data);
      this.log("💳 Mengambil info langganan pengguna...");
      const usrSub = await this.apiExtC.get("/userOrg/subscription");
      this.log("✅ Info langganan diterima:");
      console.log(usrSub.data);
      this.log("📊 Mengirim laporan data register...");
      const rptPld = {
        report_application: "glaritySearch",
        browser_language: "id-ID",
        browser_version: "135.0.0.0",
        device_id: this.dId,
        browser_type: "Chrome",
        os_type: "Linux",
        event_time: Date.now(),
        timezone: "Asia/Makassar",
        ext: JSON.stringify({
          event_type: "felo_search_register",
          log_type: "api",
          data: {
            uid: this.uId,
            inviteCode: ""
          }
        })
      };
      const logRes = await this.logC.post("/api/data/report", JSON.stringify(rptPld), {
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        }
      });
      this.log("✅ Laporan data dikirim:");
      console.log(logRes.data);
    } catch (error) {
      this.log(`❌ Gagal mengambil data pengguna/paket/langganan atau mengirim laporan: ${error.message}`);
      if (error.response) {
        this.log("Detail Respon Error:", error.response.data);
      }
    }
  }
  async getMQConn() {
    try {
      if (!this.tkn) {
        this.log("🔄 No token found, authenticating automatically...");
        await this.auth();
      }
      this.log("📡 Fetching MQTT connection details");
      const response = await this.apiC.get(`/search/user/connection?client_id=${this.dId}`);
      this.connD = response.data;
      this.log("✅ MQTT connection details fetched");
      return this.connD;
    } catch (error) {
      this.log(`❌ Failed to get MQTT connection: ${error.message}`);
      throw error;
    }
  }
  async connectMQ() {
    try {
      if (!this.connD) await this.getMQConn();
      this.log("🔌 Connecting to MQTT...");
      return new Promise((resolve, reject) => {
        const {
          ws_url,
          username,
          password,
          client_id,
          sub_topic
        } = this.connD;
        this.mqC = mqtt.connect(ws_url, {
          keepalive: 60,
          connectTimeout: 3e4,
          clientId: client_id,
          username: username,
          password: password,
          protocolVersion: 5
        });
        this.mqC.on("connect", () => {
          this.log("✅ MQTT connected");
          this.mqC.subscribe(sub_topic, err => {
            if (err) {
              this.log(`❌ MQTT subscription failed: ${err.message}`);
              this.mqC.end();
              reject(err);
            } else {
              this.log("📺 Subscribed to MQTT topic");
              resolve();
            }
          });
        });
        this.mqC.on("error", error => {
          this.log(`❌ MQTT error: ${error.message}`);
          this.mqC.end();
          reject(error);
        });
        this.mqC.on("close", () => {
          this.log("MQTT connection closed.");
        });
        this.mqC.on("offline", () => {
          this.log("MQTT client is offline.");
        });
        this.mqC.on("reconnect", () => {
          this.log("MQTT client is attempting to reconnect.");
        });
      });
    } catch (error) {
      this.log(`❌ MQTT connection failed: ${error.message}`);
      throw error;
    }
  }
  async uploadImg(imgUrl) {
    try {
      if (!this.tkn) {
        this.log("🔄 No token found for image upload, authenticating automatically...");
        await this.auth();
      }
      this.log(`📤 Uploading image: ${imgUrl}`);
      const response = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 3e4
      });
      const buf = Buffer.from(response.data);
      const mime = response.headers["content-type"] || "image/jpeg";
      this.log(`📁 Image downloaded - Size: ${Math.round(buf.length / 1024)}KB`);
      const form = new FormData();
      const fName = imgUrl.split("/").pop() || "image.jpg";
      form.append("file", new Blob([buf], {
        type: mime
      }), fName);
      const {
        data
      } = await this.uploadC.post("/file/upload", form, {
        params: {
          thread_id: "",
          topic_id: ""
        }
      });
      let fId;
      if (typeof data === "string") {
        const parts = data.split("data:");
        fId = JSON.parse(parts[parts.length - 1].trim()).file_id;
      } else {
        fId = data.file_id;
      }
      this.log(`✅ Image uploaded - File ID: ${fId}`);
      return String(fId).toLowerCase();
    } catch (error) {
      this.log(`❌ Image upload failed: ${error.message}`);
      throw error;
    }
  }
  async chat({
    query,
    imageUrl = null,
    images = false,
    videos = false,
    timeout = 45e3,
    ...rest
  }) {
    try {
      if (!this.tkn) {
        this.log("🔄 No token found for chat, authenticating automatically...");
        await this.auth();
      }
      this.log(`💬 Starting chat: "${query}"`);
      if (imageUrl) this.log(`🖼️ With image: ${imageUrl}`);
      if (images) this.log(`🔍 Including image search`);
      if (videos) this.log(`🎬 Including video search`);
      await this.connectMQ();
      let docs = [];
      if (imageUrl) {
        const fId = await this.uploadImg(imageUrl);
        docs = [fId];
      }
      const pld = {
        event_name: "ask_question",
        data: {
          process_id: crypto.randomUUID(),
          query: query || "",
          search_uuid: crypto.randomUUID(),
          lang: "",
          agent_lang: "id-ID",
          search_options: {
            langcode: "id-ID",
            search_image: images,
            search_video: videos
          },
          search_video: videos,
          query_from: "default",
          category: imageUrl ? "chat_with_image" : "general",
          model: "",
          auto_routing: true,
          device_id: this.dId,
          documents: docs,
          document_action: "",
          ...rest
        }
      };
      this.log("📤 Sending message to MQTT");
      return new Promise((resolve, reject) => {
        const frags = [];
        let mqMsgs = {};
        let autoSrchRes = {
          images: null,
          videos: null
        };
        let isComplete = false;
        let finalAnswer = "";
        let suggestions = null;
        const timeoutId = setTimeout(() => {
          this.log(`⏰ Chat timeout after ${timeout}ms`);
          this.cleanup();
          resolve({
            answer: finalAnswer,
            lastAnswer: finalAnswer,
            fragments: frags,
            ...mqMsgs,
            ...autoSrchRes,
            suggestions: suggestions,
            isComplete: false
          });
        }, timeout);
        this.mqC.on("message", async (topic, message) => {
          try {
            const msg = JSON.parse(message.toString());
            const msgType = msg.data?.type || "unknown";
            if (msg.data && typeof msg.data === "object") {
              if (!mqMsgs[msgType]) {
                mqMsgs[msgType] = [];
              }
              mqMsgs[msgType].push(msg.data.data);
            }
            this.log(`📥 Received message (type: ${msgType}, status: ${msg.status || "N/A"})`);
            if (msgType === "answer" && msg.data?.data?.text !== undefined) {
              frags.push(msg.data.data.text);
              finalAnswer = msg.data.data.text;
              this.log(`📝 Received text fragment: ${frags.length} - "${msg.data.data.text}"`);
            }
            if (msgType === "thread_header_info" && msg.data?.data?.rid) {
              const threadRid = msg.data.data.rid;
              this.lastMqRid = threadRid;
              this.log(`🔗 Found and updated lastMqRid from thread_header_info: ${threadRid}`);
              if (images && !autoSrchRes.images) {
                this.log(`🔍 Otomatis mengambil gambar dengan RID: ${threadRid}`);
                try {
                  autoSrchRes.images = await this.imgs({
                    query: query,
                    search_uuid: threadRid
                  });
                  this.log(`✅ Gambar berhasil diambil secara otomatis.`);
                } catch (err) {
                  this.log(`❌ Gagal mengambil gambar secara otomatis: ${err.message}`);
                }
              }
              if (videos && !autoSrchRes.videos) {
                this.log(`🎬 Otomatis mengambil video dengan RID: ${threadRid}`);
                try {
                  autoSrchRes.videos = await this.vids({
                    search_uuid: threadRid
                  });
                  this.log(`✅ Video berhasil diambil secara otomatis.`);
                } catch (err) {
                  this.log(`❌ Gagal mengambil video secara otomatis: ${err.message}`);
                }
              }
            }
            if (msg.status === "complete") {
              clearTimeout(timeoutId);
              isComplete = true;
              this.log(`✅ Chat completed - ${frags.length} fragments`);
              try {
                this.log(`💡 Otomatis mendapatkan saran untuk query: "${query}"`);
                suggestions = await this.suggest({
                  keywords: query
                });
                this.log(`✅ Saran otomatis diterima.`);
              } catch (err) {
                this.log(`❌ Gagal mendapatkan saran otomatis: ${err.message}`);
              }
              this.cleanup();
              resolve({
                answer: finalAnswer,
                lastAnswer: finalAnswer,
                fragments: frags,
                ...mqMsgs,
                ...autoSrchRes,
                suggestions: suggestions,
                isComplete: isComplete
              });
            }
          } catch (error) {
            this.log(`❌ Message parse error or processing error: ${error.message}`);
          }
        });
        this.mqC.publish(this.connD.pub_topic, JSON.stringify(pld), {
          qos: 0
        }, err => {
          if (err) {
            clearTimeout(timeoutId);
            this.log(`❌ MQTT publish failed: ${err.message}`);
            this.cleanup();
            reject(err);
          } else {
            this.log("📡 Message sent, waiting for response...");
          }
        });
      });
    } catch (error) {
      this.log(`❌ Chat failed: ${error.message}`);
      throw error;
    }
  }
  async vids({
    search_uuid,
    ...r
  }) {
    try {
      const currSrchUuid = search_uuid || this.lastMqRid || this.genUUIDv4();
      this.log(`🎬 Requesting videos with search_uuid: ${currSrchUuid}`);
      const {
        data
      } = await this.apiC.post("/search/query/videos", {
        search_uuid: currSrchUuid,
        ...r
      });
      return data;
    } catch (e) {
      console.error("Vid req err:", e.response?.data || e.message);
      throw e;
    }
  }
  async imgs({
    search_uuid,
    query,
    ...r
  }) {
    try {
      const currSrchUuid = search_uuid || this.lastMqRid || this.genUUIDv4();
      this.log(`🖼️ Requesting images for query "${query}" with search_uuid: ${currSrchUuid}`);
      const {
        data
      } = await this.apiC.post("/search/query/images", {
        search_uuid: currSrchUuid,
        query: query,
        ...r
      });
      return data;
    } catch (e) {
      console.error("Img req err:", e.response?.data || e.message);
      throw e;
    }
  }
  async models() {
    try {
      this.log("⚙️ Fetching user models...");
      const {
        data
      } = await this.apiC.get("/search/search/user/models", {
        headers: {
          authorization: this.tkn || ""
        }
      });
      this.log("✅ User models fetched successfully.");
      return data;
    } catch (e) {
      console.error("Models req err:", e.response?.data || e.message);
      throw e;
    }
  }
  async suggest({
    keywords
  }) {
    try {
      this.log(`💡 Requesting suggestions for keywords: "${keywords}"`);
      const {
        data
      } = await this.extAxiosInstance.get(`/search/getQuestion?keywords=${encodeURIComponent(keywords)}`);
      this.log(`✅ Suggestions received.`);
      return data;
    } catch (e) {
      console.error("Suggest req err:", e.response?.data || e.message);
      throw e;
    }
  }
  cleanup() {
    if (this.mqC) {
      this.log("🧹 Cleaning up MQTT connection");
      this.mqC.end();
      this.mqC = null;
    }
  }
  isAuth() {
    return !!this.tkn;
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
        action: "chat | models"
      }
    });
  }
  const felo = new FeloAPI();
  try {
    let result;
    switch (action) {
      case "chat":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await felo[action](params);
        break;
      case "models":
        result = await felo[action]();
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: chat | models`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API Error for action ${action}:`, error);
    return res.status(500).json({
      success: false,
      error: `Processing error for action '${action}': ${error.message}`
    });
  }
}