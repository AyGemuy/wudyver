import axios from "axios";
import * as cheerio from "cheerio";
import {
  createHmac,
  randomBytes
} from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class SongGPT {
  constructor() {
    this.jar = new CookieJar();
    this.axios = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4
    }));
    this.cfg = {
      base: "https://be.songgpt.com/api/v1",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://songgpt.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://songgpt.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      poll: {
        max: 60,
        delay: 3e3
      }
    };
  }
  sec() {
    try {
      const t = Date.now();
      const h = createHmac("sha256", "SONGGPT").update(`${t}-SONGGPT`).digest("hex");
      return JSON.stringify({
        hash: h,
        timestamp: t
      });
    } catch (e) {
      console.error("❌ Security error:", e.message);
      return null;
    }
  }
  gen() {
    try {
      const name = randomBytes(3).toString("hex");
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const upper = chars.toUpperCase();
      const numbers = "0123456789";
      const symbols = "@#$%&*!";
      let pass = "";
      pass += chars[Math.floor(Math.random() * chars.length)];
      pass += upper[Math.floor(Math.random() * upper.length)];
      pass += numbers[Math.floor(Math.random() * numbers.length)];
      pass += symbols[Math.floor(Math.random() * symbols.length)];
      const all = chars + upper + numbers;
      for (let i = 0; i < 4; i++) {
        pass += all[Math.floor(Math.random() * all.length)];
      }
      pass = pass.split("").sort(() => Math.random() - .5).join("");
      console.log(`🔑 Generated - Name: ${name}, Pass: ${pass}`);
      return {
        name: name,
        pass: pass
      };
    } catch (e) {
      console.error("❌ Gen error:", e.message);
      return {
        name: "User" + Math.floor(Math.random() * 1e3),
        pass: "Aa123456@"
      };
    }
  }
  async mail() {
    console.log("📧 Creating temp mail...");
    try {
      const {
        data
      } = await this.axios.get(`${this.cfg.mail}?action=create`);
      const email = data?.email || null;
      console.log(email ? `✅ Mail created: ${email}` : "❌ Failed to create mail");
      return email;
    } catch (e) {
      console.error("❌ Mail error:", e.message);
      return null;
    }
  }
  async confirmEmail(email) {
    console.log(`📨 Confirming email: ${email}`);
    try {
      const sec = this.sec();
      if (!sec) return false;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/user/confirm_email_web`, {
        email: email
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          "x-security-code": sec
        }
      });
      console.log("📨 Confirm response:", data);
      return true;
    } catch (e) {
      console.error("❌ Confirm email error:", e?.response?.data || e.message);
      return true;
    }
  }
  async send(email) {
    console.log(`📤 Sending verification to: ${email}`);
    try {
      await this.confirmEmail(email);
      const sec = this.sec();
      if (!sec) return null;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/send_verification_otp`, {
        email: email
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          "x-security-code": sec
        }
      });
      console.log("📤 Send response:", data);
      return data?.message || null;
    } catch (e) {
      console.error("❌ Send error:", e?.response?.data || e.message);
      return null;
    }
  }
  async otp(email, attempt = 1) {
    console.log(`🔍 [${attempt}/${this.cfg.poll.max}] Fetching OTP for: ${email}`);
    try {
      const {
        data
      } = await this.axios.get(`${this.cfg.mail}?action=message&email=${encodeURIComponent(email)}`);
      if (!data?.data || data.data.length === 0) {
        console.log("⏳ No message yet");
        return null;
      }
      const html = data.data[0]?.html_content;
      if (!html) {
        console.log("⏳ No HTML content");
        return null;
      }
      const $ = cheerio.load(html);
      const code = $("h2").text().trim().toLowerCase();
      if (code && code.length === 6) {
        console.log(`✅ OTP found: ${code}`);
        return code;
      }
      const possibleCodes = [];
      $("div").each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.length === 6 && /^[a-f0-9]{6}$/.test(text)) {
          possibleCodes.push(text);
        }
      });
      if (possibleCodes.length > 0) {
        console.log(`✅ OTP found in div: ${possibleCodes[0]}`);
        return possibleCodes[0];
      }
      console.log("❌ OTP not found in HTML");
      return null;
    } catch (e) {
      console.error("❌ OTP error:", e.message);
      return null;
    }
  }
  async poll(email) {
    console.log(`🔄 Polling OTP (max ${this.cfg.poll.max} attempts, ${this.cfg.poll.delay}ms delay)...`);
    for (let i = 1; i <= this.cfg.poll.max; i++) {
      const code = await this.otp(email, i);
      if (code) return code;
      if (i < this.cfg.poll.max) {
        console.log(`⏳ Waiting ${this.cfg.poll.delay}ms before retry...`);
        await new Promise(r => setTimeout(r, this.cfg.poll.delay));
      }
    }
    console.error("❌ OTP polling timeout");
    return null;
  }
  async verify(email, otp) {
    console.log(`✅ Verifying OTP: ${otp}`);
    try {
      const sec = this.sec();
      if (!sec) return false;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/verify_email_otp`, {
        email: email,
        otp: otp
      }, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          "x-security-code": sec
        }
      });
      console.log("✅ Verify response:", data);
      return data?.success || false;
    } catch (e) {
      console.error("❌ Verify error:", e?.response?.data || e.message);
      return false;
    }
  }
  async reg(email, pwd, name, artist = "AI Composer") {
    console.log(`📝 Registering: ${email}`);
    try {
      const sec = this.sec();
      if (!sec) return null;
      const boundary = "----WebKitFormBoundary" + randomBytes(16).toString("hex");
      const form = `--${boundary}\r\n` + `Content-Disposition: form-data; name="email"\r\n\r\n` + `${email}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="password"\r\n\r\n` + `${pwd}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="name"\r\n\r\n` + `${name}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="artist"\r\n\r\n` + `${artist}\r\n` + `--${boundary}--\r\n`;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/register`, form, {
        headers: {
          ...this.cfg.headers,
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "x-security-code": sec,
          "content-length": Buffer.byteLength(form)
        }
      });
      console.log("✅ Registration response:", data);
      return data?.id ? data : null;
    } catch (e) {
      console.error("❌ Reg error details:", {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message,
        headers: e.response?.headers
      });
      return null;
    }
  }
  async login(email, pwd) {
    console.log(`🔐 Logging in: ${email}`);
    try {
      const sec = this.sec();
      if (!sec) return null;
      const boundary = "----WebKitFormBoundary" + randomBytes(16).toString("hex");
      const form = `--${boundary}\r\n` + `Content-Disposition: form-data; name="username"\r\n\r\n` + `${email}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="password"\r\n\r\n` + `${pwd}\r\n` + `--${boundary}--\r\n`;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/auth/login`, form, {
        headers: {
          ...this.cfg.headers,
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "x-security-code": sec,
          "content-length": Buffer.byteLength(form)
        }
      });
      console.log("✅ Login response:", data);
      return data?.access_token || null;
    } catch (e) {
      console.error("❌ Login error:", e?.response?.data || e.message);
      return null;
    }
  }
  async ensure(token) {
    if (token) {
      console.log("✅ Token provided");
      return token;
    }
    console.log("🔄 Auto ensuring token...");
    let lastEmail = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/5`);
      const {
        name,
        pass
      } = this.gen();
      const email = await this.mail();
      if (!email) continue;
      lastEmail = email;
      const sent = await this.send(email);
      if (!sent) {
        console.log("❌ Failed to send verification");
        continue;
      }
      const code = await this.poll(email);
      if (!code) {
        console.log("❌ Failed to get OTP");
        continue;
      }
      const verified = await this.verify(email, code);
      if (!verified) {
        console.log("❌ Failed to verify OTP");
        continue;
      }
      const user = await this.reg(email, pass, name);
      if (user) {
        console.log(`✅ Registered successfully: ${user.id}`);
        const token = await this.login(email, pass);
        if (token) {
          console.log("✅ Token obtained successfully");
          return token;
        }
      }
      console.log(`⏳ Retrying... (${attempt}/5)`);
      await new Promise(r => setTimeout(r, 2e3));
    }
    console.error("❌ Failed to ensure token after 5 attempts");
    if (lastEmail) {
      console.log("🔄 Trying to login with last email...");
    }
    return null;
  }
  async generate({
    token,
    prompt,
    ...rest
  }) {
    console.log(`🎵 Generating song: "${prompt}"`);
    try {
      const t = await this.ensure(token);
      if (!t) {
        console.error("❌ No token available");
        return {
          result: null,
          token: null
        };
      }
      const boundary = "----WebKitFormBoundary" + randomBytes(16).toString("hex");
      const form = `--${boundary}\r\n` + `Content-Disposition: form-data; name="message"\r\n\r\n` + `${prompt}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="model"\r\n\r\n` + `${rest.model || "suno"}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="free_tier"\r\n\r\n` + `${rest.free_tier || "false"}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="is_instrumental"\r\n\r\n` + `${rest.instrumental || "true"}\r\n` + `--${boundary}\r\n` + `Content-Disposition: form-data; name="web_search"\r\n\r\n` + `${rest.search || "true"}\r\n` + `--${boundary}--\r\n`;
      const reqId = `req_${Date.now()}_${randomBytes(4).toString("hex")}`;
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/liveAgent`, form, {
        headers: {
          ...this.cfg.headers,
          "content-type": `multipart/form-data; boundary=${boundary}`,
          accept: "*/*",
          authorization: `Bearer ${t}`,
          "x-request-id": reqId,
          "content-length": Buffer.byteLength(form)
        },
        responseType: "text"
      });
      const lines = data.split("\n").filter(l => l.startsWith("data:"));
      const last = lines[lines.length - 1]?.replace("data:", "").trim();
      const json = last ? JSON.parse(last) : {};
      const task_id = json?.song_generation_task?.task_id;
      const session_id = json?.session_id;
      console.log(task_id ? `✅ Task created: ${task_id}` : "❌ Task creation failed");
      return {
        result: {
          task_id: task_id,
          session_id: session_id
        },
        token: t,
        info: json
      };
    } catch (e) {
      console.error("❌ Generate error:", e?.response?.data || e.message);
      return {
        result: null,
        token: token || null
      };
    }
  }
  async status({
    token,
    task_id,
    session_id
  }) {
    console.log(`📊 Checking status: ${task_id}`);
    try {
      const t = await this.ensure(token);
      if (!t) {
        console.error("❌ No token available");
        return {
          result: null,
          token: null
        };
      }
      const sec = this.sec();
      if (!sec) return {
        result: null,
        token: t
      };
      const {
        data
      } = await this.axios.get(`${this.cfg.base}/callAgent/song-status/${session_id}?task_id=${task_id}`, {
        headers: {
          ...this.cfg.headers,
          authorization: `Bearer ${t}`,
          "x-security-code": sec
        }
      });
      console.log("✅ Status response received");
      return {
        result: data?.response?.songs || [],
        token: t,
        info: data
      };
    } catch (e) {
      console.error("❌ Status error:", e?.response?.data || e.message);
      return {
        result: null,
        token: token || null
      };
    }
  }
  async uploadCloneRef(token, buffer, {
    title = "001",
    genre = "pop",
    mood = "happy"
  }) {
    console.log(`📤 Uploading reference audio: ${title} (${buffer.length} bytes)`);
    try {
      const boundary = "----WebKitFormBoundary" + randomBytes(16).toString("hex");
      const crlf = "\r\n";
      const textPart = (name, value) => `--${boundary}${crlf}Content-Disposition: form-data; name="${name}"${crlf}${crlf}${value}${crlf}`;
      const fileHeader = `--${boundary}${crlf}Content-Disposition: form-data; name="song_file"; filename="${title}.mp3"${crlf}Content-Type: audio/mpeg${crlf}${crlf}`;
      const fileFooter = `${crlf}--${boundary}--${crlf}`;
      const multipartBody = Buffer.concat([Buffer.from(textPart("title", title)), Buffer.from(textPart("genre", genre)), Buffer.from(textPart("mood", mood)), Buffer.from(fileHeader), buffer, Buffer.from(fileFooter)]);
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/audio-cloning`, multipartBody, {
        headers: {
          ...this.cfg.headers,
          "content-type": `multipart/form-data; boundary=${boundary}`,
          authorization: `Bearer ${token}`,
          "content-length": multipartBody.length
        }
      });
      console.log(`✅ Reference uploaded. ID: ${data?.id}`);
      return data;
    } catch (e) {
      console.error("❌ Upload Ref error:", e?.response?.data || e.message);
      return null;
    }
  }
  async createCover(token, refId, {
    title,
    lyrics,
    genre
  }) {
    console.log(`🎵 Creating clone/cover for ID: ${refId}`);
    try {
      const payload = {
        title: title || "Cloned Song",
        lyrics: lyrics || "La la la...",
        genre: genre || "pop",
        ref_id: refId
      };
      const {
        data
      } = await this.axios.post(`${this.cfg.base}/audio-cloning/create-cover-song`, payload, {
        headers: {
          ...this.cfg.headers,
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        }
      });
      console.log(`✅ Clone initiated. Response length: ${data?.length || 0}`);
      return data;
    } catch (e) {
      console.error("❌ Create Cover error:", e?.response?.data || e.message);
      return null;
    }
  }
  async clone({
    token,
    audio_url,
    audio,
    title,
    lyrics,
    genre,
    mood
  }) {
    const rawAudio = audio_url || audio;
    console.log(`🚀 Starting clone process...`);
    const t = await this.ensure(token);
    if (!t) return {
      error: "Failed to obtain token",
      token: null
    };
    let audioBuffer;
    try {
      if (Buffer.isBuffer(rawAudio)) {
        console.log("💿 Detected Buffer input");
        audioBuffer = rawAudio;
      } else if (typeof rawAudio === "string") {
        if (rawAudio.startsWith("http://") || rawAudio.startsWith("https://")) {
          console.log(`🌐 Fetching audio from URL: ${rawAudio}`);
          const response = await axios.get(rawAudio, {
            responseType: "arraybuffer"
          });
          audioBuffer = Buffer.from(response.data);
        } else {
          console.log("🧬 Detected Base64 input");
          const base64Clean = rawAudio.replace(/^data:audio\/[a-z]+;base64,/, "");
          audioBuffer = Buffer.from(base64Clean, "base64");
        }
      } else {
        throw new Error("Invalid audio format. Must be URL, Base64 string, or Buffer.");
      }
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error("Audio buffer is empty.");
      }
    } catch (e) {
      console.error("❌ Failed to process audio source:", e.message);
      return {
        error: `Audio processing failed: ${e.message}`,
        token: t
      };
    }
    const uploadRes = await this.uploadCloneRef(t, audioBuffer, {
      title: title || "RefAudio",
      genre: genre || "pop",
      mood: mood || "neutral"
    });
    if (!uploadRes || !uploadRes.id) {
      return {
        error: "Failed to upload reference audio",
        token: t
      };
    }
    const result = await this.createCover(t, uploadRes.id, {
      title: title || "Cloned Song",
      lyrics: lyrics,
      genre: genre || "pop"
    });
    if (!result) {
      return {
        error: "Failed to generate cover",
        token: t
      };
    }
    return {
      result: result,
      ref_source: uploadRes,
      token: t
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status", "clone"]
    });
  }
  const api = new SongGPT();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'"
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.token || !params.task_id || !params.session_id) {
          return res.status(400).json({
            error: "Parameter 'token', 'task_id', dan 'session_id' wajib diisi untuk action 'status'"
          });
        }
        result = await api.status(params);
        break;
      case "clone":
        if (!params.audio_url && !params.audio || !params.lyrics) {
          return res.status(400).json({
            error: "Parameter 'audio_url' (atau 'audio') dan 'lyrics' wajib diisi untuk action 'clone'"
          });
        }
        result = await api.clone(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status", "clone"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server"
    });
  }
}