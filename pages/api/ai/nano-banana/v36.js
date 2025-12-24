import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import SpoofHead from "@/lib/spoof-head";
class NanoStudio {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://teravexa.com",
      jar: this.jar,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://teravexa.com",
        referer: "https://teravexa.com/marketing-advertisements/nano-banana-studio",
        ...SpoofHead()
      }
    }));
    this.key = null;
    this.base = {
      helpType: "Nano Banana Studio",
      includeCompanyName: false,
      companyName: "",
      targetAudience: {
        description: "",
        ageRange: [],
        gender: "All",
        city: "",
        country: "",
        area: "All",
        annualIncome: [],
        currency: "$",
        otherCurrency: ""
      },
      competitivePricing: false,
      primaryKPIs: ["ROI"],
      secondaryKPIs: [],
      promotions: {
        description: ""
      },
      emailFormat: "HTML",
      metaPreferredTone: "Professional",
      outputLanguage: "en-us",
      videoDuration: "8",
      videoAspectRatio: "720p",
      videoResolution: "720p",
      generateAudio: false,
      ratio: "auto"
    };
  }
  log(m, t = "INFO") {
    console.log(`[${new Date().toLocaleTimeString()}][${t}] ${m}`);
  }
  async auth() {
    if (this.key) return;
    this.log("Getting auth...");
    try {
      const {
        data
      } = await this.client.get("/marketing-advertisements/nano-banana-studio");
      const m = data.match(/\\?"apiJwt\\?":\\?"([^"\\]+)/);
      console.log(m[1]);
      this.key = m?.[1] || null;
      if (!this.key) throw new Error("Key not found");
      this.log("Auth OK");
    } catch (e) {
      this.log(`Auth err: ${e.message}`, "ERR");
      throw e;
    }
  }
  async b64(src) {
    try {
      if (Buffer.isBuffer(src)) return `data:image/jpeg;base64,${src.toString("base64")}`;
      if (typeof src === "string") {
        if (src.startsWith("data:")) return src;
        if (src.startsWith("http")) {
          const {
            data
          } = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return `data:image/jpeg;base64,${Buffer.from(data).toString("base64")}`;
        }
        return `data:image/jpeg;base64,${src}`;
      }
    } catch (e) {
      return null;
    }
    return null;
  }
  async poll(id) {
    let i = 0;
    while (i++ < 60) {
      await new Promise(r => setTimeout(r, 3e3));
      this.log(`Polling ${id} (${i})...`);
      try {
        const {
          data
        } = await this.client.get(`/api/generate/banana-studio?taskId=${id}`, {
          headers: {
            "x-api-key": this.key
          }
        });
        console.log(data);
        if (data?.successFlag === 1 || data?.resultUrl || data?.output) return data;
        if (data?.successFlag === 2 || data?.error) throw new Error(data?.error || "Remote fail");
      } catch (e) {
        if (e.message.includes("Remote fail")) throw e;
      }
    }
    throw new Error("Timeout");
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      await this.auth();
      const contents = [];
      const imgs = [];
      const inputs = Array.isArray(imageUrl) ? imageUrl : imageUrl ? [imageUrl] : [];
      for (const img of inputs) {
        const b = await this.b64(img);
        if (b) {
          contents.push(b);
          imgs.push({});
        }
      }
      const mode = contents.length > 0 ? "edit" : "generate";
      this.log(`Task: ${mode} (${contents.length} imgs)`);
      const payload = {
        ...this.base,
        ...rest,
        nanoBananaMode: mode,
        imageEditDescription: prompt || rest?.imageEditDescription || "Enhance image",
        uploadedImageContents: contents,
        uploadedImages: imgs
      };
      const {
        data
      } = await this.client.post("/api/generate/banana-studio", payload, {
        headers: {
          "x-api-key": this.key,
          "content-type": "application/json"
        }
      });
      console.log(data);
      if (!data?.taskId) throw new Error("No Task ID");
      return await this.poll(data.taskId);
    } catch (e) {
      this.log(`Gen err: ${e.response?.data ? JSON.stringify(e.response.data) : e.message}`, "ERR");
      return null;
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
  const api = new NanoStudio();
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