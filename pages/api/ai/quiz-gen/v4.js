import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class QuizGenerator {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://acequiz.ai",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://acequiz.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://acequiz.ai/signup",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
    this.mailClient = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    });
    this.uniqueId = crypto.randomBytes(16).toString("hex");
  }
  async createTempMail() {
    try {
      const res = await this.mailClient.get("?action=create");
      if (res.data && res.data.email) {
        console.log("Email temporary dibuat:", res.data.email);
        return res.data.email;
      }
      throw new Error("Gagal buat email");
    } catch (err) {
      throw new Error("Create mail failed: " + err.message);
    }
  }
  async getOTP(email) {
    const maxAttempts = 60;
    const delay = 3e3;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await this.mailClient.get(`?action=message&email=${encodeURIComponent(email)}`);
        if (res.data?.data?.length > 0) {
          const latest = res.data.data[0];
          const text = latest.text_content || "";
          const match = text.match(/(\d{6})/);
          if (match) {
            console.log("OTP ditemukan:", match[1]);
            return match[1];
          }
        }
      } catch (err) {
        console.warn("Cek OTP gagal (attempt " + (i + 1) + "):", err.message);
      }
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error("OTP tidak ditemukan setelah 60 detik");
  }
  async sendVerificationCode(email, sessionId, uniqueId) {
    const payload = {
      email: email,
      sessionId: sessionId,
      uniqueId: uniqueId
    };
    await this.client.post("/api/auth/send-verification-code", payload);
    console.log("Verification code dikirim ke email");
  }
  async emailSignup({
    email,
    verificationCode,
    sessionId,
    uniqueId
  }) {
    const payload = {
      email: email,
      password: email,
      name: "",
      verificationCode: verificationCode,
      sessionId: sessionId,
      uniqueId: uniqueId,
      platform: {
        type: "website",
        userAgent: this.client.defaults.headers["user-agent"]
      }
    };
    const res = await this.client.post("/api/auth/email-signup", payload);
    console.log("Signup berhasil");
    return res.data;
  }
  async generate({
    prompt,
    numQuestions = 5,
    difficulty = "Medium",
    includeTags = true,
    enableLatex = true,
    enableMarkdown = true,
    quizStyle = "factual_recall",
    webSearchEnabled = true,
    questionTypes = ["multiple-choice"],
    ...rest
  }) {
    const sessionId = "session_" + this.uniqueId;
    const uniqueId = this.uniqueId;
    const email = await this.createTempMail();
    await this.sendVerificationCode(email, sessionId, uniqueId);
    const otp = await this.getOTP(email);
    await this.emailSignup({
      email: email,
      verificationCode: otp,
      sessionId: sessionId,
      uniqueId: uniqueId
    });
    const payload = {
      prompt: prompt,
      numQuestions: parseInt(numQuestions),
      difficulty: difficulty,
      includeTags: includeTags,
      enableLatex: enableLatex,
      enableMarkdown: enableMarkdown,
      quizStyle: quizStyle,
      webSearchEnabled: webSearchEnabled,
      documentContent: null,
      fileType: "document",
      subject: "default",
      questionTypes: questionTypes,
      questionTypeDistribution: null,
      learningObjective: "",
      targetGrade: "any",
      ...rest
    };
    const response = await this.client.post("/api/stream-quiz", payload, {
      responseType: "stream"
    });
    const stream = response.data;
    let questions = [];
    let fullLog = [];
    let quizName = "Untitled Quiz";
    return new Promise(resolve => {
      stream.on("data", chunk => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        lines.forEach(line => {
          if (line.startsWith("data: ") || line.startsWith('{"type"')) {
            const dataStr = line.startsWith("data: ") ? line.slice(6) : line;
            try {
              const data = JSON.parse(dataStr);
              fullLog.push(data);
              if (data.type === "question" && data.data) {
                questions.push(data.data);
              }
              if (data.type === "quiz_name_generated" || data.quizName) {
                quizName = data.quizName || data.message.split('"')[1] || quizName;
              }
            } catch (e) {}
          }
        });
      });
      stream.on("end", () => {
        console.log(`Quiz selesai! ${questions.length} soal dibuat.`);
        resolve({
          success: true,
          quizName: quizName,
          questions: questions,
          totalQuestions: questions.length,
          emailUsed: email,
          rawLog: fullLog
        });
      });
      stream.on("error", err => {
        resolve({
          success: false,
          error: true,
          message: "Stream error: " + err.message
        });
      });
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new QuizGenerator();
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