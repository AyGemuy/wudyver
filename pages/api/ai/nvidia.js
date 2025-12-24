import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class NvidiaChat {
  constructor() {
    this.baseUrl = "https://api.ngc.nvidia.com/v2";
    this.captchaUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/cf-token`;
    this.headers = {
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: "https://build.nvidia.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://build.nvidia.com/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.fnId = null;
    this.captcha = null;
    this.siteKey = "0c6a1e45-75d7-43cc-b836-a0c9d886b8ee";
  }
  async getCaptcha() {
    try {
      const {
        data
      } = await axios.get(this.captchaUrl, {
        params: {
          url: "https://api.ngc.nvidia.com",
          sitekey: this.siteKey,
          type: "hcaptcha"
        }
      });
      this.captcha = data?.token;
      return this.captcha;
    } catch (e) {
      console.error("[CAPTCHA]", e?.response?.data || e.message);
      throw e;
    }
  }
  async getSpec(model) {
    try {
      const {
        data
      } = await axios.get(`${this.baseUrl}/endpoints/qc69jvmznzxy/${model?.split("/")?.pop()}/spec`, {
        params: {
          "resolve-labels": true,
          "remove-unresolved-labels": true
        },
        headers: this.headers
      });
      this.fnId = data?.nvcfFunctionId;
      return data;
    } catch (e) {
      console.error("[SPEC]", e?.response?.data || e.message);
      throw e;
    }
  }
  async chat({
    messages,
    prompt,
    model = "microsoft/phi-4-mini-flash-reasoning",
    ...opts
  }) {
    try {
      const finalMessages = messages?.length ? messages : [{
        role: "user",
        content: prompt || "Hello"
      }];
      if (!this.captcha) await this.getCaptcha();
      if (!this.fnId) await this.getSpec(model);
      const {
        data
      } = await axios.post(`${this.baseUrl}/predict/models/qc69jvmznzxy/${model?.split("/")?.pop()}`, {
        model: model,
        max_tokens: 8192,
        presence_penalty: 0,
        frequency_penalty: 0,
        top_p: .95,
        temperature: .6,
        messages: finalMessages,
        ...opts
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          "nv-captcha-token": this.captcha,
          "nv-function-id": this.fnId
        }
      });
      return data;
    } catch (e) {
      console.error("[CHAT]", {
        url: e?.config?.url,
        status: e?.response?.status,
        data: e?.response?.data
      });
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const ai = new NvidiaChat();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}