import axios from "axios";
import FormData from "form-data";
class ApiClient {
  constructor() {
    this.cfg = {
      endpoints: {
        dreamer: "https://us-central1-riafycloudfunction.cloudfunctions.net/R10_dreamer_apps",
        raphael: "https://asia-south1-riafy-public.cloudfunctions.net/raphael",
        agePortrait: "https://asia-south1-riafy-public.cloudfunctions.net/age-portrait-generator",
        babyFace: "https://asia-south1-riafy-public.cloudfunctions.net/baby-face-from-couple-photo",
        hairStyle: "https://asia-south1-riafy-public.cloudfunctions.net/hairtsyleyc/",
        coupleFaceSwap: "https://asia-south1-riafy-public.cloudfunctions.net/couple-face-swap-video",
        portrait: "https://asia-south1-riafy-public.cloudfunctions.net/portrait-generator",
        styles: "https://forking.riafy.in/anime-art-v2.php"
      },
      defaults: {
        appname: "ai.headshot.generator.photo",
        email: "riafyapps1@riafy.me",
        n: 1,
        size: "landscape",
        platform: "riafyX",
        hdQuality: "true",
        mode: "modeN",
        language: "en"
      }
    };
    this.stylesCache = null;
  }
  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  async getStyles({
    lang = "",
    appname = "ai.headshot.generator.photo"
  } = {}) {
    try {
      if (this.stylesCache) {
        console.log("Styles: Returning cached styles");
        return this.stylesCache;
      }
      console.log("Styles: Fetching from API...");
      const params = new URLSearchParams();
      if (lang) params.append("lang", lang);
      if (appname) params.append("appname", appname);
      const url = `${this.cfg.endpoints.styles}?${params.toString()}`;
      const response = await axios.get(url, {
        timeout: 1e4,
        headers: {
          Accept: "application/json",
          "User-Agent": "ApiClient/1.0.0"
        }
      });
      let styles = response?.data;
      if (styles?.styles && Array.isArray(styles.styles)) {
        styles = styles.styles.map(style => ({
          name: style.name,
          value: style.name,
          short_info: style.short_info,
          img: style.img
        }));
      } else if (Array.isArray(styles)) {
        styles = styles.map(style => ({
          ...style,
          value: style.value || style.name
        }));
      } else {
        throw new Error("Invalid response format from styles API");
      }
      if (styles.length > 0) {
        console.log("Styles: Successfully fetched from API");
        this.stylesCache = styles;
        return this.stylesCache;
      } else {
        throw new Error("No styles found in API response");
      }
    } catch (err) {
      console.warn("Styles: API failed, using default styles:", err?.message);
      return [{
        name: "Cyberpunk",
        value: "cyberpunk"
      }, {
        name: "Fantasy Forest",
        value: "fantasy_forest"
      }, {
        name: "Pixel Art",
        value: "pixel_art"
      }, {
        name: "Steampunk",
        value: "steampunk"
      }, {
        name: "Watercolor Fantasy",
        value: "watercolor_fantasy"
      }, {
        name: "Noir Detective",
        value: "noir_detective"
      }, {
        name: "Surreal Dream",
        value: "surreal_dream"
      }, {
        name: "Lego Style",
        value: "lego_style"
      }, {
        name: "Viking Warrior",
        value: "viking_warrior"
      }, {
        name: "Digital Painting",
        value: "digital_painting"
      }, {
        name: "Sci-Fi Planet",
        value: "sci_fi_planet"
      }, {
        name: "Ink Sketch",
        value: "ink_sketch"
      }, {
        name: "Futuristic Cybernetic",
        value: "futuristic_cybernetic"
      }, {
        name: "Art Deco",
        value: "art_deco"
      }, {
        name: "Low Poly",
        value: "low_poly"
      }, {
        name: "Gothic Dark",
        value: "gothic_dark"
      }, {
        name: "Baroque Painting",
        value: "baroque_painting"
      }, {
        name: "Blueprint",
        value: "blueprint"
      }, {
        name: "Astronaut Space",
        value: "astronaut_space"
      }, {
        name: "Zelda Anime",
        value: "zelda_anime"
      }, {
        name: "Papercut",
        value: "papercut"
      }, {
        name: "Cinematic Wolf",
        value: "cinematic_wolf"
      }, {
        name: "Superman",
        value: "superman"
      }, {
        name: "Popmart Mario",
        value: "popmart_mario"
      }, {
        name: "Impressionist Painting",
        value: "impressionist_painting"
      }];
    }
  }
  async dreamer({
    prompt,
    image = null,
    styles = "high",
    appname = "ai.headshot.generator.photo",
    email = "riafyapps1@riafy.me",
    size = "landscape",
    platform = "riafyX",
    hdQuality = "true",
    mode = "modeN",
    fcmid = null,
    deeplink = null,
    ...rest
  }) {
    try {
      console.log("Dreamer API: Processing request...");
      if (!prompt) {
        throw new Error("Prompt is required for dreamer API");
      }
      let imageData = null;
      if (image) {
        if (typeof image === "object" && image?.preview?.startsWith("data:")) {
          imageData = image.preview.split(",")[1];
        } else if (Buffer.isBuffer(image)) {
          imageData = image.toString("base64");
        } else if (typeof image === "string" && image.startsWith("http")) {
          const response = await axios.get(image, {
            responseType: "arraybuffer"
          });
          imageData = Buffer.from(response.data, "binary").toString("base64");
        } else if (typeof image === "string") {
          imageData = image.includes(",") ? image.split(",")[1] : image;
        }
      }
      const payload = {
        appname: appname,
        prompt: prompt,
        n: 1,
        email: email,
        size: size,
        platform: platform,
        hdQuality: hdQuality,
        mode: mode,
        styles: styles?.toUpperCase(),
        ...rest
      };
      if (imageData) {
        payload.image = imageData;
      }
      if (fcmid) payload.fcmid = fcmid;
      if (deeplink) payload.deeplink = deeplink;
      console.log("Dreamer API: Sending request...");
      const res = await axios.post(this.cfg.endpoints.dreamer, payload, {
        headers: {
          "Content-Type": "application/json",
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9"
        }
      });
      console.log("Dreamer API: Success");
      return res?.data;
    } catch (err) {
      console.error("Dreamer API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async raphael({
    prompt = "make the photo anime style",
    image = null,
    appname = "ToonApp",
    deviceId = null,
    deeplink = "myapp://generation/result",
    ...rest
  }) {
    try {
      console.log("Raphael API: Processing image...");
      if (!prompt) {
        throw new Error("Prompt is required for raphael API");
      }
      const form = new FormData();
      form.append("prompt", prompt);
      if (image) {
        const buffer = await this.prepareImageBuffer(image);
        form.append("input_image", buffer, {
          filename: "input_image.jpg"
        });
      }
      form.append("appName", appname);
      form.append("deviceId", deviceId || this.generateDeviceId());
      form.append("deeplink", deeplink);
      console.log("Raphael API: Uploading...");
      const res = await axios.post(this.cfg.endpoints.raphael, form, {
        headers: form.getHeaders()
      });
      console.log("Raphael API: Success");
      return res?.data;
    } catch (err) {
      console.error("Raphael API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async agePortrait({
    image,
    gender = null,
    age = null,
    style = "high",
    language = "en",
    appname = null,
    deviceId = null,
    generateVideo = false,
    fcmid = null,
    deeplink = null,
    ...rest
  }) {
    try {
      console.log("Age Portrait API: Processing...");
      if (!image) {
        throw new Error("Image is required for age portrait API");
      }
      const form = new FormData();
      let imageBuffer;
      if (Array.isArray(image) && image.length > 0) {
        imageBuffer = await this.prepareImageBuffer(image[0]);
      } else {
        imageBuffer = await this.prepareImageBuffer(image);
      }
      form.append("main_face_image", imageBuffer, {
        filename: "source.jpg"
      });
      if (gender) form.append("gender", gender);
      if (age) form.append("age", age);
      form.append("style", style);
      form.append("language", language);
      form.append("generate_video", generateVideo ? "true" : "false");
      if (appname) form.append("appName", appname);
      if (deviceId) form.append("deviceId", deviceId || this.generateDeviceId());
      if (fcmid) form.append("fcmid", fcmid);
      if (deeplink) form.append("deeplink", deeplink);
      console.log("Age Portrait API: Sending request...");
      const res = await axios.post(this.cfg.endpoints.agePortrait, form);
      console.log("Age Portrait API: Success");
      return res?.data;
    } catch (err) {
      console.error("Age Portrait API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async babyFace({
    image1,
    image2 = null,
    gender = null,
    style = "high",
    language = "en",
    appname = null,
    deviceId = null,
    generateVideo = false,
    fcmid = null,
    deeplink = "http://riafy.me/baby-gen-result",
    ...rest
  }) {
    try {
      console.log("Baby Face API: Processing parents images...");
      if (!image1) {
        throw new Error("At least image1 is required for baby face API");
      }
      const form = new FormData();
      const buffer1 = await this.prepareImageBuffer(image1);
      form.append("main_face_image", buffer1, {
        filename: "parent1.jpg"
      });
      if (image2) {
        const buffer2 = await this.prepareImageBuffer(image2);
        form.append("auxiliary_face_image", buffer2, {
          filename: "parent2.jpg"
        });
      }
      if (gender) {
        const genderBaby = gender === "woman" || gender === "female" || gender === "girl" ? "girl" : "boy";
        form.append("gender", genderBaby);
      }
      form.append("style", style);
      form.append("language", language);
      form.append("generate_video", generateVideo ? "true" : "false");
      form.append("deeplink", deeplink);
      if (appname) form.append("appName", appname);
      if (deviceId) form.append("deviceId", deviceId || this.generateDeviceId());
      if (fcmid) form.append("fcmid", fcmid);
      console.log("Baby Face API: Generating baby...");
      const res = await axios.post(this.cfg.endpoints.babyFace, form);
      console.log("Baby Face API: Success");
      return res?.data;
    } catch (err) {
      console.error("Baby Face API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async hairStyle({
    image,
    image1 = null,
    language = "en",
    appname = null,
    deviceId = null,
    fcmid = null,
    deeplink = null,
    ...rest
  }) {
    try {
      console.log("Hair Style API: Processing style transfer...");
      if (!image) {
        throw new Error("Image is required for hair style API");
      }
      const form = new FormData();
      form.append("feature_type", "mu-transfer");
      const refBuffer = await this.prepareImageBuffer(image);
      form.append("reference_image", refBuffer, {
        filename: "reference.jpg"
      });
      if (image1) {
        const sourceBuffer = await this.prepareImageBuffer(image1);
        form.append("source_image", sourceBuffer, {
          filename: "source.jpg"
        });
      }
      form.append("language", language);
      if (appname) form.append("appName", appname);
      if (deviceId) form.append("deviceId", deviceId || this.generateDeviceId());
      if (fcmid) form.append("fcmid", fcmid);
      if (deeplink) form.append("deeplink", deeplink);
      console.log("Hair Style API: Applying style...");
      const res = await axios.post(this.cfg.endpoints.hairStyle, form);
      console.log("Hair Style API: Success");
      return res?.data;
    } catch (err) {
      console.error("Hair Style API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async coupleFaceSwap({
    image1,
    image2,
    style = "high",
    gender = null,
    platform = "Android",
    generateVideo = false,
    optimise = true,
    language = "en",
    appname = null,
    deviceId = null,
    fcmid = null,
    deeplink = null,
    imageurl = null,
    ...rest
  }) {
    try {
      console.log("Couple Face Swap API: Processing couple images...");
      if (!image1 || !image2) {
        throw new Error("Both image1 and image2 are required for couple face swap API");
      }
      const form = new FormData();
      form.append("platform", platform);
      if (style) form.append("style", style);
      if (gender) form.append("gender", gender);
      form.append("generate_video", generateVideo ? "true" : "false");
      form.append("optimise", optimise ? "true" : "false");
      const buffer1 = await this.prepareImageBuffer(image1);
      form.append("left_image", buffer1, {
        filename: "left_image.jpg"
      });
      const buffer2 = await this.prepareImageBuffer(image2);
      form.append("right_image", buffer2, {
        filename: "right_image.jpg"
      });
      if (language) form.append("language", language);
      if (appname) form.append("appName", appname);
      if (deviceId) form.append("deviceId", deviceId || this.generateDeviceId());
      if (fcmid) form.append("fcmid", fcmid);
      if (deeplink) form.append("deeplink", deeplink);
      if (imageurl) form.append("imageurl", imageurl);
      console.log("Couple Face Swap API: Swapping faces...");
      const res = await axios.post(this.cfg.endpoints.coupleFaceSwap, form, {
        timeout: 3e5
      });
      console.log("Couple Face Swap API: Success");
      return res?.data;
    } catch (err) {
      console.error("Couple Face Swap API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async portrait({
    image,
    image1 = null,
    image2 = null,
    image3 = null,
    style = "high",
    gender = null,
    ...rest
  }) {
    try {
      console.log("Portrait API: Processing multiple images...");
      if (!image) {
        throw new Error("At least one image is required for portrait API");
      }
      const form = new FormData();
      if (style) form.append("style", style);
      if (gender) form.append("gender", gender);
      const images = [image, image1, image2, image3].filter(Boolean);
      for (let i = 0; i < images.length; i++) {
        const field = i === 0 ? "main_face_image" : `auxiliary_face_image${i}`;
        const buffer = await this.prepareImageBuffer(images[i]);
        form.append(field, buffer, {
          filename: `${field}.jpg`
        });
      }
      console.log("Portrait API: Generating portrait...");
      const res = await axios.post(this.cfg.endpoints.portrait, form);
      console.log("Portrait API: Success");
      return res?.data;
    } catch (err) {
      console.error("Portrait API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async colorChanger({
    image,
    style = "high",
    appname = "photo.color.changer.editor",
    mode = "modeN",
    email = "user@example.com",
    prompt = "color-photo",
    n = 1,
    ...rest
  }) {
    try {
      console.log("Color Changer API: Processing request...");
      if (!image) {
        throw new Error("Image is required for color changer API");
      }
      let imageData = image;
      if (typeof image === "object" && image?.preview?.startsWith("data:")) {
        imageData = image.preview.split(",")[1];
      } else if (Buffer.isBuffer(image)) {
        imageData = image.toString("base64");
      } else if (typeof image === "string" && image.startsWith("http")) {
        const response = await axios.get(image, {
          responseType: "arraybuffer"
        });
        imageData = Buffer.from(response.data, "binary").toString("base64");
      }
      const payload = {
        appname: appname,
        mode: mode,
        email: email,
        prompt: prompt,
        styles: style,
        image: imageData,
        n: n,
        ...rest
      };
      console.log("Color Changer API: Sending request...");
      const res = await axios.post(this.cfg.endpoints.dreamer, payload, {
        headers: {
          accept: "/",
          "content-type": "application/json"
        }
      });
      console.log("Color Changer API: Success");
      return res?.data;
    } catch (err) {
      console.error("Color Changer API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async decryptPayload({
    encrypted_payload,
    image = null,
    platform = "android",
    ...rest
  }) {
    try {
      console.log("Decrypt API: Processing encrypted payload...");
      const payload = {
        operation: "decrypt",
        encrypted_payload: encrypted_payload,
        ...rest
      };
      if (image) payload.image = image;
      console.log("Decrypt API: Sending request...");
      const res = await axios.post(this.cfg.endpoints.dreamer, payload, {
        headers: {
          "Content-Type": "application/json",
          platform: platform === "iOS" ? "iOS" : "android"
        }
      });
      console.log("Decrypt API: Success");
      return res?.data;
    } catch (err) {
      console.error("Decrypt API Error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async prepareImageBuffer(imageInput) {
    try {
      if (Buffer.isBuffer(imageInput)) {
        return imageInput;
      }
      if (typeof imageInput === "object" && imageInput?.buffer) {
        return imageInput.buffer;
      }
      if (typeof imageInput === "object" && imageInput?.preview?.startsWith("data:")) {
        return this.dataURLtoBuffer(imageInput.preview);
      }
      if (typeof imageInput === "string" && imageInput.startsWith("data:")) {
        return this.dataURLtoBuffer(imageInput);
      }
      if (typeof imageInput === "string" && !imageInput.startsWith("http")) {
        const base64Data = imageInput.includes(",") ? imageInput.split(",")[1] : imageInput;
        return Buffer.from(base64Data, "base64");
      }
      if (typeof imageInput === "string" && imageInput.startsWith("http")) {
        const response = await axios.get(imageInput, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      throw new Error("Unsupported image input format");
    } catch (err) {
      console.error("Image preparation error:", err.message);
      throw new Error(`Failed to prepare image: ${err.message}`);
    }
  }
  dataURLtoBuffer(dataurl) {
    try {
      const base64Data = dataurl.split(",")[1];
      return Buffer.from(base64Data, "base64");
    } catch (err) {
      throw new Error(`Failed to convert data URL to buffer: ${err.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new ApiClient();
  try {
    let response;
    switch (action) {
      case "get_styles":
        response = await api.getStyles(params);
        break;
      case "dreamer":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'dreamer'."
          });
        }
        response = await api.dreamer(params);
        break;
      case "raphael":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'raphael'."
          });
        }
        response = await api.raphael(params);
        break;
      case "age_portrait":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'age_portrait'."
          });
        }
        response = await api.agePortrait(params);
        break;
      case "baby_face":
        if (!params.image1) {
          return res.status(400).json({
            error: "Parameter 'image1' wajib diisi untuk action 'baby_face'."
          });
        }
        response = await api.babyFace(params);
        break;
      case "hair_style":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'hair_style'."
          });
        }
        response = await api.hairStyle(params);
        break;
      case "couple_face_swap":
        if (!params.image1 || !params.image2) {
          return res.status(400).json({
            error: "Parameter 'image1' dan 'image2' wajib diisi untuk action 'couple_face_swap'."
          });
        }
        response = await api.coupleFaceSwap(params);
        break;
      case "portrait":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'portrait'."
          });
        }
        response = await api.portrait(params);
        break;
      case "color_changer":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'color_changer'."
          });
        }
        response = await api.colorChanger(params);
        break;
      case "decrypt_payload":
        if (!params.encrypted_payload) {
          return res.status(400).json({
            error: "Parameter 'encrypted_payload' wajib diisi untuk action 'decrypt_payload'."
          });
        }
        response = await api.decryptPayload(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'get_styles', 'dreamer', 'raphael', 'age_portrait', 'baby_face', 'hair_style', 'couple_face_swap', 'portrait', 'color_changer', 'decrypt_payload'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}