import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class GenImage {
  constructor() {
    this.base = "https://backend.gen-image.com";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://gen-image.com",
      referer: "https://gen-image.com/",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async req(method, url, data = null, headers = {}) {
    try {
      console.log(`[LOG] ${method.toUpperCase()} ${url}`);
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...headers
        },
        data: data,
        validateStatus: () => true
      };
      const res = await axios(config);
      if (res.status >= 400) throw new Error(`Request failed with status code ${res.status} - ${JSON.stringify(res.data)}`);
      console.log(res?.data);
      return res;
    } catch (e) {
      console.error(`[ERR] Request: ${e.message}`);
      return null;
    }
  }
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async getMail() {
    const res = await this.req("get", `${this.mailApi}?action=create`);
    return res?.data?.email || null;
  }
  async getOtp(email) {
    console.log(`[LOG] Checking inbox for ${email}...`);
    for (let i = 0; i < 60; i++) {
      const res = await this.req("get", `${this.mailApi}?action=message&email=${email}`);
      const msgs = res?.data?.data || res?.data || [];
      if (msgs.length > 0) {
        const content = msgs[0]?.text_content || "";
        const match = content.match(/verify\?token=([a-f0-9\-]+)/);
        if (match?.[1]) return match[1];
      }
      await this.wait(3e3);
    }
    return null;
  }
  async autoAuth() {
    try {
      console.log("[LOG] Starting Auto Auth...");
      const email = await this.getMail();
      if (!email) throw new Error("Failed to create email");
      console.log(`[LOG] Email created: ${email}`);
      await this.req("post", `${this.base}/auth/magiclink?email=${email}`, {}, {
        "content-length": "0"
      });
      const magicToken = await this.getOtp(email);
      if (!magicToken) throw new Error("OTP/Magic link token not found");
      console.log(`[LOG] Verifying magic token: ${magicToken}`);
      const payload = {
        ip: Math.floor(Math.random() * 1e9).toString(),
        fingerprint: Math.floor(Math.random() * 1e9).toString()
      };
      const verifyRes = await this.req("post", `${this.base}/auth/magiclink/verify?token=${magicToken}`, payload);
      if (!verifyRes) throw new Error("Verify request failed");
      const cookies = verifyRes.headers["set-cookie"];
      let accessToken = null;
      if (Array.isArray(cookies)) {
        const tokenCookie = cookies.find(c => c.trim().startsWith("access_token="));
        if (tokenCookie) {
          accessToken = tokenCookie.split(";")[0].split("=")[1];
        }
      }
      if (!accessToken && verifyRes.data?.data?.token) {
        accessToken = verifyRes.data.data.token;
      }
      if (!accessToken) throw new Error("Failed to extract access_token from headers/body");
      console.log("[LOG] Auth Success. Token obtained.");
      return accessToken;
    } catch (e) {
      console.error(`[ERR] Auth Flow: ${e.message}`);
      return null;
    }
  }
  authHeaders(token) {
    return {
      authorization: `Bearer ${token}`,
      cookie: `access_token=${token}`
    };
  }
  async credit(token) {
    return await this.req("get", `${this.base}/credit/me`, null, this.authHeaders(token));
  }
  async poll(id, token) {
    console.log(`[LOG] Polling task ID: ${id}...`);
    const headers = this.authHeaders(token);
    for (let i = 0; i < 60; i++) {
      const res = await this.req("get", `${this.base}/predict/${id}/data`, null, headers);
      const data = res?.data?.data;
      if (data) {
        if (data.images && data.images.length > 0) {
          return data.images.map(img => `https://blob.gen-image.com/small/${img.uuid}.${img.format || "webp"}`);
        }
      }
      await this.wait(3e3);
    }
    return null;
  }
  async createImg(token, prompt, options = {}) {
    const payload = {
      promptInput: {
        prompt_positive: prompt,
        style_code: options.style || "gpt-image-1",
        format_code: options.format || "square",
        batch_nbr: 1,
        quality: options.quality || "medium"
      },
      config: {
        is_default: true
      }
    };
    const res = await this.req("post", `${this.base}/predict/generate`, payload, this.authHeaders(token));
    return res?.data?.data?.id;
  }
  async generate({
    token,
    prompt,
    ...rest
  }) {
    try {
      let authToken = token;
      if (!authToken) {
        authToken = await this.autoAuth();
        if (!authToken) return {
          status: "error",
          message: "Auth Failed"
        };
      }
      const creds = await this.credit(authToken);
      if (creds?.data?.data) {
        const {
          daily_count,
          daily_limit
        } = creds.data.data;
        console.log(`[LOG] Credits: ${daily_count}/${daily_limit}`);
      }
      const taskId = await this.createImg(authToken, prompt, rest);
      if (!taskId) throw new Error("Failed to get Task ID (Check API Response/Payload)");
      const result = await this.poll(taskId, authToken);
      if (!result) throw new Error("Polling timeout or Empty result");
      return {
        status: "success",
        result: result,
        token: authToken
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new GenImage();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}