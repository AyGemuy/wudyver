import axios from "axios";
import {
  randomBytes
} from "crypto";
import FormData from "form-data";
class ImgGen {
  constructor() {
    this.cfg = {
      models: ["nano_banana", "magiceraser_v1", "flux_kontext", "magiceraser_v3", "magiceraser_v4", "seedream", "seedream45"],
      ratios: ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3", "match_input_image"],
      modes: ["editor", "upscale", "restore", "enhance", "unblur"],
      upscalePixels: [2, 4, 8]
    };
    this.serial = this.genSerial();
    this.ax = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://imgupscaler.ai",
        referer: "https://imgupscaler.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    console.log("[Init] 🔑 Serial:", this.serial);
  }
  genSerial() {
    return randomBytes(16).toString("hex");
  }
  async generate({
    prompt,
    image,
    model,
    ratio,
    mode,
    targetPixel,
    ...rest
  }) {
    try {
      console.log("[Gen] 🚀 Start generation");
      console.log("[Gen] 📝 Params:", {
        model: model,
        ratio: ratio,
        mode: mode,
        targetPixel: targetPixel,
        hasImg: !!image,
        promptLen: prompt?.length || 0
      });
      const val = this.validate({
        prompt: prompt,
        model: model,
        ratio: ratio,
        image: image,
        mode: mode,
        targetPixel: targetPixel
      });
      if (!val.success) {
        console.log("[Gen] ❌ Validation failed:", val.message);
        return val;
      }
      console.log("[Gen] ✅ Validation passed");
      console.log("[Gen] 🎨 Mode:", mode);
      let imgs = [];
      const needUpload = ["editor", "upscale", "enhance", "unblur"].includes(mode);
      if (image && needUpload) {
        console.log("[Gen] 📤 Uploading images...");
        try {
          imgs = await this.up(image);
          if (imgs.length === 0) {
            console.log("[Gen] ❌ No images uploaded");
            return {
              success: false,
              message: "Image upload failed",
              result: null
            };
          }
          console.log("[Gen] ✅ Images uploaded:", imgs.length);
        } catch (e) {
          console.error("[Gen] ❌ Upload error:", e.message);
          return {
            success: false,
            message: `Upload failed: ${e.message}`,
            result: null
          };
        }
      }
      console.log("[Gen] 🎯 Creating job...");
      let jid;
      try {
        jid = await this.job({
          prompt: prompt,
          model: model,
          ratio: ratio,
          imgs: imgs,
          mode: mode,
          targetPixel: targetPixel,
          image: image
        });
        if (!jid) {
          console.log("[Gen] ❌ No job ID returned");
          return {
            success: false,
            message: "Failed to create job",
            result: null
          };
        }
        console.log("[Gen] ✅ Job created:", jid);
      } catch (e) {
        console.error("[Gen] ❌ Job creation error:", e.message);
        return {
          success: false,
          message: `Job creation failed: ${e.message}`,
          result: null
        };
      }
      console.log("[Gen] ⏳ Polling for results...");
      let res;
      try {
        res = await this.poll(jid, mode);
        console.log("[Gen] ✅ Results received");
      } catch (e) {
        console.error("[Gen] ❌ Polling error:", e.message);
        return {
          success: false,
          message: `Polling failed: ${e.message}`,
          result: null
        };
      }
      const finalUrl = res?.output_url?.[0] || null;
      console.log("[Gen] 🎉 Done! Result:", finalUrl ? "✅" : "❌");
      return {
        success: true,
        message: "Generation completed",
        result: finalUrl,
        job_id: jid,
        ...res
      };
    } catch (e) {
      console.error("[Gen] 💥 Unexpected error:", e.message);
      console.error("[Gen] Stack:", e.stack);
      return {
        success: false,
        message: `Unexpected error: ${e.message}`,
        result: null
      };
    }
  }
  validate({
    prompt,
    model,
    ratio,
    image,
    mode,
    targetPixel
  }) {
    try {
      console.log("[Val] 🔍 Validating input...");
      if (!this.cfg.modes.includes(mode)) {
        console.log("[Val] ❌ Invalid mode:", mode);
        return {
          success: false,
          message: `Invalid mode "${mode}". Available: ${this.cfg.modes.join(", ")}`,
          result: null
        };
      }
      console.log("[Val] ✅ Mode OK:", mode);
      if (mode === "editor") {
        if (!prompt?.trim()) {
          console.log("[Val] ❌ Prompt empty");
          return {
            success: false,
            message: "Prompt is required for editor mode",
            result: null
          };
        }
        console.log("[Val] ✅ Prompt OK");
        if (!this.cfg.models.includes(model)) {
          console.log("[Val] ❌ Invalid model:", model);
          return {
            success: false,
            message: `Invalid model "${model}". Available: ${this.cfg.models.join(", ")}`,
            result: null
          };
        }
        console.log("[Val] ✅ Model OK:", model);
        if (!this.cfg.ratios.includes(ratio)) {
          console.log("[Val] ❌ Invalid ratio:", ratio);
          return {
            success: false,
            message: `Invalid ratio "${ratio}". Available: ${this.cfg.ratios.join(", ")}`,
            result: null
          };
        }
        console.log("[Val] ✅ Ratio OK:", ratio);
      }
      if (["upscale", "restore", "enhance", "unblur"].includes(mode)) {
        if (!image) {
          console.log("[Val] ❌ Image required for", mode);
          return {
            success: false,
            message: `Image is required for ${mode} mode`,
            result: null
          };
        }
        console.log("[Val] ✅ Image OK");
      }
      if (mode === "upscale") {
        if (!this.cfg.upscalePixels.includes(targetPixel)) {
          console.log("[Val] ❌ Invalid targetPixel:", targetPixel);
          return {
            success: false,
            message: `Invalid targetPixel "${targetPixel}". Available: ${this.cfg.upscalePixels.join(", ")}`,
            result: null
          };
        }
        console.log("[Val] ✅ TargetPixel OK:", targetPixel);
      }
      console.log("[Val] ✅ All validations passed");
      return {
        success: true
      };
    } catch (e) {
      console.error("[Val] 💥 Validation error:", e.message);
      return {
        success: false,
        message: `Validation error: ${e.message}`,
        result: null
      };
    }
  }
  async up(img) {
    const arr = Array.isArray(img) ? img : [img];
    const urls = [];
    console.log("[Up] 📦 Processing", arr.length, "image(s)");
    for (const [idx, i] of arr.entries()) {
      try {
        console.log(`[Up] 🔄 Image ${idx + 1}/${arr.length}`);
        console.log("[Up] 📥 Converting to buffer...");
        const buf = await this.toBuf(i);
        console.log("[Up] ✅ Buffer ready:", buf.length, "bytes");
        const fname = `${randomBytes(16).toString("hex")}.jpg`;
        console.log("[Up] 📝 Filename:", fname);
        const fd = new FormData();
        fd.append("file_name", fname);
        console.log("[Up] 📋 FormData prepared");
        console.log("[Up] 🌐 Sending request...");
        const {
          data
        } = await this.ax.post("https://api.imgupscaler.ai/api/common/upload/upload-image", fd, {
          headers: fd.getHeaders()
        });
        const url = data?.result?.url || "";
        if (!url) {
          console.log("[Up] ⚠️ No URL in response");
          continue;
        }
        console.log("[Up] ✅ Uploaded:", url.substring(0, 50) + "...");
        urls.push(url);
      } catch (e) {
        console.error(`[Up] ❌ Image ${idx + 1} failed:`, e.message);
        if (e.response) {
          console.error("[Up] 📡 Response:", e.response.status, e.response.statusText);
          console.error("[Up] 📄 Data:", JSON.stringify(e.response.data));
        }
      }
    }
    console.log("[Up] 📊 Total uploaded:", urls.length, "/", arr.length);
    return urls;
  }
  async job({
    prompt,
    model,
    ratio,
    imgs,
    mode,
    targetPixel,
    image
  }) {
    try {
      const fd = new FormData();
      let url, endpoint;
      console.log("[Job] 🎯 Mode:", mode);
      console.log("[Job] 🔑 Using serial:", this.serial);
      if (mode === "editor") {
        const isI2I = !!image;
        endpoint = isI2I ? "https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job" : "https://api.magiceraser.org/api/magiceraser/v1/image_generator/create-job";
        console.log("[Job] 🎨 Type:", isI2I ? "image-editor" : "image_generator");
        console.log("[Job] 📋 Building FormData...");
        fd.append("model_name", model);
        console.log("[Job] ✅ Model:", model);
        if (isI2I) {
          fd.append("original_image_url", imgs[0] || "");
          console.log("[Job] ✅ Image URL:", imgs[0]?.substring(0, 50) + "...");
        } else {
          fd.append("target_images", "");
          console.log("[Job] ✅ Target images: empty");
        }
        fd.append("prompt", prompt);
        console.log("[Job] ✅ Prompt:", prompt.substring(0, 50) + (prompt.length > 50 ? "..." : ""));
        fd.append("ratio", ratio);
        console.log("[Job] ✅ Ratio:", ratio);
        fd.append("output_format", "jpg");
        console.log("[Job] ✅ Format: jpg");
        url = endpoint;
      } else if (mode === "upscale") {
        endpoint = "https://api.imgupscaler.ai/api/image-upscaler/v2/enhancer/create-job";
        console.log("[Job] 📋 Building FormData for upscale...");
        fd.append("target_pixel", targetPixel.toString());
        console.log("[Job] ✅ TargetPixel:", targetPixel);
        fd.append("original_image_file", imgs[0] || "");
        console.log("[Job] ✅ Image URL:", imgs[0]?.substring(0, 50) + "...");
        fd.append("output_format", "jpg");
        console.log("[Job] ✅ Format: jpg");
        url = endpoint;
      } else if (mode === "restore") {
        endpoint = "https://api.imgupscaler.ai/api/image-upscaler/v3/restore/create-uc-job";
        console.log("[Job] 📋 Building FormData for restore...");
        const buf = await this.toBuf(image);
        const fname = `${randomBytes(16).toString("hex")}.jpg`;
        fd.append("original_image_file", buf, {
          filename: fname,
          contentType: "image/jpeg"
        });
        console.log("[Job] ✅ Image file:", fname);
        url = endpoint;
      } else if (mode === "enhance") {
        endpoint = "https://api.imgupscaler.ai/api/image-upscaler/v4/upscale/create-job";
        console.log("[Job] 📋 Building FormData for enhance...");
        const buf = await this.toBuf(image);
        const fname = `${randomBytes(16).toString("hex")}.jpg`;
        fd.append("original_image_file", buf, {
          filename: fname,
          contentType: "image/jpeg"
        });
        console.log("[Job] ✅ Image file:", fname);
        url = endpoint;
      } else if (mode === "unblur") {
        endpoint = "https://api.imgupscaler.ai/api/image-upscaler/v7/unblur/create-job";
        console.log("[Job] 📋 Building FormData for unblur...");
        fd.append("original_image_file", imgs[0] || "");
        console.log("[Job] ✅ Image URL:", imgs[0]?.substring(0, 50) + "...");
        fd.append("output_format", "jpg");
        console.log("[Job] ✅ Format: jpg");
        url = endpoint;
      }
      console.log("[Job] 🌐 Sending request to:", endpoint);
      const headers = mode === "editor" ? {
        ...fd.getHeaders(),
        "product-code": "magiceraser",
        "product-serial": this.serial
      } : {
        ...fd.getHeaders(),
        "product-serial": this.serial,
        timezone: "Asia/Makassar"
      };
      const {
        data
      } = await this.ax.post(url, fd, {
        headers: headers
      });
      console.log("[Job] 📡 Response code:", data?.code);
      console.log("[Job] 📄 Message:", data?.message?.en || data?.message);
      const jid = data?.result?.job_id || "";
      if (jid) {
        console.log("[Job] ✅ Job ID:", jid);
      } else {
        console.log("[Job] ❌ No job ID in response");
        console.log("[Job] 📄 Full response:", JSON.stringify(data, null, 2));
      }
      return jid;
    } catch (e) {
      console.error("[Job] ❌ Error:", e.message);
      if (e.response) {
        console.error("[Job] 📡 Response:", e.response.status, e.response.statusText);
        console.error("[Job] 📄 Data:", JSON.stringify(e.response.data));
      }
      throw e;
    }
  }
  async poll(jid, mode) {
    const max = 60;
    const delay = 3e3;
    const pollUrl = mode === "editor" ? `https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jid}` : `https://api.imgupscaler.ai/api/image-upscaler/v1/universal_upscale/get-job/${jid}`;
    console.log("[Poll] ⏳ Starting poll for job:", jid);
    console.log("[Poll] 🌐 URL:", pollUrl);
    console.log("[Poll] ⚙️ Config: max=" + max + ", delay=" + delay + "ms");
    for (let i = 0; i < max; i++) {
      try {
        const elapsed = (i * delay / 1e3).toFixed(1);
        console.log(`[Poll] 🔄 Attempt ${i + 1}/${max} (${elapsed}s elapsed)`);
        const headers = mode === "editor" ? {} : {
          "product-serial": this.serial
        };
        const {
          data
        } = await this.ax.get(pollUrl, {
          headers: headers
        });
        console.log("[Poll] 📡 Response code:", data?.code);
        const outputs = data?.result?.output_url || [];
        console.log("[Poll] 📊 Outputs:", outputs.length);
        if (outputs.length > 0) {
          console.log("[Poll] ✅ Success! Output URL:", outputs[0].substring(0, 50) + "...");
          console.log("[Poll] 📈 Total time:", elapsed + "s");
          return data.result;
        }
        console.log("[Poll] ⏸️ Not ready, waiting", delay + "ms...");
        await new Promise(r => setTimeout(r, delay));
      } catch (e) {
        console.error(`[Poll] ❌ Attempt ${i + 1} error:`, e.message);
        if (e.response) {
          console.error("[Poll] 📡 Response:", e.response.status, e.response.statusText);
        }
        if (i === max - 1) {
          throw e;
        }
        console.log("[Poll] 🔄 Retrying...");
        await new Promise(r => setTimeout(r, delay));
      }
    }
    const totalTime = (max * delay / 1e3).toFixed(1);
    console.error("[Poll] ⏰ Timeout after", totalTime + "s");
    throw new Error(`Polling timeout after ${totalTime}s`);
  }
  async toBuf(src) {
    try {
      console.log("[Buf] 🔍 Detecting input type...");
      if (Buffer.isBuffer(src)) {
        console.log("[Buf] ✅ Already a buffer:", src.length, "bytes");
        return src;
      }
      if (typeof src === "string" && src.startsWith("data:")) {
        console.log("[Buf] 🔄 Converting from base64 data URI...");
        const b64 = src.split(",")[1] || src;
        const buf = Buffer.from(b64, "base64");
        console.log("[Buf] ✅ Converted:", buf.length, "bytes");
        return buf;
      }
      if (typeof src === "string" && src.startsWith("http")) {
        console.log("[Buf] 🌐 Fetching from URL:", src.substring(0, 50) + "...");
        const {
          data
        } = await this.ax.get(src, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(data);
        console.log("[Buf] ✅ Downloaded:", buf.length, "bytes");
        return buf;
      }
      console.log("[Buf] 🔄 Converting from base64 string...");
      const buf = Buffer.from(src, "base64");
      console.log("[Buf] ✅ Converted:", buf.length, "bytes");
      return buf;
    } catch (e) {
      console.error("[Buf] ❌ Conversion error:", e.message);
      throw new Error(`Buffer conversion failed: ${e.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ImgGen();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}