import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import apiConfig from "@/configs/apiConfig";
class ThumbSnap {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.email = null;
    this.password = null;
    this.verificationLink = null;
    this.userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15", "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0"];
    this.defaultHeaders = {};
  }
  getRandomUserAgent() {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[randomIndex];
  }
  getRandomIpAddress() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join(".");
  }
  updateRandomHeaders() {
    const userAgent = this.getRandomUserAgent();
    const randomIp = this.getRandomIpAddress();
    this.defaultHeaders = {
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": userAgent,
      priority: "u=0, i",
      "sec-ch-ua": `"${userAgent.includes("Chrome") ? "Chromium" : "Not A(Brand)"}";v="${userAgent.match(/Chrome\/(\d+)/)?.[1] || "99"}", "Google Chrome";v="${userAgent.match(/Chrome\/(\d+)/)?.[1] || "99"}"`,
      "sec-ch-ua-mobile": userAgent.includes("Mobile") ? "?1" : "?0",
      "sec-ch-ua-platform": userAgent.includes("Windows") ? '"Windows"' : userAgent.includes("Macintosh") ? '"macOS"' : userAgent.includes("Android") ? '"Android"' : '"Linux"',
      "X-Forwarded-For": randomIp,
      Via: `1.1 ${randomIp} (Squid/3.5.27)`,
      "True-Client-IP": randomIp,
      "Client-IP": randomIp,
      "Accept-Encoding": Math.random() < .5 ? "gzip, deflate, br" : "gzip, deflate",
      Connection: Math.random() < .5 ? "keep-alive" : "close",
      "Cache-Control": "no-cache"
    };
  }
  async createDisposableEmail() {
    this.updateRandomHeaders();
    console.log("[STEP 1] Membuat email sementara...");
    try {
      const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`, {
        headers: this.defaultHeaders
      });
      if (response.data && response.data.email && response.data.uuid) {
        this.email = response.data.email;
        this.password = response.data.uuid;
        console.log(`[SUCCESS] Email dibuat: ${this.email} dengan password: ${this.password}`);
        return {
          email: this.email,
          password: this.password
        };
      } else {
        throw new Error("Gagal membuat email sementara: Struktur respon tidak valid.");
      }
    } catch (error) {
      console.error("[ERROR] Gagal membuat email sementara:", error.message);
      throw error;
    }
  }
  async getSignupPageInfo() {
    this.updateRandomHeaders();
    console.log("[STEP 2] Mengambil informasi halaman pendaftaran untuk captcha...");
    try {
      const response = await this.client.get("https://thumbsnap.com/users/signup", {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      const yepMatch = response.data.match(/name="yep" value="([^"]+)"/);
      const capMatch = response.data.match(/What is (\d+) \+ (\d+)\?/);
      if (yepMatch && yepMatch[1] && capMatch && capMatch[1] && capMatch[2]) {
        const yepValue = yepMatch[1];
        const capValue = parseInt(capMatch[1]) + parseInt(capMatch[2]);
        console.log(`[INFO] Captcha ditemukan: cap=${capValue}, yep=${yepValue}`);
        return {
          cap: capValue,
          yep: yepValue
        };
      } else {
        throw new Error("Gagal mendapatkan nilai captcha (yep/cap) dari halaman pendaftaran.");
      }
    } catch (error) {
      console.error("[ERROR] Gagal mengambil info halaman pendaftaran:", error.message);
      throw error;
    }
  }
  async signup() {
    if (!this.email || !this.password) {
      throw new Error("Email atau password belum dibuat. Harap panggil createDisposableEmail terlebih dahulu.");
    }
    this.updateRandomHeaders();
    const {
      cap,
      yep
    } = await this.getSignupPageInfo();
    console.log("[STEP 3] Mendaftar di ThumbSnap...");
    try {
      const response = await this.client.post("https://thumbsnap.com/users/signup", new URLSearchParams({
        email: this.email,
        password: this.password,
        cap: cap,
        yep: yep,
        signup: "Sign Up"
      }).toString(), {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://thumbsnap.com",
          referer: "https://thumbsnap.com/users/signup",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 303
      });
      if (response.status === 302 || response.status === 303) {
        console.log("[SUCCESS] Pendaftaran berhasil. Menunggu email verifikasi...");
        return true;
      } else {
        console.log("[INFO] Respon pendaftaran:", response.status, response.data);
        throw new Error("Pendaftaran gagal atau tidak ada redirect setelah pendaftaran.");
      }
    } catch (error) {
      console.error("[ERROR] Gagal mendaftar di ThumbSnap:", error.message);
      throw error;
    }
  }
  async checkVerificationEmail(maxRetries = 60, delay = 3e3) {
    if (!this.email) {
      throw new Error("Email belum dibuat. Harap panggil createDisposableEmail terlebih dahulu.");
    }
    console.log(`[STEP 4] Mencari link verifikasi email untuk ${this.email}...`);
    for (let i = 0; i < maxRetries; i++) {
      this.updateRandomHeaders();
      try {
        const response = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${this.email}`, {
          headers: this.defaultHeaders
        });
        if (response.data && response.data.data && response.data.data.length > 0) {
          const latestEmail = response.data.data[0];
          const textContent = latestEmail.text_content;
          const linkRegex = /https:\/\/thumbsnap\.com\/users\/account\?activate=[a-zA-Z0-9-]+/g;
          const match = textContent.match(linkRegex);
          if (match && match[0]) {
            this.verificationLink = match[0];
            console.log(`[SUCCESS] Link verifikasi ditemukan: ${this.verificationLink}`);
            return this.verificationLink;
          }
        }
      } catch (error) {
        console.error(`[WARNING] Gagal memeriksa email (percobaan ${i + 1}/${maxRetries}):`, error.message);
      }
      console.log(`[INFO] Link verifikasi belum ditemukan. Mengulang dalam ${delay / 1e3} detik...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Gagal menemukan link verifikasi setelah beberapa percobaan.");
  }
  async activateAccount() {
    if (!this.verificationLink) {
      throw new Error("Link verifikasi belum ditemukan. Harap panggil checkVerificationEmail terlebih dahulu.");
    }
    this.updateRandomHeaders();
    console.log(`[STEP 5] Mengaktifkan akun menggunakan link: ${this.verificationLink}`);
    try {
      const response = await this.client.get(this.verificationLink, {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      if (response.status === 200) {
        console.log("[SUCCESS] Akun berhasil diaktifkan!");
        return true;
      } else {
        console.log("[INFO] Respon aktivasi:", response.status, response.data);
        throw new Error("Gagal mengaktifkan akun atau respon tidak seperti yang diharapkan.");
      }
    } catch (error) {
      console.error("[ERROR] Gagal mengaktifkan akun:", error.message);
      throw error;
    }
  }
  async claimDailyBonus(claim) {
    this.updateRandomHeaders();
    console.log("[STEP 6] Melakukan klaim bonus harian...");
    try {
      const response = await this.client.post("https://thumbsnap.com/api/gen", {
        go: "mine",
        claim: claim
      }, {
        headers: {
          ...this.defaultHeaders,
          accept: "*/*",
          "content-type": "application/json;charset=UTF-8",
          origin: "https://art.thumbsnap.com",
          referer: "https://art.thumbsnap.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUCCESS] Klaim bonus harian berhasil:", response.data);
      return response.data;
    } catch (error) {
      console.error("[ERROR] Gagal melakukan klaim bonus harian:", error.message);
      throw error;
    }
  }
  async generateImage(prompt) {
    if (!this.email) {
      throw new Error("Anda harus login/mengaktifkan akun terlebih dahulu.");
    }
    this.updateRandomHeaders();
    console.log("[STEP 7] Mengirim prompt ke Art Generator...");
    const base64Prompt = Buffer.from(prompt).toString("base64");
    try {
      const response = await this.client.post("https://thumbsnap.com/api/gen", {
        prompt: base64Prompt,
        resolution: 0,
        amount: 1
      }, {
        headers: {
          ...this.defaultHeaders,
          accept: "*/*",
          "content-type": "application/json;charset=UTF-8",
          origin: "https://art.thumbsnap.com",
          referer: "https://art.thumbsnap.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUCCESS] Prompt berhasil dikirim. Respon Art Generator:", response.data);
      return response.data;
    } catch (error) {
      console.error("[ERROR] Gagal mengirim prompt ke Art Generator:", error.message);
      throw error;
    }
  }
  async pollGenerationStatus(jobIds, maxRetries = 60, delay = 3e3) {
    console.log(`[STEP 8] Memulai polling status generasi untuk ID: ${jobIds.join(", ")}`);
    for (let i = 0; i < maxRetries; i++) {
      this.updateRandomHeaders();
      try {
        const response = await this.client.post("https://thumbsnap.com/api/gen", {
          go: "status",
          ids: jobIds
        }, {
          headers: {
            ...this.defaultHeaders,
            accept: "*/*",
            "content-type": "application/json;charset=UTF-8",
            origin: "https://art.thumbsnap.com",
            referer: "https://art.thumbsnap.com/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site"
          }
        });
        if (response.data && response.data.jobs) {
          const allDone = response.data.jobs.every(job => job.status === "DONE");
          console.log(`[INFO] Status polling (percobaan ${i + 1}/${maxRetries}):`, JSON.stringify(response.data.jobs.map(j => ({
            id: j.id,
            status: j.status
          })), null, 2));
          if (allDone) {
            console.log("[SUCCESS] Semua tugas generasi gambar telah selesai!");
            return response.data.jobs.filter(job => job.status === "DONE");
          }
        }
      } catch (error) {
        console.error(`[WARNING] Gagal polling status (percobaan ${i + 1}/${maxRetries}):`, error.message);
      }
      console.log(`[INFO] Tugas belum selesai. Mengulang polling dalam ${delay / 1e3} detik...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error("Generasi gambar tidak selesai setelah beberapa percobaan.");
  }
  async generate({
    prompt = ""
  }) {
    try {
      await this.createDisposableEmail();
      await this.signup();
      await this.checkVerificationEmail();
      await this.activateAccount();
      await this.claimDailyBonus(false);
      await this.claimDailyBonus(true);
      const generationResult = await this.generateImage(prompt);
      const jobIds = generationResult.id;
      if (!jobIds || jobIds.length === 0) {
        throw new Error("Tidak ada ID tugas yang diterima dari Art Generator.");
      }
      const finalJobs = await this.pollGenerationStatus(jobIds);
      const resultsWithUrls = finalJobs.map(job => ({
        ...job,
        url: `https://thumbsnap.com/art-out/${job.id}.jpg`
      }));
      return resultsWithUrls;
    } catch (error) {
      console.error("[AUTOMATION FAILED] Otomatisasi gagal:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new ThumbSnap();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}