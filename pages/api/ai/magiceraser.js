import axios from "axios";
import FormData from "form-data";
class MagicEraser {
  constructor() {
    this.apiBase = "https://api.magiceraser.org/api/magiceraser/v1";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.validModels = ["magiceraser_v1", "flux_kontext", "seedream", "nano_banana"];
  }
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, e => {
      const t = Math.random() * 16 | 0;
      return (e === "x" ? t : t & 3 | 8).toString(16);
    });
  }
  async buff(source) {
    try {
      if (!source) return null;
      if (Buffer.isBuffer(source)) return source;
      if (source.startsWith("http")) {
        console.log(`[Log] Fetching image from URL...`);
        const res = await axios.get(source, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      return Buffer.from(source.replace(/^data:image\/\w+;base64,/, ""), "base64");
    } catch (e) {
      console.error(`[Error] Buffer conversion failed: ${e.message}`);
      return null;
    }
  }
  async getSiteHtml() {
    try {
      const targetUrl = "https://magiceraser.org/ai-image-editor/";
      console.log(`[Log] Fetching HTML context from ${targetUrl}...`);
      const {
        data
      } = await axios.get(targetUrl, {
        headers: {
          "User-Agent": this.ua,
          Referer: "https://magiceraser.org/"
        }
      });
      return data;
    } catch (e) {
      console.error(`[Error] Failed to fetch site HTML: ${e.message}`);
      return '<!DOCTYPE html><html lang="en"><body></body></html>';
    }
  }
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async req(endpoint, form) {
    try {
      const url = `${this.apiBase}${endpoint}`;
      const headers = {
        ...form.getHeaders(),
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://magiceraser.org",
        priority: "u=1, i",
        "product-code": "magiceraser",
        "product-serial": this.uuid(),
        referer: "https://magiceraser.org/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": this.ua
      };
      const {
        data
      } = await axios.post(url, form, {
        headers: headers
      });
      return data;
    } catch (e) {
      console.error(`[Error] Request failed: ${e.response?.data?.message?.en || e.message}`);
      throw e;
    }
  }
  async poll(jobId) {
    console.log(`[Log] Polling job: ${jobId}`);
    const url = `${this.apiBase}/ai-remove/get-job/${jobId}`;
    const headers = {
      origin: "https://magiceraser.org",
      referer: "https://magiceraser.org/",
      "user-agent": this.ua
    };
    let result = null;
    for (let i = 0; i < 60; i++) {
      try {
        const {
          data
        } = await axios.get(url, {
          headers: headers
        });
        const outputs = data?.result?.output_url;
        if (outputs && Array.isArray(outputs) && outputs.length > 0) {
          result = outputs;
          console.log(`[Log] Job completed!`);
          break;
        }
        console.log(`[Log] Waiting for result... (${i + 1}/60)`);
      } catch (e) {
        console.log(`[Log] Polling error (retrying): ${e.message}`);
      }
      await this.wait(3e3);
    }
    return result;
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    try {
      console.log(`[Log] Starting generation process...`);
      const selectedModel = rest.model_name || "magiceraser_v1";
      if (!this.validModels.includes(selectedModel)) {
        throw new Error(`Model '${selectedModel}' tidak valid. Model yang tersedia: ${this.validModels.join(", ")}`);
      }
      console.log(`[Log] Using model: ${selectedModel}`);
      const form = new FormData();
      form.append("model_name", selectedModel);
      form.append("prompt", prompt || "artistic style");
      let endpoint = "";
      if (imageUrl) {
        console.log(`[Log] Mode: Image to Image (Editor)`);
        endpoint = "/image_editor/create-job";
        const buffer = await this.buff(imageUrl);
        if (!buffer) throw new Error("Invalid Image Source");
        form.append("target_images", buffer, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
        form.append("ratio", rest.ratio || "match_input_image");
      } else {
        console.log(`[Log] Mode: Text to Image`);
        endpoint = "/image_generator/create-job";
        const realHtml = await this.getSiteHtml();
        form.append("target_images", Buffer.from(realHtml), {
          filename: "image.png",
          contentType: "text/html"
        });
        form.append("ratio", rest.ratio || "2:3");
      }
      const jobData = await this.req(endpoint, form);
      const jobId = jobData?.result?.job_id;
      if (!jobId) {
        throw new Error("Failed to get Job ID from API response");
      }
      const finalUrl = await this.poll(jobId);
      return {
        status: finalUrl ? true : false,
        job_id: jobId,
        model_used: selectedModel,
        type: imageUrl ? "image-to-image" : "text-to-image",
        result: finalUrl || "Timeout or Failed"
      };
    } catch (e) {
      console.error(`[Error] Generate failed:`, e.message);
      return {
        status: false,
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
  const api = new MagicEraser();
  try {
    const data = await api.generate(params);
    return res.status(data.status ? 200 : 400).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}