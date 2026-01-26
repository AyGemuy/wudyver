import axios from "axios";
import {
  randomBytes
} from "crypto";
import FormData from "form-data";
class ImgGen {
  constructor() {
    this.cfg = {
      baseUrl: {
        imgupscaler: "https://api.imgupscaler.ai",
        magiceraser: "https://api.magiceraser.org",
        upload: "https://api.imgupscaler.ai/api/common/upload/upload-image"
      },
      endpoints: {
        editor: "/api/magiceraser/v2/image-editor/create-job",
        gen: "/api/magiceraser/v1/image_generator/create-job",
        upscale: "/api/image-upscaler/v2/enhancer/create-job",
        restore: "/api/image-upscaler/v3/restore/create-uc-job",
        enhance: "/api/image-upscaler/v4/upscale/create-job",
        unblur: "/api/image-upscaler/v7/unblur/create-job",
        colorize: "/api/image-upscaler/v3/restore/create-job",
        hd: "/api/image-upscaler/v2/upscale/create-job",
        hdPro: "/api/image-upscaler/v2/upscale-pro/create-job",
        pollEditor: "/api/magiceraser/v1/ai-remove/get-job",
        pollOthers: "/api/image-upscaler/v1/universal_upscale/get-job"
      },
      models: ["nano_banana", "magiceraser_v1", "flux_kontext", "magiceraser_v3", "magiceraser_v4", "seedream", "seedream45"],
      ratios: {
        editor: ["match_input_image", "1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"],
        gen: ["1:1", "2:3", "3:2", "9:16", "16:9", "3:4", "4:3"]
      },
      modes: ["editor", "gen", "upscale", "restore", "enhance", "unblur", "colorize", "hd", "hdPro"],
      upscalePixels: [2, 4, 6, 8, 16],
      defaults: {
        mode: "editor",
        model: "nano_banana",
        ratio: {
          editor: "match_input_image",
          gen: "1:1"
        },
        targetPixel: 2,
        outputFormat: "jpg"
      }
    };
    this.serial = this.genSerial();
    this.ax = axios.create({
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://imgupscaler.ai",
        referer: "https://imgupscaler.ai/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      }
    });
  }
  genSerial() {
    try {
      console.log("[Serial] Generating serial...");
      const serial = randomBytes(16).toString("hex");
      console.log(`[Serial] Generated: ${serial.substring(0, 8)}...`);
      return serial;
    } catch (error) {
      console.error("[Serial] Error generating serial:", error.message);
      return "default_serial_" + Date.now();
    }
  }
  async generate({
    prompt,
    image,
    model = this.cfg.defaults.model,
    ratio,
    mode = this.cfg.defaults.mode,
    targetPixel = this.cfg.defaults.targetPixel,
    ...rest
  }) {
    console.log("=".repeat(80));
    console.log("[Generate] START PROCESS");
    console.log("[Generate] Parameters:", {
      mode: mode,
      model: model,
      ratio: ratio,
      targetPixel: targetPixel,
      hasImage: !!image,
      hasPrompt: !!prompt
    });
    console.log("=".repeat(80));
    try {
      if (!ratio) {
        ratio = mode === "gen" ? this.cfg.defaults.ratio.gen : this.cfg.defaults.ratio.editor;
        console.log(`[Generate] Auto-set ratio to: ${ratio}`);
      }
      console.log("[Validation] Starting validation...");
      const val = this.validate({
        prompt: prompt,
        model: model,
        ratio: ratio,
        image: image,
        mode: mode,
        targetPixel: targetPixel
      });
      if (!val.success) {
        console.error("[Validation] FAILED:", val.message);
        return {
          success: false,
          message: val.message,
          result: null
        };
      }
      console.log("[Validation] SUCCESS");
      let uploadedUrl = null;
      const needUpload = ["editor", "upscale", "enhance", "unblur", "restore", "colorize", "hd", "hdPro"].includes(mode);
      if (image && needUpload) {
        try {
          console.log("[Upload] Starting upload process...");
          const imgs = await this.up(image);
          if (imgs.length > 0) {
            uploadedUrl = imgs[0];
            console.log(`[Upload] Upload successful, URL: ${uploadedUrl.substring(0, 80)}...`);
          } else {
            console.warn("[Upload] No URLs returned from upload");
          }
        } catch (e) {
          console.error("[Upload] Upload failed:", e.message);
          console.log("[Upload] Will try direct file upload in job creation");
        }
      } else if (!needUpload) {
        console.log("[Upload] No upload needed for this mode");
      }
      console.log("[Job Creation] Creating job...");
      let jid = null;
      let jobAttempts = 0;
      const maxJobAttempts = 2;
      while (!jid && jobAttempts < maxJobAttempts) {
        jobAttempts++;
        console.log(`[Job Creation] Attempt ${jobAttempts}/${maxJobAttempts}`);
        try {
          jid = await this.job({
            prompt: prompt,
            model: model,
            ratio: ratio,
            uploadedUrl: uploadedUrl,
            mode: mode,
            targetPixel: targetPixel,
            image: image
          });
          if (!jid && jobAttempts === 1 && image && !uploadedUrl && needUpload) {
            console.log("[Job Creation] First attempt failed, trying with upload...");
            const imgs = await this.up(image);
            if (imgs.length > 0) {
              uploadedUrl = imgs[0];
              console.log(`[Upload] Upload successful on retry: ${uploadedUrl.substring(0, 80)}...`);
            }
          }
        } catch (e) {
          console.error(`[Job Creation] Attempt ${jobAttempts} failed:`, e.message);
        }
      }
      if (!jid) {
        console.error("[Job Creation] All attempts failed");
        return {
          success: false,
          message: "Failed to create job after all attempts",
          result: null
        };
      }
      console.log(`[Job Creation] SUCCESS - Job ID: ${jid}`);
      console.log("[Polling] Starting polling process...");
      let pollResult = null;
      try {
        pollResult = await this.poll(jid, mode);
        console.log("[Polling] SUCCESS");
      } catch (e) {
        console.error("[Polling] FAILED:", e.message);
        return {
          success: false,
          message: `Polling failed: ${e.message}`,
          job_id: jid,
          result: null
        };
      }
      const finalUrl = pollResult?.output_url?.[0] || null;
      console.log(`[Final Result] ${finalUrl ? "URL obtained" : "No URL in result"}`);
      if (finalUrl) {
        console.log(`[Final Result] URL: ${finalUrl.substring(0, 100)}...`);
      }
      console.log("=".repeat(80));
      console.log("[Generate] PROCESS COMPLETE");
      console.log("=".repeat(80));
      return {
        success: true,
        message: "Generation completed",
        result: finalUrl,
        job_id: jid,
        poll_data: pollResult
      };
    } catch (e) {
      console.error("[Generate] UNEXPECTED ERROR:", e.message);
      console.error("[Generate] Stack trace:", e.stack);
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
      console.log("[Validation] Validating parameters...");
      if (!this.cfg.modes.includes(mode)) {
        console.error(`[Validation] Invalid mode: ${mode}`);
        return {
          success: false,
          message: `Invalid mode. Available: ${this.cfg.modes.join(", ")}`
        };
      }
      if (["editor", "gen"].includes(mode)) {
        console.log(`[Validation] Validating ${mode} mode...`);
        if (!prompt?.trim()) {
          console.error("[Validation] Prompt is required");
          return {
            success: false,
            message: `Prompt required for ${mode} mode`
          };
        }
        if (!this.cfg.models.includes(model)) {
          console.error(`[Validation] Invalid model: ${model}`);
          return {
            success: false,
            message: `Invalid model. Available: ${this.cfg.models.join(", ")}`
          };
        }
        const validRatios = mode === "gen" ? this.cfg.ratios.gen : this.cfg.ratios.editor;
        if (!validRatios.includes(ratio)) {
          console.error(`[Validation] Invalid ratio: ${ratio}`);
          return {
            success: false,
            message: `Invalid ratio for ${mode}. Available: ${validRatios.join(", ")}`
          };
        }
        console.log(`[Validation] ${mode} mode validation passed`);
      }
      if (["editor", "upscale", "restore", "enhance", "unblur", "colorize", "hd", "hdPro"].includes(mode) && mode !== "gen") {
        console.log(`[Validation] Checking image for ${mode} mode...`);
        if (!image) {
          console.error("[Validation] Image is required");
          return {
            success: false,
            message: `Image required for ${mode} mode`
          };
        }
        console.log("[Validation] Image check passed");
      }
      if (mode === "upscale") {
        console.log("[Validation] Validating upscale parameters...");
        if (!this.cfg.upscalePixels.includes(targetPixel)) {
          console.error(`[Validation] Invalid targetPixel: ${targetPixel}`);
          return {
            success: false,
            message: `Invalid targetPixel. Available: ${this.cfg.upscalePixels.join(", ")}`
          };
        }
        console.log("[Validation] Upscale validation passed");
      }
      console.log("[Validation] All validations passed");
      return {
        success: true
      };
    } catch (error) {
      console.error("[Validation] Error during validation:", error.message);
      return {
        success: false,
        message: `Validation error: ${error.message}`
      };
    }
  }
  async up(img) {
    console.log("[Upload] START upload process");
    const arr = Array.isArray(img) ? img : [img];
    const urls = [];
    for (let idx = 0; idx < arr.length; idx++) {
      const i = arr[idx];
      console.log(`[Upload] Processing item ${idx + 1}/${arr.length}`);
      try {
        console.log("[Upload] Converting to buffer...");
        const buf = await this.toBuf(i);
        console.log(`[Upload] Buffer size: ${buf.length} bytes`);
        const fname = `${randomBytes(16).toString("hex")}.jpg`;
        console.log(`[Upload] Generated filename: ${fname}`);
        console.log("[Upload] Step 1: Requesting upload URL from API...");
        const fd1 = new FormData();
        fd1.append("file_name", fname);
        console.log("[Upload] Sending POST to upload endpoint...");
        const uploadResponse = await this.ax.post(this.cfg.baseUrl.upload, fd1, {
          headers: {
            ...fd1.getHeaders(),
            priority: "u=1, i"
          }
        });
        console.log("[Upload] Upload response received:", {
          status: uploadResponse.status,
          code: uploadResponse.data?.code
        });
        const uploadUrl = uploadResponse.data?.result?.url || "";
        const objectName = uploadResponse.data?.result?.object_name || "";
        if (!uploadUrl) {
          console.error("[Upload] No upload URL in response");
          console.error("[Upload] Response data:", JSON.stringify(uploadResponse.data, null, 2));
          continue;
        }
        console.log(`[Upload] Upload URL obtained: ${uploadUrl.substring(0, 100)}...`);
        console.log(`[Upload] Object name: ${objectName}`);
        console.log("[Upload] Step 2: Uploading to OSS...");
        const ossHeaders = {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Length": buf.length,
          Origin: "https://imgupscaler.ai",
          Pragma: "no-cache",
          Referer: "https://imgupscaler.ai/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "content-type": "image/jpeg",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        };
        console.log("[Upload] Sending PUT to OSS...");
        const ossResponse = await axios.put(uploadUrl, buf, {
          headers: ossHeaders
        });
        console.log(`[Upload] OSS upload response status: ${ossResponse.status}`);
        console.log("[Upload] Step 3: Converting to CDN URL...");
        const cdnUrl = `https://cdn.imgupscaler.ai/${objectName}`;
        urls.push(cdnUrl);
        console.log(`[Upload] SUCCESS - CDN URL: ${cdnUrl}`);
        console.log(`[Upload] Item ${idx + 1} completed successfully`);
      } catch (e) {
        console.error(`[Upload] ERROR processing item ${idx + 1}:`, e.message);
        if (e.response) {
          console.error(`[Upload] Response status: ${e.response.status}`);
          console.error(`[Upload] Response data:`, JSON.stringify(e.response.data, null, 2));
        }
        console.error(`[Upload] Stack trace:`, e.stack);
      }
    }
    console.log(`[Upload] COMPLETE - ${urls.length} URL(s) generated`);
    return urls;
  }
  async job({
    prompt,
    model,
    ratio,
    uploadedUrl,
    mode,
    targetPixel,
    image
  }) {
    console.log("[Job Creation] START job creation");
    console.log(`[Job Creation] Mode: ${mode}, Model: ${model}, Ratio: ${ratio}`);
    const fd = new FormData();
    let url, base;
    const baseHeaders = {
      "product-serial": this.serial,
      timezone: "Asia/Makassar",
      priority: "u=1, i"
    };
    try {
      if (mode === "editor" || mode === "gen") {
        console.log("[Job Creation] Editor/Gen mode detected");
        base = mode === "editor" ? this.cfg.baseUrl.magiceraser : this.cfg.baseUrl.magiceraser;
        url = base + (mode === "gen" ? this.cfg.endpoints.gen : this.cfg.endpoints.editor);
        console.log(`[Job Creation] Endpoint: ${url}`);
        fd.append("model_name", model);
        if (mode === "editor") {
          console.log("[Job Creation] Editor mode specific setup");
          if (uploadedUrl) {
            console.log(`[Job Creation] Using uploaded URL: ${uploadedUrl.substring(0, 80)}...`);
            fd.append("original_image_url", uploadedUrl);
          } else if (image) {
            console.log("[Job Creation] No uploaded URL, attempting direct upload");
            const imgs = await this.up(image);
            if (imgs.length > 0) {
              fd.append("original_image_url", imgs[0]);
              console.log(`[Job Creation] Uploaded and using URL: ${imgs[0].substring(0, 80)}...`);
            } else {
              throw new Error("Failed to upload image for editor mode");
            }
          }
        }
        fd.append("prompt", prompt);
        fd.append("ratio", ratio);
        fd.append("output_format", this.cfg.defaults.outputFormat);
        console.log("[Job Creation] Form data prepared:", {
          model_name: model,
          has_original_image_url: !!uploadedUrl,
          prompt_length: prompt?.length,
          ratio: ratio,
          output_format: this.cfg.defaults.outputFormat
        });
      } else if (mode === "upscale") {
        console.log("[Job Creation] Upscale mode detected");
        base = this.cfg.baseUrl.imgupscaler;
        url = base + this.cfg.endpoints.upscale;
        console.log(`[Job Creation] Endpoint: ${url}`);
        fd.append("target_pixel", targetPixel.toString());
        if (uploadedUrl) {
          console.log("[Job Creation] Converting OSS URL to CDN URL for upscale");
          const cdnUrl = uploadedUrl.replace(/https:\/\/pai-data-[^\/]+\/(.+)/, "https://cdn.imgupscaler.ai/$1");
          fd.append("original_image_file", cdnUrl);
          console.log(`[Job Creation] Using CDN URL: ${cdnUrl.substring(0, 80)}...`);
        } else if (image) {
          console.log("[Job Creation] Using direct file upload");
          const buf = await this.toBuf(image);
          const fname = `${randomBytes(16).toString("hex")}.jpg`;
          fd.append("original_image_file", buf, {
            filename: fname,
            contentType: "image/jpeg"
          });
          console.log(`[Job Creation] Direct file attached: ${fname}`);
        }
        fd.append("output_format", this.cfg.defaults.outputFormat);
        console.log("[Job Creation] Form data prepared:", {
          target_pixel: targetPixel,
          has_original_image_file: true,
          output_format: this.cfg.defaults.outputFormat
        });
      } else if (mode === "unblur") {
        console.log("[Job Creation] Unblur mode detected");
        base = this.cfg.baseUrl.imgupscaler;
        url = base + this.cfg.endpoints.unblur;
        console.log(`[Job Creation] Endpoint: ${url}`);
        if (uploadedUrl) {
          console.log("[Job Creation] Using OSS URL directly for unblur");
          const ossUrl = uploadedUrl.replace("https://cdn.imgupscaler.ai/", "https://pai-data-5f568.oss-us-west-1.aliyuncs.com/");
          fd.append("original_image_file", ossUrl);
          console.log(`[Job Creation] Using OSS URL: ${ossUrl.substring(0, 80)}...`);
        } else if (image) {
          console.log("[Job Creation] Using direct file upload");
          const buf = await this.toBuf(image);
          const fname = `${randomBytes(16).toString("hex")}.jpg`;
          fd.append("original_image_file", buf, {
            filename: fname,
            contentType: "image/jpeg"
          });
          console.log(`[Job Creation] Direct file attached: ${fname}`);
        }
        fd.append("output_format", this.cfg.defaults.outputFormat);
        console.log("[Job Creation] Form data prepared:", {
          has_original_image_file: true,
          output_format: this.cfg.defaults.outputFormat
        });
      } else {
        console.log(`[Job Creation] ${mode} mode detected`);
        base = this.cfg.baseUrl.imgupscaler;
        const endpointMap = {
          restore: this.cfg.endpoints.restore,
          enhance: this.cfg.endpoints.enhance,
          colorize: this.cfg.endpoints.colorize,
          hd: this.cfg.endpoints.hd,
          hdPro: this.cfg.endpoints.hdPro
        };
        url = base + endpointMap[mode];
        console.log(`[Job Creation] Endpoint: ${url}`);
        if (uploadedUrl) {
          console.log(`[Job Creation] Using uploaded URL for ${mode}`);
          fd.append("original_image_file", uploadedUrl);
          console.log(`[Job Creation] Using URL: ${uploadedUrl.substring(0, 80)}...`);
        } else if (image) {
          console.log(`[Job Creation] Using direct file for ${mode}`);
          const buf = await this.toBuf(image);
          const fname = `${randomBytes(16).toString("hex")}.jpg`;
          fd.append("original_image_file", buf, {
            filename: fname,
            contentType: "image/jpeg"
          });
          console.log(`[Job Creation] Direct file attached: ${fname}`);
        }
        console.log("[Job Creation] Form data prepared:", {
          has_original_image_file: true,
          output_format: this.cfg.defaults.outputFormat
        });
      }
      let headers;
      if (mode === "editor" || mode === "gen") {
        headers = {
          ...fd.getHeaders(),
          "product-code": "magiceraser",
          "product-serial": this.serial,
          authorization: "",
          priority: "u=1, i"
        };
      } else {
        headers = {
          ...fd.getHeaders(),
          ...baseHeaders,
          authorization: ""
        };
      }
      console.log("[Job Creation] Sending POST request...");
      console.log("[Job Creation] Headers:", Object.keys(headers));
      console.log("[Job Creation] URL:", url);
      const startTime = Date.now();
      const {
        data
      } = await this.ax.post(url, fd, {
        headers: headers
      });
      const endTime = Date.now();
      console.log(`[Job Creation] Request completed in ${endTime - startTime}ms`);
      console.log("[Job Creation] Response status: OK");
      console.log("[Job Creation] Response data:", JSON.stringify(data, null, 2));
      if (data?.code !== 1e5) {
        console.error(`[Job Creation] API Error code: ${data?.code}`);
        console.error(`[Job Creation] Message:`, data?.message);
        return "";
      }
      const jobId = data?.result?.job_id || "";
      console.log(`[Job Creation] SUCCESS - Job ID: ${jobId}`);
      return jobId;
    } catch (e) {
      console.error("[Job Creation] ERROR:", e.message);
      if (e.response) {
        console.error(`[Job Creation] Response status: ${e.response.status}`);
        console.error("[Job Creation] Response headers:", e.response.headers);
        console.error("[Job Creation] Response data:", JSON.stringify(e.response.data, null, 2));
      }
      console.error("[Job Creation] Stack trace:", e.stack);
      return "";
    }
  }
  async poll(jid, mode) {
    console.log("[Polling] START polling process");
    console.log(`[Polling] Job ID: ${jid}, Mode: ${mode}`);
    const max = 60;
    const delay = 3e3;
    const base = mode === "editor" || mode === "gen" ? this.cfg.baseUrl.magiceraser : this.cfg.baseUrl.imgupscaler;
    const endpoint = mode === "editor" || mode === "gen" ? this.cfg.endpoints.pollEditor : this.cfg.endpoints.pollOthers;
    const pollUrl = `${base}${endpoint}/${jid}`;
    console.log(`[Polling] Poll URL: ${pollUrl}`);
    console.log(`[Polling] Max attempts: ${max}, Delay: ${delay}ms`);
    for (let i = 0; i < max; i++) {
      console.log(`[Polling] Attempt ${i + 1}/${max}`);
      try {
        const headers = mode === "editor" || mode === "gen" ? {
          "product-code": "magiceraser",
          "product-serial": this.serial
        } : {
          "product-serial": this.serial
        };
        console.log("[Polling] Sending GET request...");
        const startTime = Date.now();
        const {
          data
        } = await this.ax.get(pollUrl, {
          headers: headers
        });
        const endTime = Date.now();
        console.log(`[Polling] Request completed in ${endTime - startTime}ms`);
        console.log("[Polling] Response code:", data?.code);
        const outputs = data?.result?.output_url || [];
        console.log(`[Polling] Output URLs found: ${outputs.length}`);
        if (outputs.length > 0) {
          console.log(`[Polling] SUCCESS - Found ${outputs.length} output(s)`);
          console.log("[Polling] First output URL:", outputs[0]?.substring(0, 100) + "...");
          console.log("[Polling] Complete result:", JSON.stringify(data.result, null, 2));
          return data.result;
        }
        const statusMessage = data?.result?.status_message || "Unknown status";
        console.log(`[Polling] Still processing: ${statusMessage}`);
        if (i % 5 === 0) {
          console.log(`[Polling] Progress: ${i + 1}/${max} attempts, waiting ${delay}ms...`);
        }
        await new Promise(r => setTimeout(r, delay));
      } catch (e) {
        console.error(`[Polling] ERROR attempt ${i + 1}:`, e.message);
        if (e.response) {
          console.error(`[Polling] Response status: ${e.response.status}`);
          console.error("[Polling] Response data:", JSON.stringify(e.response.data, null, 2));
        }
        if (i === max - 1) {
          console.error("[Polling] Max attempts reached, throwing error");
          throw e;
        }
        console.log(`[Polling] Retrying after ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    const errorMsg = `Polling timeout after ${max} attempts`;
    console.error(`[Polling] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  async toBuf(src) {
    console.log("[Buffer] Converting source to buffer...");
    try {
      if (Buffer.isBuffer(src)) {
        console.log("[Buffer] Source is already a buffer");
        return src;
      }
      if (typeof src === "string") {
        if (src.startsWith("data:")) {
          console.log("[Buffer] Source is data URL");
          const b64 = src.split(",")[1] || src;
          const buffer = Buffer.from(b64, "base64");
          console.log(`[Buffer] Converted data URL to buffer, size: ${buffer.length} bytes`);
          return buffer;
        }
        if (src.startsWith("http")) {
          console.log(`[Buffer] Source is HTTP URL: ${src}`);
          const {
            data
          } = await axios.get(src, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          const buffer = Buffer.from(data);
          console.log(`[Buffer] Downloaded from URL, size: ${buffer.length} bytes`);
          return buffer;
        }
        console.log("[Buffer] Source is base64 string");
        const buffer = Buffer.from(src, "base64");
        console.log(`[Buffer] Converted base64 to buffer, size: ${buffer.length} bytes`);
        return buffer;
      }
      console.warn("[Buffer] Unknown source type, trying to convert...");
      return Buffer.from(src, "base64");
    } catch (error) {
      console.error("[Buffer] ERROR converting to buffer:", error.message);
      throw error;
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