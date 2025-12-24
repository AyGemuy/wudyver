import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import CryptoJS from "crypto-js";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class AkoolAPI {
  constructor() {
    this.cookieJar = new CookieJar();
    this.baseUrl = "https://akool.com";
    this.axiosInstance = wrapper(axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Sec-Ch-Ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      jar: this.cookieJar,
      withCredentials: true
    }));
    this.emailApiInstance = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      }
    });
    this.gbuuid = "";
    this.authToken = "";
    this.isRegistering = false;
    this.setupInterceptors();
  }
  randomCryptoIP() {
    const bytes = crypto.randomBytes(4);
    return Array.from(bytes).map(b => b % 256).join(".");
  }
  randomID(length = 16) {
    return crypto.randomBytes(length).toString("hex");
  }
  buildHeaders(extra = {}) {
    const ip = this.randomCryptoIP();
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-request-id": this.randomID(8),
      ...SpoofHead(),
      ...extra
    };
    console.log("Headers built:", headers);
    return headers;
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(async config => {
      config.headers = {
        ...this.buildHeaders({}),
        ...config.headers
      };
      if (this.authToken) {
        config.headers["Authorization"] = `Bearer ${this.authToken}`;
      }
      return config;
    }, error => {
      return Promise.reject(error);
    });
    this.axiosInstance.interceptors.response.use(response => {
      if (response.data && response.data.token) {
        this.authToken = response.data.token;
      }
      return response;
    }, async error => {
      return Promise.reject(error);
    });
  }
  async getCookieValue(name, url) {
    const cookies = await this.cookieJar.getCookies(url);
    const cookie = cookies.find(c => c.key === name);
    return cookie ? cookie.value : null;
  }
  encryptPassword(password) {
    try {
      const iv = CryptoJS.lib.WordArray.random(16);
      return CryptoJS.AES.encrypt(password, "akool666", {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();
    } catch (err) {
      console.error("Error encrypting password:", err);
      return "";
    }
  }
  generateRandomString(length) {
    const characters = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += characters.charAt(randomBytes[i] % characters.length);
    }
    return result;
  }
  generateRandomPassword(length = 16) {
    const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
    const numberChars = "0123456789";
    const specialChars = "!@#$%^&*()_+-=";
    let passwordChars = [];
    const allChars = upperCaseChars + lowerCaseChars + numberChars + specialChars;
    passwordChars.push(upperCaseChars.charAt(crypto.randomBytes(1)[0] % upperCaseChars.length));
    passwordChars.push(lowerCaseChars.charAt(crypto.randomBytes(1)[0] % lowerCaseChars.length));
    passwordChars.push(numberChars.charAt(crypto.randomBytes(1)[0] % numberChars.length));
    passwordChars.push(specialChars.charAt(crypto.randomBytes(1)[0] % specialChars.length));
    const remainingLength = length - passwordChars.length;
    const randomBytes = crypto.randomBytes(remainingLength);
    for (let i = 0; i < remainingLength; i++) {
      passwordChars.push(allChars.charAt(randomBytes[i] % allChars.length));
    }
    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = crypto.randomBytes(1)[0] % (i + 1);
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }
    return passwordChars.join("");
  }
  async createEmail() {
    try {
      const response = await this.emailApiInstance.get("/api/mails/v9?action=create", {
        headers: this.buildHeaders()
      });
      if (response.data && response.data.email) {
        return response.data;
      } else {
        throw new Error("Failed to get email from response.");
      }
    } catch (error) {
      throw error;
    }
  }
  async registerUser(firstName, lastName, email, password) {
    try {
      await this.axiosInstance.get("/apps/image-generator", {
        headers: this.buildHeaders({
          Referer: "https://akool.com/",
          Priority: "u=1, i"
        })
      });
      this.gbuuid = await this.getCookieValue("gbuuid", "https://akool.com");
      if (!this.gbuuid) {
        throw new Error("gbuuid cookie not found after visiting image-generator.");
      }
      const encryptedPassword = this.encryptPassword(password);
      const encryptedConfirmPassword = this.encryptPassword(password);
      const data = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: encryptedPassword,
        confirmPassword: encryptedConfirmPassword,
        email_push: true,
        from_akool_app: 1
      };
      const response = await this.axiosInstance.post("/interface/user-api/api/v7/public/register", data, {
        headers: this.buildHeaders({
          "Content-Type": "application/json",
          Origin: "https://akool.com",
          Referer: "https://akool.com/apps/image-generator",
          Priority: "u=1, i"
        })
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async checkOtp(email) {
    try {
      const response = await this.emailApiInstance.get(`/api/mails/v9?action=message&email=${email}`, {
        headers: this.buildHeaders()
      });
      if (response.data && response.data.data && response.data.data.length > 0) {
        const emailContent = response.data.data[0].text_content;
        const otpMatch = emailContent.match(/Enter this code:\n\n(\d{4})/);
        if (otpMatch && otpMatch[1]) {
          return otpMatch[1];
        } else {
          throw new Error("OTP not found in email content.");
        }
      } else {
        throw new Error("No email found for OTP verification.");
      }
    } catch (error) {
      throw error;
    }
  }
  async verifyOtp(email, otp) {
    if (!this.gbuuid) {
      throw new Error("gbuuid is not available. Please register the user first to get the cookie.");
    }
    const data = {
      email: email,
      otp: otp
    };
    try {
      const response = await this.axiosInstance.post("/interface/user-api/api/v6/public/verify_otp", data, {
        headers: this.buildHeaders({
          "Content-Type": "application/json",
          Origin: "https://akool.com",
          Referer: "https://akool.com/apps/image-generator",
          Priority: "u=1, i"
        })
      });
      if (response.data && response.data.token) {
        this.authToken = response.data.token;
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    if (!this.authToken && !this.isRegistering) {
      console.log("Authentication token not available. Initiating automatic registration...");
      this.isRegistering = true;
      try {
        await this.runAkoolRegistration();
        console.log("Automatic registration successful. Continuing with content generation.");
      } catch (regError) {
        this.isRegistering = false;
        console.error("Automatic registration failed.");
        throw new Error(`Failed to perform automatic registration: ${regError.message}`);
      } finally {
        this.isRegistering = false;
      }
    } else if (this.isRegistering) {
      throw new Error("Registration is in progress. Please try again later.");
    }
    if (!this.authToken) {
      throw new Error("Authentication token not available after registration. Check the registration process.");
    }
    if (!this.gbuuid) {
      throw new Error("gbuuid is not available. It should be set after the initial page visit.");
    }
    const data = {
      prompt: prompt,
      ...rest
    };
    try {
      const imageCreationResponse = await this.axiosInstance.post("/interface/content-api/api/v6/content/image/createBySourcePrompt", data, {
        headers: this.buildHeaders({
          "Content-Type": "application/json",
          Origin: "https://akool.com",
          Referer: "https://akool.com/apps/image-generator",
          Priority: "u=1, i"
        })
      });
      console.log("Initial image creation response:", imageCreationResponse.data);
      if (imageCreationResponse.data && imageCreationResponse.data.data && imageCreationResponse.data.data.task_id) {
        const taskId = imageCreationResponse.data.data.task_id;
        console.log(`Polling history for task_id: ${taskId}`);
        const finalResult = await this.pollImageHistory(taskId);
        return finalResult;
      } else {
        throw new Error("task_id not found in initial image creation response.");
      }
    } catch (error) {
      console.error("Error generating content.");
      throw error;
    }
  }
  async runAkoolRegistration() {
    try {
      const emailData = await this.createEmail();
      const email = emailData.email;
      console.log(`Temporary email created: ${email}`);
      const firstName = this.generateRandomString(5);
      const lastName = this.generateRandomString(7);
      const password = this.generateRandomPassword(16);
      console.log(`Generated First Name: ${firstName}`);
      console.log(`Generated Last Name: ${lastName}`);
      console.log(`Generated Password: ${password}`);
      const registerResponse = await this.registerUser(firstName, lastName, email, password);
      console.log("User registration response:", registerResponse);
      if (registerResponse && registerResponse.code === 1004) {
        throw new Error(`Registration failed: ${registerResponse.message}`);
      }
      let otp = null;
      let attempts = 0;
      const maxAttempts = 60;
      const pollDelay = 3e3;
      while (!otp && attempts < maxAttempts) {
        console.log(`Attempting to get OTP (attempt ${attempts + 1}/${maxAttempts})...`);
        try {
          otp = await this.checkOtp(email);
          if (otp) {
            console.log(`OTP found: ${otp}`);
            break;
          }
        } catch (e) {
          console.warn(`Error getting OTP. Retrying...`);
        }
        await new Promise(resolve => setTimeout(resolve, pollDelay));
        attempts++;
      }
      if (!otp) {
        throw new Error("Failed to retrieve OTP after multiple attempts.");
      }
      const verifyOtpResponse = await this.verifyOtp(email, otp);
      console.log("OTP verification response:", verifyOtpResponse);
      return verifyOtpResponse;
    } catch (error) {
      throw error;
    }
  }
  async pollImageHistory(taskId, interval = 3e3, maxAttempts = 60) {
    if (!this.authToken) {
      throw new Error("Authentication token not available. Make sure you are logged in or registered.");
    }
    if (!this.gbuuid) {
      throw new Error("gbuuid is not available. Make sure you have visited the initial page.");
    }
    const url = `https://akool.com/interface/content-api/api/v6/content/image/history/list?page=1&size=12&image_type=4&image_status=3&sub_type=40001`;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const response = await this.axiosInstance.get(url, {
          headers: this.buildHeaders({
            accept: "application/json, text/plain, */*",
            "accept-language": "id-ID,id;q=0.9",
            priority: "u=1, i",
            referer: "https://akool.com/apps/image-generator"
          })
        });
        console.log(`Polling history attempt ${attempts + 1}:`, response.data);
        if (response.data && response.data.data && response.data.data.result) {
          const foundImage = response.data.data.result.find(item => item.task_id === taskId && item.image_status === 3);
          if (foundImage) {
            console.log(`Task ${taskId} found with success status.`);
            return foundImage;
          }
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        console.error(`Error during polling image history for task ${taskId}:`, error.message);
        throw error;
      }
    }
    throw new Error(`Image generation for task ${taskId} timed out after ${maxAttempts} attempts.`);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const akoolApi = new AkoolAPI();
  try {
    const data = await akoolApi.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}