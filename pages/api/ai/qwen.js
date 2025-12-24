import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class QwenChat {
  constructor() {
    this.uidToken = null;
  }
  async getUmidToken() {
    try {
      const {
        data
      } = await axios.post(`https://${apiConfig.DOMAIN_URL}/api/tools/playwright`, {
        code: `const { chromium } = require("playwright");

                    (async () => {
                        try {
                            const browser = await chromium.launch({ headless: true });
                            const context = await browser.newContext();
                            const page = await context.newPage();
                            
                            await page.goto("https://chat.qwen.ai/", { waitUntil: "networkidle" });

                            await page.evaluate(() => {
                                return new Promise((resolve, reject) => {
                                    const script = document.createElement("script");
                                    script.src = "https://g.alicdn.com/AWSC/AWSC/awsc.js";
                                    script.onload = () => resolve("AWSC loaded");
                                    script.onerror = () => reject("Gagal memuat AWSC");
                                    document.head.appendChild(script);
                                });
                            });

                            await page.waitForFunction(() => window.__baxia__ && window.__baxia__.getFYModule, null, { timeout: 10000 });

                            const uidToken = await page.evaluate(() => {
                                const getStore = (e, t) => {
                                    var r = window.__baxia__ || {};
                                    return e ? r[e] || t : r;
                                };

                                const getUmidToken = () => {
                                    var e = getStore("getFYModule", {});
                                    return e && e.getUidToken ? e.getUidToken() || null : null;
                                };

                                return getUmidToken();
                            });

                            await browser.close();
                            if (!uidToken) throw new Error("Gagal mendapatkan UID Token");

                            console.log(uidToken);
                        } catch (error) {
                            console.error(error);
                        }
                    })();`
      }, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36"
        }
      });
      if (!data || !data.output) throw new Error("Gagal mendapatkan UID Token dari API");
      this.uidToken = data.output.trim();
      console.log("✅ New UID Token:", this.uidToken);
      return this.uidToken;
    } catch (error) {
      console.error("Error saat mendapatkan UID Token:", error.message);
      throw error;
    }
  }
  async sendMessage({
    prompt,
    model = "qwen-turbo-latest",
    type = "t2t"
  }, retryCount = 0) {
    try {
      if (retryCount > 2) throw new Error("Permintaan gagal setelah 3 kali percobaan");
      if (!this.uidToken) await this.getUmidToken();
      const {
        data
      } = await axios.post("https://chat.qwen.ai/api/chat/completions", {
        stream: false,
        incremental_output: true,
        chat_type: type,
        model: model,
        messages: [{
          role: "user",
          content: prompt,
          chat_type: type,
          extra: {},
          feature_config: {
            thinking_enabled: false
          }
        }]
      }, {
        headers: {
          authority: "chat.qwen.ai",
          accept: "*/*",
          "content-type": "application/json",
          cookie: "ssxmod_itna=2",
          origin: "https://chat.qwen.ai",
          referer: "https://chat.qwen.ai/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
          "bx-umidtoken": this.uidToken
        }
      });
      if (data.error && data.error.includes("code 401")) {
        console.log("UID Token kadaluarsa, mengambil yang baru...");
        this.uidToken = null;
        return await this.sendMessage({
          prompt: prompt,
          model: model,
          type: type
        }, retryCount + 1);
      }
      return data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("UID Token kadaluarsa, mengambil yang baru...");
        this.uidToken = null;
        return await this.sendMessage({
          prompt: prompt,
          model: model,
          type: type
        }, retryCount + 1);
      }
      console.error("Error saat mengirim pesan:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const qwen = new QwenChat();
  try {
    const data = await qwen.sendMessage(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}