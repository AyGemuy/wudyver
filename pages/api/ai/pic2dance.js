import axios from "axios";
import FormData from "form-data";
class AIVideoGen {
  constructor() {
    this.cfg = {
      seaart: {
        base: "https://www.seaart.ai/api",
        token: "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzZWEtYXJ0IiwiYXVkIjpbImxvZ2luIl0sImV4cCI6MTc3MjQyNjYzMCwiaWF0IjoxNzY3MjQyNjMwLCJqdGkiOiI5MzIxMDM2OTM1MTIzNjYxMyIsInBheWxvYWQiOnsiaWQiOiJjZjE2OGFmYTQyMDY4MTQyOGUxNWI1Y2MxMmRkOWJjYSIsImVtYWlsIjoic2Fua2V0LmR1ZGhhdC5iZWV0b256Ljc3ODdAZ21haWwuY29tIiwiY3JlYXRlX2F0IjoxNzM4OTI0MzQ5MzI4LCJ0b2tlbl9zdGF0dXMiOjEsInN0YXR1cyI6MSwiaXNzIjoiIn19.gWdLQnTzjYVn8ITdv-EVs9H3V8DARsqP4rITu2pglpROFkoVtcysfsiccfZ0BU-97nGEvjtooU0DvAjpm-lYFlPhEqPEIB1x9vY5L9Q6_i-9uwPVIckUOcLKvw93NaLof1C6yDilfvbfu6V_kBb_xsv14uhcng6maUznvZ7OqYam3Sm2iXrEtLfYfHg5CSWW59sBuRdIXFDeq-x7TRPXNllqaB_0pgOOnSqciCPqnU-L6XgU-jnIAlMJUfdICgrnEIts4l235k1sWZep-H_wUiAkGzX6y45h0-8YpJuHMRuqIb03x8nxsEezw7ZZVzn5_moEzGJ7pfTKLCiWx6C1XQ",
        endpoints: {
          upload: "/v1/resource/uploadImageByPreSign",
          confirm: "/v1/resource/confirmImageUploadedByPreSign",
          apply: "/v1/creativity/generate/apply",
          progress: "/v1/task/batch-progress",
          template: "/v1/task/v2/video/img-to-video"
        }
      },
      vidu: {
        base: "https://api.vidu.com/ent/v2",
        token: "vda_2718571982051103_MsNbeaepL5p7ka8inYTEwN4SybqezR8i",
        endpoints: {
          template: "/template",
          tasks: "/tasks"
        }
      },
      dezgo: {
        base: "https://api.dezgo.com",
        key: "DEZGO-2E00B88300A59430213DCC68E718B49B2542BF4C3A04005D4E3D94B891A605C578F07977",
        endpoint: "/text-inpainting"
      },
      lightx: {
        base: "https://www.instagraphe.mobi/andor-media-1.0",
        token: "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhbmRvci5jb20iLCJpYXQiOiIxNzYzNTQ2NDc5NDM4IiwiZXhwIjoiMjU5MjAwMDAwMCIsInN5c1JlZktleSI6IjM0MmM0M2U2MWYyMDQ5MTU4MTMyZmYwZGYyYzE2Njc3IiwiY2hhbm5lbElkIjoiIiwiY2hhbm5lbCI6Ijc4ZTc4NDFkOWYxODkxY2VkNWIyNjBjNDU1ZWE5OWYzIiwiYXBpVmVyc2lvbiI6IjAuMSIsImp0aSI6Im9hLWFiMTA4MmNhLTE2MDMtNDkwMC05Nzk0LWY1OTkyY2Y5ODczYSJ9.tHplip3GuC56gFM2tuM04OB8q15fqZcpPwWGcFVnhq4",
        hash: "fb194c698ecca6bc73d649c3fabee629cfe0e2ccc9805ef5a91b0374e52fe4969cd62e2b9abe8bb3d55738914fedcd50ffbe225740ae84c9e2b1aa5081c511fc"
      },
      upload: {
        uguu: "https://uguu.se/upload.php",
        tmpfiles: "https://tmpfiles.org/api/v1/upload"
      }
    };
    this.templates = {
      seaart: {
        applyId: ["d2s1e6de878c739jahg0", "d3kdpple878c73epvvgg", "d3mur7de878c73cia350", "d474e2de878c7397k11g", "d3iv7rte878c73b91hd0", "d3katkde878c73dmidm0", "d3g6795e878c739laqgg", "d3joqste878c73fovrbg", "d46utlle878c73c97p6g", "d4679vte878c73ccg2lg", "d4aagate878c738s94jg", "d40vhj5e878c73al7rq0", "d4oj6hle878c738svr90", "d40sp1te878c73d7gbc0", "d3o2j2le878c73b7baeg"],
        templateId: ["d1364vle878c73dstcq0", "d3sqqbde878c738ci5pg", "d24s5hte878c73afki60", "d2rb00te878c73d3rbe0", "d29cgste878c73fueb50", "d2h906le878c739jmg00", "d42962te878c73d1ucn0", "d399qdde878c73blvf60", "d3muk0le878c73aaajtg"]
      },
      vidu: {
        validTemplates: ["fishermen", "hair_color_change", "minecraft"]
      },
      dezgo: {
        models: ["realistic_vision_5_1_inpaint"],
        samplers: ["dpmpp_2m_karras", "euler_a", "ddim"]
      },
      lightx: {
        featureTypes: ["photoshoot", "portrait", "headshot"],
        models: [1, 2]
      }
    };
  }
  validateTemplate({
    provider,
    applyId,
    templateId,
    template,
    model,
    sampler,
    featureType
  }) {
    console.log(`🔍 Validating template for provider: ${provider}`);
    switch (provider) {
      case "seaart":
        if (applyId) {
          if (!this.templates.seaart.applyId.includes(applyId)) {
            throw new Error(`❌ Invalid applyId: ${applyId}. Must be one of: ${this.templates.seaart.applyId.join(", ")}`);
          }
          console.log(`✅ Valid applyId: ${applyId}`);
          return {
            valid: true,
            type: "applyId",
            value: applyId
          };
        }
        if (templateId) {
          if (!this.templates.seaart.templateId.includes(templateId)) {
            throw new Error(`❌ Invalid templateId: ${templateId}. Must be one of: ${this.templates.seaart.templateId.join(", ")}`);
          }
          console.log(`✅ Valid templateId: ${templateId}`);
          return {
            valid: true,
            type: "templateId",
            value: templateId
          };
        }
        throw new Error("❌ SeaArt requires either applyId or templateId");
      case "vidu":
        if (!template) {
          throw new Error("❌ Vidu requires template parameter");
        }
        if (!this.templates.vidu.validTemplates.includes(template)) {
          throw new Error(`❌ Invalid template: ${template}. Must be one of: ${this.templates.vidu.validTemplates.join(", ")}`);
        }
        console.log(`✅ Valid Vidu template: ${template}`);
        return {
          valid: true,
            type: "template",
            value: template
        };
      case "dezgo":
        if (model && !this.templates.dezgo.models.includes(model)) {
          throw new Error(`❌ Invalid model: ${model}. Must be one of: ${this.templates.dezgo.models.join(", ")}`);
        }
        if (sampler && !this.templates.dezgo.samplers.includes(sampler)) {
          throw new Error(`❌ Invalid sampler: ${sampler}. Must be one of: ${this.templates.dezgo.samplers.join(", ")}`);
        }
        console.log(`✅ Valid Dezgo config`);
        return {
          valid: true,
            type: "config",
            model: model,
            sampler: sampler
        };
      case "lightx":
        if (featureType && !this.templates.lightx.featureTypes.includes(featureType)) {
          throw new Error(`❌ Invalid featureType: ${featureType}. Must be one of: ${this.templates.lightx.featureTypes.join(", ")}`);
        }
        if (model && !this.templates.lightx.models.includes(model)) {
          throw new Error(`❌ Invalid model: ${model}. Must be one of: ${this.templates.lightx.models.join(", ")}`);
        }
        console.log(`✅ Valid LightX config`);
        return {
          valid: true,
            type: "config",
            featureType: featureType,
            model: model
        };
      default:
        throw new Error(`❌ Unknown provider: ${provider}`);
    }
  }
  async generate({
    provider = "seaart",
    prompt,
    image,
    ...rest
  }) {
    console.log(`ℹ️ [${provider}] Starting generation...`);
    try {
      this.validateTemplate({
        provider: provider,
        ...rest
      });
      const img = await this.solveMedia(image);
      console.log(`✅ Media resolved: ${img?.substring(0, 50)}...`);
      const genFn = this[`${provider}Gen`];
      if (!genFn) throw new Error(`Provider "${provider}" not found`);
      const result = await genFn.call(this, {
        prompt: prompt,
        img: img,
        ...rest
      });
      console.log(`✅ [${provider}] Task created successfully`);
      return result;
    } catch (e) {
      console.log(`❌ [${provider}] Generation failed: ${e.message}`);
      throw e;
    }
  }
  async status({
    provider,
    task_id,
    ...rest
  }) {
    console.log(`ℹ️ [${provider}] Checking status for task: ${task_id}`);
    try {
      const statusFn = this[`${provider}Status`];
      if (!statusFn) throw new Error(`Status check for provider "${provider}" not found`);
      const result = await statusFn.call(this, task_id, rest);
      console.log(`✅ [${provider}] Status check completed`);
      return result;
    } catch (e) {
      console.log(`❌ [${provider}] Status check failed: ${e.message}`);
      throw e;
    }
  }
  async solveMedia(media) {
    console.log("⚙️ Solving media input...");
    try {
      if (!media) throw new Error("Media is required");
      if (/^https?:\/\//.test(media)) {
        console.log("ℹ️ Media type: URL");
        return media;
      }
      if (/^data:/.test(media) || media.length > 500) {
        console.log("⚙️ Media type: Base64, uploading...");
        return await this.uploadB64(media);
      }
      console.log("⚙️ Media type: Buffer, uploading...");
      return await this.uploadBuf(media);
    } catch (e) {
      console.log(`❌ Media solve failed: ${e.message}`);
      throw e;
    }
  }
  async uploadB64(b64) {
    try {
      const base64Data = b64.split(",")[1] || b64;
      const buf = Buffer.from(base64Data, "base64");
      console.log(`ℹ️ Base64 decoded, size: ${buf.length} bytes`);
      return await this.uploadBuf(buf);
    } catch (e) {
      console.log(`❌ Base64 upload failed: ${e.message}`);
      throw e;
    }
  }
  async uploadBuf(buf) {
    try {
      console.log("⚙️ Uploading to uguu.se...");
      const form = new FormData();
      form.append("files[]", buf, {
        filename: `img_${Date.now()}.jpg`,
        contentType: "image/jpeg"
      });
      const {
        data
      } = await axios.post(this.cfg.upload.uguu, form, {
        headers: {
          ...form.getHeaders(),
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        timeout: 6e4
      });
      const url = data?.files?.[0]?.url || data?.url;
      if (!url) throw new Error("No URL in response");
      console.log(`✅ Uploaded to uguu: ${url}`);
      return url;
    } catch (e) {
      console.log(`⚠️ Uguu failed: ${e.message}, trying tmpfiles...`);
      try {
        const form = new FormData();
        form.append("file", buf, {
          filename: `img_${Date.now()}.jpg`,
          contentType: "image/jpeg"
        });
        const {
          data
        } = await axios.post(this.cfg.upload.tmpfiles, form, {
          headers: form.getHeaders(),
          timeout: 6e4
        });
        const url = data?.data?.url;
        if (!url) throw new Error("No URL in tmpfiles response");
        console.log(`✅ Uploaded to tmpfiles: ${url}`);
        return url;
      } catch (e2) {
        console.log(`❌ All uploads failed: ${e2.message}`);
        throw new Error("Upload failed on all providers");
      }
    }
  }
  async seaartGen({
    prompt,
    img,
    applyId,
    templateId
  }) {
    const c = this.cfg.seaart;
    const hdrs = {
      Token: c.token,
      "Content-Type": "application/json"
    };
    try {
      let imgUrl = img;
      if (!/seaart\.ai/.test(img)) {
        console.log("⚙️ Uploading image to SeaArt...");
        imgUrl = await this.seaUpload(img);
        console.log(`✅ SeaArt image URL: ${imgUrl}`);
      }
      console.log("⚙️ Creating SeaArt task...");
      const taskId = applyId ? await this.seaApply(applyId, imgUrl, hdrs) : await this.seaTpl(templateId, imgUrl, prompt, hdrs);
      console.log(`✅ Task created: ${taskId}`);
      return {
        provider: "seaart",
        task_id: taskId,
        status: "pending",
        message: "Task created successfully. Use status() to check progress."
      };
    } catch (e) {
      console.log(`❌ SeaArt generation error: ${e.message}`);
      throw e;
    }
  }
  async seaartStatus(task_id) {
    const c = this.cfg.seaart;
    const hdrs = {
      Token: c.token,
      "Content-Type": "application/json"
    };
    try {
      const {
        data
      } = await axios.post(`${c.base}${c.endpoints.progress}`, {
        task_ids: [task_id],
        ss: 52
      }, {
        headers: hdrs,
        timeout: 6e4
      });
      const item = data?.data?.items?.[0];
      const status = item?.status_desc;
      const progress = item?.process || 0;
      console.log(`⚙️ Progress: ${progress}% - Status: ${status}`);
      if (status === "finish") {
        const url = item?.img_uris?.[0]?.url;
        return {
          status: "completed",
          progress: 100,
          result_url: url,
          message: "Generation completed successfully"
        };
      }
      if (status === "failed") {
        return {
          status: "failed",
          progress: progress,
          message: "Task failed"
        };
      }
      return {
        status: "processing",
        progress: progress,
        message: `Task is processing... ${progress}%`
      };
    } catch (e) {
      console.log(`❌ SeaArt status check failed: ${e.message}`);
      throw e;
    }
  }
  async seaUpload(img) {
    const c = this.cfg.seaart;
    try {
      const name = `img_${Date.now()}.jpg`;
      console.log("⚙️ Fetching image data...");
      const imgData = /^https?:/.test(img) ? (await axios.get(img, {
        responseType: "arraybuffer",
        timeout: 6e4
      })).data : img;
      const actualSize = Buffer.byteLength(imgData);
      console.log(`ℹ️ Actual image size: ${actualSize} bytes`);
      console.log("⚙️ Getting SeaArt presigned URL...");
      const {
        data: d1
      } = await axios.post(`${c.base}${c.endpoints.upload}`, {
        content_type: "image/jpeg",
        file_name: name,
        file_size: actualSize,
        category: 20,
        hash_val: this.randHex(64)
      }, {
        headers: {
          Token: c.token,
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      const fileId = d1?.data?.file_id;
      const preSign = d1?.data?.pre_sign;
      if (!fileId || !preSign) {
        throw new Error("No presigned URL received");
      }
      console.log(`✅ Presigned URL obtained for fileId: ${fileId}`);
      console.log("⚙️ Uploading to presigned URL...");
      await axios.put(preSign, imgData, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": actualSize
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 6e4
      });
      console.log("✅ Image uploaded to S3");
      console.log("⚙️ Confirming upload...");
      const {
        data: d2
      } = await axios.post(`${c.base}${c.endpoints.confirm}`, {
        category: 20,
        file_id: fileId
      }, {
        headers: {
          Token: c.token,
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      const url = d2?.data?.url;
      if (!url) throw new Error("No URL after confirmation");
      console.log("✅ Upload confirmed successfully");
      return url;
    } catch (e) {
      console.log(`❌ SeaArt upload failed: ${e.message}`);
      throw e;
    }
  }
  async seaApply(applyId, imgUrl, hdrs) {
    try {
      console.log(`⚙️ Applying template: ${applyId}`);
      const c = this.cfg.seaart;
      const {
        data
      } = await axios.post(`${c.base}${c.endpoints.apply}`, {
        apply_id: applyId,
        inputs: [{
          field: "image",
          node_id: "94",
          node_type: "LoadImage",
          val: imgUrl
        }]
      }, {
        headers: hdrs,
        timeout: 6e4
      });
      const taskId = data?.data?.id;
      if (!taskId) throw new Error("No task ID received");
      return taskId;
    } catch (e) {
      console.log(`❌ SeaArt apply failed: ${e.message}`);
      throw e;
    }
  }
  async seaTpl(templateId, imgUrl, prompt, hdrs) {
    try {
      console.log(`⚙️ Using template: ${templateId}`);
      const c = this.cfg.seaart;
      const {
        data
      } = await axios.post(`${c.base}${c.endpoints.template}`, {
        template_id: templateId,
        meta: {
          prompt: prompt || "",
          generate_video: {
            image_opts: [{
              mode: "image",
              url: imgUrl
            }]
          },
          generate: {
            anime_enhance: 2,
            mode: 0,
            gen_mode: 0,
            prompt_magic_mode: 2
          },
          task_from: "web"
        },
        model_no: "",
        model_ver_no: ""
      }, {
        headers: hdrs,
        timeout: 6e4
      });
      const taskId = data?.data?.id;
      if (!taskId) throw new Error("No task ID received");
      return taskId;
    } catch (e) {
      console.log(`❌ SeaArt template failed: ${e.message}`);
      throw e;
    }
  }
  async viduGen({
    prompt,
    img,
    template
  }) {
    const c = this.cfg.vidu;
    const hdrs = {
      Authorization: `Token ${c.token}`,
      "Content-Type": "application/json"
    };
    try {
      console.log("⚙️ Creating Vidu task...");
      const {
        data: d1
      } = await axios.post(`${c.base}${c.endpoints.template}`, {
        template: template || "minecraft",
        images: [img],
        prompt: prompt || "",
        seed: "0"
      }, {
        headers: hdrs,
        timeout: 6e4
      });
      const taskId = d1?.task_id;
      if (!taskId) throw new Error("No task ID received");
      console.log(`✅ Vidu task created: ${taskId}`);
      return {
        provider: "vidu",
        task_id: taskId,
        status: "pending",
        message: "Task created successfully. Use status() to check progress."
      };
    } catch (e) {
      console.log(`❌ Vidu generation failed: ${e.message}`);
      throw e;
    }
  }
  async viduStatus(task_id) {
    const c = this.cfg.vidu;
    const hdrs = {
      Authorization: `Token ${c.token}`,
      "Content-Type": "application/json"
    };
    try {
      const {
        data
      } = await axios.get(`${c.base}${c.endpoints.tasks}/${task_id}/creations`, {
        headers: hdrs,
        timeout: 6e4
      });
      const state = data?.state;
      console.log(`⚙️ Vidu status: ${state}`);
      if (state === "success") {
        const url = data?.creations?.[0]?.url;
        return {
          status: "completed",
          result_url: url,
          message: "Generation completed successfully"
        };
      }
      if (state === "failed") {
        return {
          status: "failed",
          message: "Task failed"
        };
      }
      return {
        status: "processing",
        message: "Task is processing..."
      };
    } catch (e) {
      console.log(`❌ Vidu status check failed: ${e.message}`);
      throw e;
    }
  }
  async lightxGen({
    prompt,
    img,
    featureType = "photoshoot",
    model = 1
  }) {
    const c = this.cfg.lightx;
    try {
      console.log("⚙️ Using existing image URL for LightX...");
      const imgUrl = /^https?:/.test(img) ? img : await this.uploadBuf(img);
      console.log("⚙️ Creating LightX task...");
      const assetId = await this.lxGen(imgUrl, prompt, featureType, model);
      console.log(`✅ LightX task created: ${assetId}`);
      return {
        provider: "lightx",
        task_id: assetId,
        status: "pending",
        message: "Task created successfully. Use status() to check progress."
      };
    } catch (e) {
      console.log(`❌ LightX generation failed: ${e.message}`);
      throw e;
    }
  }
  async lightxStatus(task_id) {
    const c = this.cfg.lightx;
    try {
      const {
        data
      } = await axios.post(`${c.base}/aiart/checkStatus`, {
        assetId: task_id
      }, {
        headers: {
          auth: c.token,
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      const imgUrl = data?.body?.imgUrl;
      console.log(`⚙️ LightX check: ${imgUrl ? "ready" : "processing..."}`);
      if (imgUrl) {
        return {
          status: "completed",
          result_url: imgUrl,
          message: "Generation completed successfully"
        };
      }
      return {
        status: "processing",
        message: "Task is processing..."
      };
    } catch (e) {
      console.log(`❌ LightX status check failed: ${e.message}`);
      throw e;
    }
  }
  async lxGen(imgUrl, prompt, featureType, model) {
    try {
      const c = this.cfg.lightx;
      const {
        data
      } = await axios.post(`${c.base}/aiartweb/generateImage`, {
        imageUrl: imgUrl,
        featureType: featureType,
        textPrompt: prompt || "",
        isCustomPrompt: 0,
        model: model,
        aiApiVersion: 1
      }, {
        headers: {
          auth: c.token,
          "Content-Type": "application/json"
        },
        timeout: 6e4
      });
      const assetId = data?.body?.assetId;
      if (!assetId) throw new Error("No asset ID received");
      return assetId;
    } catch (e) {
      console.log(`❌ LightX create failed: ${e.message}`);
      throw e;
    }
  }
  async dezgoGen({
    prompt,
    img,
    mask_prompt = "hair",
    negative_prompt,
    model = "realistic_vision_5_1_inpaint",
    sampler = "dpmpp_2m_karras"
  }) {
    const c = this.cfg.dezgo;
    try {
      console.log("⚙️ Preparing Dezgo request...");
      const imgBuf = /^https?:/.test(img) ? (await axios.get(img, {
        responseType: "arraybuffer",
        timeout: 6e4
      })).data : img;
      const form = new FormData();
      form.append("prompt", prompt || "bald");
      form.append("init_image", imgBuf, {
        filename: `img_${Date.now()}.jpg`,
        contentType: "application/octet-stream"
      });
      form.append("mask_prompt", mask_prompt);
      form.append("model", model);
      form.append("negative_prompt", negative_prompt || "ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed, body out of frame, blurry, bad anatomy, blurred, watermark, grainy, signature, cut off, draft, nudity");
      form.append("sampler", sampler);
      form.append("upscale", "1");
      form.append("format", "png");
      console.log("⚙️ Sending request to Dezgo...");
      const {
        data
      } = await axios.post(`${c.base}${c.endpoint}`, form, {
        headers: {
          ...form.getHeaders(),
          "X-Dezgo-key": c.key,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        responseType: "arraybuffer",
        timeout: 12e4
      });
      console.log("✅ Dezgo generation completed");
      const resultUrl = await this.uploadBuf(Buffer.from(data));
      return {
        provider: "dezgo",
        task_id: null,
        status: "completed",
        result_url: resultUrl,
        message: "Generation completed immediately (Dezgo is synchronous)"
      };
    } catch (e) {
      console.log(`❌ Dezgo generation failed: ${e.message}`);
      throw e;
    }
  }
  async dezgoStatus(task_id) {
    return {
      status: "completed",
      message: "Dezgo operations are synchronous and complete immediately"
    };
  }
  randHex(len) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    return Array.from({
      length: len
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status"]
    });
  }
  const api = new AIVideoGen();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              image: "https://example.com"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.provider || !params.task_id) {
          return res.status(400).json({
            error: "Parameter 'provider' dan 'task_id' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              provider: "xxxxxxxxx",
              task_id: "xxxxxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}