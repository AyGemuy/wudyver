import axios from "axios";
class PornWorks {
  constructor() {
    this.base = "https://pornworks.com/api/v2";
    const token = this.genCfToken();
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cf-auth-token": token,
      "content-type": "application/json",
      origin: "https://pornworks.com",
      priority: "u=1, i",
      referer: "https://pornworks.com/en/generate/image",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      site: "pornworks",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  genCfToken() {
    try {
      const randomId = Math.random().toString(36).substring(2, 11);
      const payload = {
        x: "/generate/image?refid=undressai_com",
        lg: "en",
        dw: 424,
        dh: 942,
        cd: 24,
        to: "-480",
        u: randomId,
        z: "",
        re: "undressaitool_com"
      };
      const token = Buffer.from(JSON.stringify(payload)).toString("base64");
      return token;
    } catch (e) {
      console.error("[ERR] Failed generating token:", e.message);
      return "";
    }
  }
  async req(method, path, data = null) {
    try {
      console.log(`[LOG] Requesting: ${method} ${path}`);
      const config = {
        method: method,
        url: `${this.base}${path}`,
        headers: this.headers,
        data: data || undefined
      };
      if (method === "GET") {
        const getHeaders = {
          ...this.headers
        };
        delete getHeaders["content-type"];
        delete getHeaders["origin"];
        config.headers = getHeaders;
      }
      const res = await axios(config);
      return res?.data;
    } catch (err) {
      console.error(`[ERR] ${method} ${path}:`, err?.message || err);
      if (err?.response?.data) console.error("[ERR] Body:", JSON.stringify(err.response.data));
      return null;
    }
  }
  async poll(id) {
    console.log(`[LOG] Start polling task: ${id}`);
    let state = "pending";
    let result = null;
    while (state === "pending") {
      await new Promise(r => setTimeout(r, 3e3));
      const rand = Math.random();
      const check = await this.req("GET", `/generations/${id}/state?r=${rand}`);
      state = check?.state || "pending";
      console.log(`[LOG] Status: ${state}`);
      if (state === "done") {
        result = check?.results;
      } else if (state === "failed") {
        console.error("[ERR] Task status returned failed");
        return null;
      }
    }
    return result;
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      const defaultNegative = "very small body, (small girl:1.3), (premature:1.3), (underage:1.5), (short:1.5), (child:1.5), (teen:1.5), (little:1.5), (small:1.5), (mini:1.5), paintings, sketches, (worst quality:1.2), (low quality:1.2), (normal quality:1.2), lowres, ((monochrome)), ((grayscale)), skin spots, acnes, skin blemishes, age spot, glans, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worstquality, signature, watermark, username, blurry, bad feet, poorly drawn hands, ugly face, poorly drawn face, low resolution faces, deformed, jpeg artifacts, extra fingers, fewer digits, extra limbs, extra arms, extra legs, malformed limbs, deformed bodies, deformed limbs, fused bodies, fused fingers, fused limbs, too many fingers, long neck, cross-eyed, polar lowres, bad body, bad proportions, gross proportions, missing fingers, missing arms, missing legs, extra digit, unrealistic sex positions, unrealistic orgy sex, deformed penis, ugly penis head, logo, (((poorly drawn hands))), deformed bodies, malformed bodies,duplicate, morbid, mutilated, extra hands, fused fingers, cloned face, disfigured, extra toes, deformed fingers, (multiple sets of ears:1.3)";
      const payload = {
        checkpoint: rest.checkpoint || "nude_people",
        prompt: prompt,
        negativePrompt: rest.negativePrompt || defaultNegative,
        resources: rest.resources || [],
        ratio: rest.ratio || "2x3",
        sharpness: rest.sharpness ?? 5,
        cfgScale: rest.cfgScale ?? 17,
        performance: rest.performance || "express",
        denoisingStrength: rest.denoisingStrength ?? 1,
        fast: rest.fast ? true : false
      };
      console.log("[LOG] Sending generation payload...");
      const init = await this.req("POST", "/generate/text2image", payload);
      const id = init?.id;
      if (!id) throw new Error("Gagal mendapatkan Generation ID");
      console.log(`[LOG] Task Created ID: ${id}`);
      const finalData = await this.poll(id);
      return finalData ? {
        success: true,
        ...finalData
      } : {
        success: false,
        message: "Task finished but no result found"
      };
    } catch (e) {
      console.error("[ERR] Generate Process Failed:", e.message);
      return {
        success: false,
        error: e.message
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
  const api = new PornWorks();
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