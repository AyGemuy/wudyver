import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class DeepNudes {
  constructor() {
    this.base = "https://api.deep-nudes.com";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://deep-nudes.com",
      referer: "https://deep-nudes.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(msg) {
    console.log(`[DeepNudes] ${new Date().toLocaleTimeString()} -> ${msg}`);
  }
  async img(input) {
    try {
      if (Buffer.isBuffer(input)) return input.toString("base64");
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          this.log("Fetching image url...");
          const buf = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(buf?.data).toString("base64");
        }
        return input.replace(/^data:image\/\w+;base64,/, "");
      }
      return null;
    } catch (e) {
      throw new Error(`Image process failed: ${e.message}`);
    }
  }
  async mail() {
    this.log("Creating temp email...");
    try {
      const res = await axios.get(`${this.mailApi}?action=create`);
      const email = res?.data?.email || res?.data;
      if (!email) throw new Error("Empty email response");
      this.log(`Email created: ${email}`);
      return email;
    } catch (e) {
      throw new Error(`Mail create error: ${e.message}`);
    }
  }
  async send(email) {
    this.log("Requesting magic link...");
    try {
      await axios.post(`${this.base}/auth/magic-link`, {
        email: email
      }, {
        headers: this.headers
      });
      this.log("Magic link sent.");
    } catch (e) {
      throw new Error(`Auth req error: ${e.response?.statusText || e.message}`);
    }
  }
  async poll(email) {
    this.log("Polling for OTP/Link...");
    let retries = 0;
    const maxRetries = 60;
    while (retries < maxRetries) {
      try {
        await new Promise(r => setTimeout(r, 3e3));
        const res = await axios.get(`${this.mailApi}?action=message&email=${email}`);
        const msgs = res?.data?.data || [];
        const target = msgs.find(m => m?.text_content?.includes("/auth/magic-login"));
        if (target) {
          const text = target.text_content;
          const match = text.match(/https:\/\/api\.deep-nudes\.com\/auth\/magic-login\?token=[^\s\)]+/);
          const link = match ? match[0] : null;
          if (link) {
            this.log("Magic link found!");
            return link;
          }
        }
      } catch (e) {}
      retries++;
    }
    throw new Error("Polling timeout: Magic link not received");
  }
  async auth(link) {
    this.log("Verifying token...");
    try {
      const res = await axios.get(link, {
        headers: this.headers,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      const cookies = res?.headers?.["set-cookie"];
      if (!cookies) throw new Error("No session cookies returned");
      const accessCookie = cookies.find(c => c.includes("accessToken"));
      const token = accessCookie ? accessCookie.split(";")[0].split("=")[1] : null;
      if (!token) throw new Error("AccessToken not found in cookies");
      this.log("Authenticated.");
      return token;
    } catch (e) {
      throw new Error(`Login error: ${e.message}`);
    }
  }
  async post(token, b64, type = "WOMAN") {
    this.log("Sending generation request...");
    try {
      const payload = {
        image: `data:image/jpeg;base64,${b64}`,
        mask: null,
        type: type
      };
      const res = await axios.post(`${this.base}/generation`, payload, {
        headers: {
          ...this.headers,
          cookie: `accessToken=${token}`
        }
      });
      const data = res?.data || "";
      if (typeof data === "string" && data.length > 100) return data;
      if (data?.image) return data.image;
      if (!data) throw new Error("Empty data received");
      return data;
    } catch (e) {
      throw new Error(`Gen error: ${e.response?.data?.message || e.message}`);
    }
  }
  async generate({
    imageUrl,
    type = "WOMAN",
    ...rest
  }) {
    try {
      const b64 = await this.img(imageUrl);
      if (!b64) throw new Error("Invalid image input");
      const email = await this.mail();
      await this.send(email);
      const link = await this.poll(email);
      const token = await this.auth(link);
      const resB64 = await this.post(token, b64, type);
      const cleanB64 = resB64.replace(/^data:image\/\w+;base64,/, "");
      return Buffer.from(cleanB64, "base64");
    } catch (error) {
      this.log(`Stopped: ${error.message}`);
      throw error;
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
  const api = new DeepNudes();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(result);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}