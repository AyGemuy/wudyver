import axios from "axios";
import crypto from "crypto";
const RSA_PUBLIC_KEY_BASE64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7TIHog89K/IEIO3LF2/B9A8Gi/DkXZG6Y+PoydoKD9JrxR9CHRP1Pmbsm09oY9ycxyw7Tfb4ljt9ySxOmzMALoN1mJx0ontUe9+BoAxddK2NQDhRz55B/HUUAGFJ9tGTC8dlkAgc0OnEBR9O60x5KDOltgNR/iriGdlxMoTGRnGS6LOXGiRQlAzyj1hmyTl9vOePkWTvj/GG3W1sWaw9LTvd83WZdxvgGtcjMe4ZqW86BGTmG32yqgg+uQCew88BaSRAmTxpH/YqKWsBD7mk5pS80+ss2mS6XeQRtqN82DActjrgOoOiaL9nZdh7DZJIY2Sqz8aHh9vkHeqwJi1iDwIDAQAB";
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
${RSA_PUBLIC_KEY_BASE64}
-----END PUBLIC KEY-----`;
class ElwayBridge {
  constructor() {
    this.url = "https://aibr.elway-mobile.com/chatCompletion";
    this.config = {
      model: "t1",
      platform: "android",
      appMv: "14",
      appVr: "1440",
      userAgent: "Ktor client"
    };
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${msg}`);
  }
  generateAibsg(jsonString) {
    try {
      const md5HashBuffer = crypto.createHash("md5").update(jsonString, "utf8").digest();
      const encryptedBuffer = crypto.publicEncrypt({
        key: PUBLIC_KEY_PEM,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, md5HashBuffer);
      return encryptedBuffer.toString("base64");
    } catch (e) {
      this.log(`Crypto Error: ${e.message}`, "ERR");
      return null;
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    const conversation = messages ? [...messages] : [];
    if (prompt) {
      conversation.push({
        role: "user",
        content: prompt
      });
    }
    if (conversation.length === 0) return {
      error: "No input provided"
    };
    const bodyData = {
      messages: conversation
    };
    const jsonString = JSON.stringify(bodyData);
    const aibsg = this.generateAibsg(jsonString);
    if (!aibsg) return {
      error: "Sign failed"
    };
    const headers = {
      "User-Agent": this.config.userAgent,
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Accept-Charset": "UTF-8",
      aibsg: aibsg,
      aibpf: this.config.platform,
      aibmd: this.config.model,
      appmv: this.config.appMv,
      appvr: this.config.appVr
    };
    this.log(`Sending ${conversation.length} msgs...`);
    try {
      const {
        data
      } = await axios.post(this.url, bodyData, {
        headers: headers,
        responseType: "text"
      });
      const resultText = data.split("\n").filter(line => line.startsWith("data:")).map(line => {
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") return "";
        try {
          const json = JSON.parse(jsonStr);
          return json.content || "";
        } catch (e) {
          return "";
        }
      }).join("");
      return {
        result: resultText,
        status: "success",
        history: [...conversation, {
          role: "assistant",
          content: resultText
        }]
      };
    } catch (error) {
      return {
        result: null,
        error: error.message
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
  const api = new ElwayBridge();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan sistem."
    });
  }
}