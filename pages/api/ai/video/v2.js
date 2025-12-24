import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class VidflyAPI {
  constructor() {
    this.mailBase = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.vidBase = "https://api.vidfly.ai/api";
    this.authBase = "https://vidfly.ai/api/auth";
    this.email = null;
    this.bearer = null;
    this.csrf = null;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
  }
  async req(method, url, data = null, headers = {}) {
    try {
      const res = await this.client({
        method: method,
        url: url,
        data: data,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
          ...SpoofHead(),
          ...headers
        }
      });
      return res.data;
    } catch (err) {
      console.error(`Error selama ${method.toUpperCase()} ${url}:`, err.response ? err.response.data : err.message);
      throw err;
    }
  }
  async getMail() {
    console.log("Mencoba membuat email sementara...");
    const url = `${this.mailBase}?action=create`;
    const res = await this.req("get", url);
    if (res && res.email) {
      this.email = res.email;
      console.log(`Email sementara berhasil dibuat: ${this.email}`);
      return this.email;
    }
    throw new Error("Gagal membuat email sementara. Respon tidak memiliki 'email'.");
  }
  async getOtp(email) {
    console.log(`Memeriksa OTP di kotak masuk: ${email}...`);
    const url = `${this.mailBase}?action=message&email=${email}`;
    const res = await this.req("get", url);
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      const msg = res.data[0].text_content;
      const otpMatch = msg.match(/Your verification code is:\s*(\d{6})/);
      if (otpMatch && otpMatch[1]) {
        console.log(`OTP ditemukan: ${otpMatch[1]}`);
        return otpMatch[1];
      }
    }
    console.log("OTP belum ditemukan atau struktur respon tidak terduga.");
    return null;
  }
  async sendCode(email) {
    console.log(`Meminta kode verifikasi email untuk ${email} dari Vidfly...`);
    const url = `${this.vidBase}/user/send-email-verify-code`;
    const headers = {
      "content-type": "application/json",
      origin: "https://vidfly.ai",
      referer: "https://vidfly.ai/",
      "sec-fetch-site": "same-site",
      "x-app-name": "vidfly-web",
      "x-app-version": "1.0.0"
    };
    return await this.req("post", url, {
      email: email
    }, headers);
  }
  async getProviders() {
    console.log("Mengambil penyedia otentikasi dari Vidfly...");
    const url = `${this.authBase}/providers/`;
    const headers = {
      "content-type": "application/json",
      referer: "https://vidfly.ai/apps/ai-video-generator/?type=text&model=veo3",
      "sec-fetch-site": "same-origin"
    };
    return await this.req("get", url, null, headers);
  }
  async getCsrf() {
    console.log("Mengambil token CSRF dari Vidfly...");
    const url = `${this.authBase}/csrf/`;
    const headers = {
      "content-type": "application/json",
      referer: "https://vidfly.ai/apps/ai-video-generator/?type=text&model=veo3",
      "sec-fetch-site": "same-origin"
    };
    const res = await this.req("get", url, null, headers);
    if (res && res.csrfToken) {
      this.csrf = res.csrfToken;
      console.log(`Token CSRF berhasil diambil: ${this.csrf}`);
      return this.csrf;
    }
    throw new Error("Gagal mendapatkan token CSRF. Respon tidak memiliki 'csrfToken'.");
  }
  async verifyCode(email, otp, csrf) {
    console.log(`Memverifikasi kode email untuk ${email} dengan Vidfly...`);
    const url = `${this.authBase}/callback/email/`;
    const headers = {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://vidfly.ai",
      referer: "https://vidfly.ai/apps/ai-video-generator/?type=text&model=veo3",
      "sec-fetch-site": "same-origin"
    };
    const data = new URLSearchParams({
      redirect: "false",
      email: email,
      verifyCode: otp,
      csrfToken: csrf,
      callbackUrl: "https://vidfly.ai/apps/ai-video-generator/?type=text&model=veo3",
      json: "true"
    }).toString();
    return await this.req("post", url, data, headers);
  }
  async getSession() {
    console.log("Mengambil sesi pengguna dari Vidfly...");
    const url = `${this.authBase}/session/`;
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://vidfly.ai/apps/ai-video-generator/?type=text&model=veo3",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    const res = await this.req("get", url, null, headers);
    const cookies = await this.jar.getCookies(this.authBase);
    let nextSourceStateCookie = cookies.find(c => c.key === "next_source_state");
    if (nextSourceStateCookie) {
      try {
        const decodedValueOnce = decodeURIComponent(nextSourceStateCookie.value);
        const decodedValueTwice = decodeURIComponent(decodedValueOnce);
        const sourceState = JSON.parse(decodedValueTwice);
        if (sourceState && sourceState.token) {
          this.bearer = sourceState.token;
          console.log(`Token sesi (bearer) berhasil didapatkan dari cookie 'next_source_state' dan disimpan.`);
          return res;
        }
      } catch (e) {
        console.error("Gagal mengurai cookie 'next_source_state':", e.message);
      }
    }
    throw new Error("Gagal mendapatkan sesi atau token sesi dari Vidfly (cookie 'next_source_state' tidak ditemukan atau tidak valid).");
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
  async txt2vid({
    prompt = "Seekor elang perkasa terbang di atas pegunungan bersalju saat fajar, menangkap sinar matahari pertama.",
    aspectRatio = "16:9",
    duration = "5",
    modelId = "6788b0aedc76ede02322ab28",
    resolution = "720p",
    image = "",
    negativePrompt = "",
    privacyStatus = 0,
    style = "",
    ...rest
  }) {
    console.log("--- Memulai Proses Pembuatan Video Vidfly ---");
    try {
      await this.getMail();
      const tempEmail = this.email;
      if (!tempEmail) {
        throw new Error("Gagal membuat email sementara.");
      }
      await this.sendCode(tempEmail);
      let otp = null;
      const maxRetries = 10;
      const pollTime = 5e3;
      let retryCount = 0;
      while (!otp && retryCount < maxRetries) {
        console.log(`Percobaan ${retryCount + 1}/${maxRetries} untuk mengambil OTP...`);
        await new Promise(resolve => setTimeout(resolve, pollTime));
        otp = await this.getOtp(tempEmail);
        retryCount++;
      }
      if (!otp) {
        throw new Error("Gagal mengambil OTP setelah beberapa percobaan. Silakan coba lagi.");
      }
      await this.getCsrf();
      const csrf = this.csrf;
      if (!csrf) {
        throw new Error("Gagal mengambil token CSRF.");
      }
      await this.verifyCode(tempEmail, otp, csrf);
      await this.getSession();
      const bearer = this.bearer;
      if (!bearer) {
        throw new Error("Gagal mendapatkan token bearer setelah login.");
      }
      console.log("Mengirim permintaan pembuatan video ke Vidfly...");
      const createVideoUrl = `${this.vidBase}/project/text2video/create-vidfly`;
      const createVideoHeaders = {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        origin: "https://vidfly.ai",
        referer: "https://vidfly.ai/",
        "sec-fetch-site": "same-site",
        "x-app-name": "vidfly-web",
        "x-app-version": "1.0.0"
      };
      const createVideoData = {
        modelId: modelId,
        prompt: prompt,
        aspectRatio: aspectRatio,
        duration: duration,
        version: "v2.0",
        resolution: resolution,
        image: image,
        negativePrompt: negativePrompt,
        privacyStatus: privacyStatus,
        style: style,
        ...rest
      };
      const videoRes = await this.req("post", createVideoUrl, createVideoData, createVideoHeaders);
      if (videoRes && videoRes.code === 0 && videoRes.data && videoRes.data.videoIds && videoRes.data.videoIds.length > 0) {
        const taskIdsToEncrypt = videoRes.data.videoIds;
        console.log(`Pembuatan video berhasil dimulai. Menggunakan Video ID Mentah: ${taskIdsToEncrypt.join(", ")}`);
        const encTaskIds = await this.enc({
          task_ids: taskIdsToEncrypt,
          bearer: bearer
        });
        console.log("--- Proses Pembuatan Video Selesai dengan Sukses ---");
        return {
          status: true,
          task_id: encTaskIds,
          message: "Pembuatan video berhasil dimulai. Gunakan task_id yang dikembalikan untuk memeriksa status."
        };
      } else {
        throw new Error(`Pembuatan video gagal: ${JSON.stringify(videoRes)}`);
      }
    } catch (err) {
      console.error("Error selama proses pembuatan video:", err.message);
      throw err;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    console.log("--- Memeriksa Status Video Vidfly ---");
    let decData;
    try {
      decData = await this.dec(task_id);
    } catch (err) {
      console.error("Dekripsi gagal:", err.message);
      throw new Error(`Gagal mendekripsi task_id: ${err.message}`);
    }
    const actualTaskIds = decData.task_ids;
    const actualBearer = decData.bearer;
    if (!actualTaskIds || !Array.isArray(actualTaskIds) || actualTaskIds.length === 0 || !actualBearer) {
      throw new Error("Data yang didekripsi tidak memiliki 'task_ids' (array valid) atau token 'bearer'.");
    }
    const fetchVideoHeaders = {
      authorization: `Bearer ${actualBearer}`,
      "content-type": "application/json",
      origin: "https://vidfly.ai",
      referer: "https://vidfly.ai/",
      "sec-fetch-site": "same-site",
      "x-app-name": "vidfly-web",
      "x-app-version": "1.0.0",
      ...rest
    };
    const allVideoStatuses = [];
    for (const singleVideoId of actualTaskIds) {
      console.log(`Mengambil status untuk ID Video: ${singleVideoId}`);
      const fetchVideoUrl = `${this.vidBase}/video/fetch?ids=${singleVideoId}`;
      try {
        const statusRes = await this.req("get", fetchVideoUrl, null, fetchVideoHeaders);
        if (statusRes && statusRes.code === 0 && statusRes.data && statusRes.data.videos && statusRes.data.videos.length > 0) {
          const videoInfo = {
            ...statusRes.data.videos[0]
          };
          const domain = statusRes.data.domain;
          if (videoInfo.status === 2 && domain) {
            if (videoInfo.specs && videoInfo.specs.default) {
              if (videoInfo.specs.default.video) {
                videoInfo.videoUrl = `${domain}${videoInfo.specs.default.video}`;
              }
              if (videoInfo.specs.default.cover) {
                videoInfo.coverUrl = `${domain}${videoInfo.specs.default.cover}`;
              }
              if (videoInfo.specs.default.originalVideo) {
                videoInfo.originalVideoUrl = `${domain}${videoInfo.specs.default.originalVideo}`;
              }
            }
          }
          console.log(`\nStatus untuk Video ID ${singleVideoId}:`);
          console.log(`Status: ${videoInfo.status === 2 ? "completed" : "processing/failed"}`);
          if (videoInfo.videoUrl) {
            console.log(`URL Video: ${videoInfo.videoUrl}`);
          }
          if (videoInfo.coverUrl) {
            console.log(`URL Cover: ${videoInfo.coverUrl}`);
          }
          if (videoInfo.options && videoInfo.options.error) {
            console.log(`Pesan Kesalahan: ${videoInfo.options.error}`);
          }
          allVideoStatuses.push(videoInfo);
        } else {
          console.log(`Tidak ada data status yang ditemukan atau status tidak berhasil untuk Video ID: ${singleVideoId}.`);
          allVideoStatuses.push({
            id: singleVideoId,
            status: "not_found",
            message: "No data or unsuccessful status found"
          });
        }
      } catch (err) {
        console.error(`Error saat mengambil status untuk Video ID ${singleVideoId}:`, err.message);
        allVideoStatuses.push({
          id: singleVideoId,
          status: "error",
          message: err.message
        });
      }
    }
    console.log("--- Pemeriksaan Status Video Selesai ---");
    return {
      data: allVideoStatuses
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
      error: "Missing required field: action",
      required: {
        action: "txt2vid | status"
      }
    });
  }
  const client = new VidflyAPI();
  try {
    let result;
    switch (action) {
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required fields for 'txt2vid': prompt`
          });
        }
        result = await client.txt2vid(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field for 'status': task_id`
          });
        }
        result = await client.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed actions are: txt2vid, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`API Error for action ${action}:`, error.message);
    return res.status(500).json({
      error: `Processing error for action '${action}': ${error.message}`
    });
  }
}