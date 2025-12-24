import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper as axiosCookiejarSupport
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
import apiConfig from "@/configs/apiConfig";
class DeepFish {
  constructor() {
    this.bearer = null;
    this.cookies = null;
    this.jar = new CookieJar();
    this.axiosClient = axios.create({
      baseURL: "https://deepfi.sh/api/trpc",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/5.37.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/5.36",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "id-ID",
        "Content-Type": "application/json",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        referer: "https://deepfi.sh/",
        priority: "u=1, i",
        "trpc-accept": "application/jsonl",
        "x-trpc-source": "client",
        ...SpoofHead()
      },
      jar: this.jar
    });
    axiosCookiejarSupport(this.axiosClient);
  }
  log(message, data = null) {
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta"
    });
    if (data) {
      console.log(`[${timestamp}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }
  async ensureAuth() {
    if (!this.bearer) {
      this.log("Token tidak tersedia, melakukan registrasi...");
      const authData = await this.register();
      this.bearer = authData.token;
      this.cookies = authData.cookies;
      this.axiosClient.defaults.headers.common["Authorization"] = `Bearer ${this.bearer}`;
    }
    return {
      token: this.bearer,
      cookies: this.cookies
    };
  }
  async register() {
    this.log("Memulai proses registrasi...");
    try {
      const mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      const mailResponse = await axios.get(`${mailApi}?action=create`);
      this.log(`Respons API email creation:`, mailResponse.data);
      const {
        email
      } = mailResponse.data;
      this.log(`Email berhasil dibuat: ${email}`);
      const signUpResponse = await this.axiosClient.post("https://clerk.deepfi.sh/v1/client/sign_ups", new URLSearchParams({
        email_address: email
      }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      this.log(`Respons sign up:`, signUpResponse.data);
      const suaId = signUpResponse.data?.response?.id;
      if (!suaId) {
        throw new Error("Gagal mendapatkan sua_id dari respons sign up.");
      }
      this.log(`Sign up berhasil, sua_id: ${suaId}`);
      const prepareVerificationResponse = await this.axiosClient.post(`https://clerk.deepfi.sh/v1/client/sign_ups/${suaId}/prepare_verification`, new URLSearchParams({
        strategy: "email_code"
      }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      this.log(`Respons prepare verification:`, prepareVerificationResponse.data);
      this.log("Permintaan verifikasi OTP telah dikirim.");
      let otp = null;
      let attempts = 0;
      const maxAttempts = 60;
      while (!otp && attempts < maxAttempts) {
        this.log(`Mengecek OTP (Percobaan ${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 3e3));
        try {
          const otpCheckResponse = await axios.get(`${mailApi}?action=message&email=${email}`);
          this.log(`Respons OTP check:`, otpCheckResponse.data);
          const message = otpCheckResponse.data?.data?.[0]?.text_content;
          if (message) {
            const otpMatch = message.match(/(\d{6})/);
            otp = otpMatch ? otpMatch[1] : null;
            if (otp) {
              this.log(`OTP ditemukan: ${otp}`);
              break;
            }
          }
        } catch (error) {
          this.log(`Gagal mendapatkan OTP, mencoba lagi... Error: ${error.message}`);
        }
        attempts++;
      }
      if (!otp) {
        throw new Error("Gagal mendapatkan OTP setelah beberapa kali percobaan.");
      }
      const attemptResponse = await this.axiosClient.post(`https://clerk.deepfi.sh/v1/client/sign_ups/${suaId}/attempt_verification`, new URLSearchParams({
        code: otp,
        strategy: "email_code"
      }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      this.log(`Respons attempt verification:`, attemptResponse.data);
      const sessionId = attemptResponse.data?.response?.created_session_id;
      if (!sessionId) {
        throw new Error("Gagal mendapatkan session_id setelah verifikasi.");
      }
      this.log(`Verifikasi berhasil, session_id: ${sessionId}`);
      const touchResponse = await this.axiosClient.post(`https://clerk.deepfi.sh/v1/client/sessions/${sessionId}/touch`, new URLSearchParams({
        active_organization_id: ""
      }), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      this.log(`Respons session touch:`, touchResponse.data);
      this.bearer = touchResponse.data?.response?.last_active_token?.jwt;
      if (!this.bearer) {
        throw new Error("Gagal mendapatkan bearer token dari session touch.");
      }
      this.log("Session berhasil di-touch, bearer token didapatkan.");
      this.axiosClient.defaults.headers.common["Authorization"] = `Bearer ${this.bearer}`;
      const syncUserResponse = await this.axiosClient.post("/user.syncUser?batch=1", '{"0":{"json":null,"meta":{"values":["undefined"]}}}');
      this.log(`Respons sync user:`, syncUserResponse.data);
      this.log("Sinkronisasi user berhasil.");
      const claimCreditsResponse = await this.axiosClient.post("/user.claimWelcomeCredits?batch=1", '{"0":{"json":null,"meta":{"values":["undefined"]}}}');
      this.log(`Respons claim credits:`, claimCreditsResponse.data);
      this.log("Klaim kredit selamat datang berhasil.");
      this.cookies = await this.jar.getCookieString("https://deepfi.sh");
      return {
        cookies: this.cookies,
        token: this.bearer
      };
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.log(`Terjadi kesalahan saat registrasi: ${errorMessage}`);
      throw error;
    }
  }
  async txt2img({
    prompt,
    num_images = 1,
    polling = true,
    token,
    cookies,
    ...rest
  }) {
    if (token) {
      this.bearer = token;
      this.axiosClient.defaults.headers.common["Authorization"] = `Bearer ${this.bearer}`;
    } else {
      await this.ensureAuth();
    }
    this.log("Memulai proses Text-to-Image...");
    if (!prompt) throw new Error("Prompt diperlukan untuk txt2img.");
    const workflowId = 84;
    const inputs = {
      prompt: prompt,
      num_images: num_images
    };
    return await this._executeWorkflow({
      workflowId: workflowId,
      inputs: inputs,
      polling: polling,
      ...rest
    });
  }
  async txt2vid({
    prompt,
    polling = true,
    token,
    cookies,
    ...rest
  }) {
    if (token) {
      this.bearer = token;
      this.axiosClient.defaults.headers.common["Authorization"] = `Bearer ${this.bearer}`;
    } else {
      await this.ensureAuth();
    }
    this.log("Memulai proses Text-to-Video...");
    if (!prompt) throw new Error("Prompt diperlukan untuk txt2vid.");
    const workflowId = 78;
    const inputs = {
      shift: 5,
      prompt: prompt,
      num_frames: 81,
      resolution: "480p",
      acceleration: "none",
      aspect_ratio: "9:16",
      guidance_scale: 3.5,
      guidance_scale_2: 4,
      frames_per_second: 16,
      interpolator_model: "film",
      num_inference_steps: 27,
      enable_safety_checker: true,
      enable_prompt_expansion: true,
      num_interpolated_frames: 1,
      adjust_fps_for_interpolation: true,
      ...rest
    };
    return await this._executeWorkflow({
      workflowId: workflowId,
      inputs: inputs,
      polling: polling
    });
  }
  async img2img({
    prompt,
    imageUrl,
    polling = true,
    token,
    cookies,
    ...rest
  }) {
    if (token) {
      this.bearer = token;
      this.axiosClient.defaults.headers.common["Authorization"] = `Bearer ${this.bearer}`;
    } else {
      await this.ensureAuth();
    }
    this.log("Memulai proses Image-to-Image...");
    if (!imageUrl) throw new Error("imageUrl diperlukan untuk img2img.");
    const workflowId = 83;
    const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const inputs = {
      prompt: prompt,
      num_images: rest.num_images || 1,
      image_urls: imageUrls
    };
    return await this._executeWorkflow({
      workflowId: workflowId,
      inputs: inputs,
      polling: polling,
      ...rest
    });
  }
  async _executeWorkflow({
    workflowId,
    inputs,
    polling = true,
    ...rest
  }) {
    this.log(`Memulai eksekusi workflow ID: ${workflowId}...`);
    try {
      const payload = JSON.stringify({
        0: {
          json: {
            workflowId: workflowId,
            inputs: inputs
          }
        }
      });
      this.log(`Mengirimkan payload: ${payload}`);
      const response = await this.axiosClient.post("/workflow.executeWorkflow?batch=1", payload);
      this.log(`Respons eksekusi:`, response.data);
      const responseText = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      const match = responseText.match(/"eventId":"([a-zA-Z0-9]+)"/);
      const eventId = match ? match[1] : null;
      if (!eventId) {
        this.log(`Gagal mengekstrak eventId dari respons: ${responseText}`);
        throw new Error("Gagal mendapatkan eventId (task_id) dari respons eksekusi.");
      }
      this.log(`Proses workflow dimulai, task_id (eventId): ${eventId}`);
      if (polling) {
        this.log(`Auto-polling diaktifkan untuk task_id: ${eventId}`);
        const maxStatusChecks = 60;
        let checkCount = 0;
        const initialDelay = 3e3;
        const maxDelay = 35e3;
        let statusResult;
        do {
          checkCount++;
          statusResult = await this.status({
            task_id: eventId,
            ...rest
          });
          if (statusResult.status !== "SUCCEEDED" && statusResult.status !== "FAILED") {
            const delay = Math.min(initialDelay * Math.pow(1.5, checkCount), maxDelay);
            this.log(`Status saat ini: ${statusResult.status}, menunggu ${delay / 1e3} detik... (Pengecekan ${checkCount}/${maxStatusChecks})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } while (!["SUCCEEDED", "FAILED", "TIMEOUT"].includes(statusResult.status) && checkCount < maxStatusChecks);
        if (checkCount >= maxStatusChecks && statusResult.status !== "SUCCEEDED" && statusResult.status !== "FAILED") {
          this.log("Batas waktu pengecekan status tercapai.");
          return {
            task_id: eventId,
            status: "TIMEOUT",
            ...rest
          };
        }
        this.log("--- HASIL AKHIR PROSES ---");
        this.log(JSON.stringify(statusResult, null, 2));
        return statusResult;
      }
      return {
        task_id: eventId,
        token: this.bearer,
        cookies: this.cookies,
        ...rest
      };
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.log(`Terjadi kesalahan saat eksekusi workflow: ${errorMessage}`);
      throw error;
    }
  }
  async status({
    task_id,
    token,
    cookies,
    ...rest
  }) {
    if (token) {
      this.bearer = token;
      this.axiosClient.defaults.headers.common["Authorization"] = `Bearer ${this.bearer}`;
    } else {
      await this.ensureAuth();
    }
    if (!task_id) {
      throw new Error("Sebuah 'task_id' diperlukan untuk metode pengecekan status.");
    }
    this.log(`Mengecek status untuk task_id: ${task_id}`);
    try {
      const input = {
        0: {
          json: {
            eventId: task_id
          }
        },
        1: {
          json: null,
          meta: {
            values: ["undefined"]
          }
        },
        2: {
          json: null,
          meta: {
            values: ["undefined"]
          }
        }
      };
      const encodedInput = encodeURIComponent(JSON.stringify(input));
      const response = await this.axiosClient.get(`/workflow.getRunByEventId,workflow.getUserActiveRuns,user.getUser?batch=1&input=${encodedInput}`, {
        headers: {
          referer: `https://deepfi.sh/workflow/NANO-BANANA%2FEDIT?runId=${task_id}`
        }
      });
      this.log(`Respons status mentah diterima.`);
      const responseText = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      let workflowData = null;
      try {
        const jsonLines = responseText.split("\n").filter(line => line.trim());
        const dataLine = jsonLines.find(line => line.match(`"eventId":"${task_id}"`));
        if (dataLine) {
          const parsedLine = JSON.parse(dataLine);
          const potentialData = parsedLine?.json?.[2]?.[0]?.[0];
          if (potentialData && potentialData.eventId === task_id) {
            workflowData = potentialData;
          }
        }
      } catch (e) {
        this.log(`Gagal mengurai respons JSONL: ${e.message}`);
        return {
          status: "FAILED",
          error: "Gagal mengurai respons",
          ...rest
        };
      }
      if (!workflowData) {
        this.log(`Data workflow untuk task_id ${task_id} belum ditemukan dalam respons, akan mencoba lagi.`);
        return {
          status: "PROCESSING",
          ...rest
        };
      }
      const apiStatus = workflowData.status || "UNKNOWN";
      const status = apiStatus === "complete" ? "SUCCEEDED" : apiStatus.toUpperCase();
      if (status === "SUCCEEDED") {
        this.log(`Status untuk task_id ${task_id}: SUCCEEDED`);
        const output = {
          urls: [workflowData.outputAssetSrc].filter(Boolean),
          full_result: workflowData.result,
          workflowTitle: workflowData.workflowTitle,
          logs: workflowData.logs
        };
        return {
          status: status,
          output: output,
          ...rest
        };
      }
      this.log(`Status untuk task_id ${task_id}: ${status}`);
      return {
        status: status,
        ...rest
      };
    } catch (error) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.log(`Terjadi kesalahan saat mengecek status: ${errorMessage}`);
      return {
        status: "FAILED",
        error: errorMessage,
        ...rest
      };
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
      error: "Action is required."
    });
  }
  const api = new DeepFish();
  try {
    let response;
    switch (action) {
      case "register":
        response = await api.ensureAuth(params);
        return res.status(200).json(response);
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2img."
          });
        }
        response = await api.img2img(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2img(params);
      case "txt2vid":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await api.txt2vid(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'register', 'txt2vid', 'txt2img' and 'img2img'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}