import axios from "axios";
import FormData from "form-data";
class RiafyEnhancer {
  constructor() {
    this.baseUrl = "https://forking.riafy.in/image-converter";
    this.keys = ["c308e3e6abmsh9af91cb98220a1cp1de2f7jsn20743c3dba32", "91123a1d04mshcbba59a1700458ep184f88jsn67f6db9928b6", "c2798be31fmsh0829f34e4f8f864p189976jsnbf7e61be63a5", "1082d05036mshd322f051bb9104fp1b6f8ejsnd041da3967d4", "51e5472abbmshab086a5b420ed20p1390b1jsn9802649b0c06", "9e82d9fb53msh52acf328296baebp1b698fjsn7059b8a7d9b5", "6f094bc61bmsh75c08d85ef94fdap1fda4djsn75091ee762d0", "5d01526fc0mshd9a5bfe925197b4p16b9ffjsnace89978ebdd", "0bdc5ff434mshf446b3157351c98p1fa6d6jsndac5fc419412", "e8eb0bb81dmshf9d8283882d5bb1p12551ajsn7f1c1dd1c29b", "76e904bd30msh830e4e4f037b492p11a681jsn954d6e6b18ab"];
    this.headers = {
      "x-rapidapi-host": "ai-background-remover.p.rapidapi.com",
      "User-Agent": "okhttp/4.9.3"
    };
    this.allowedModes = ["remove_bg", "cartoonify", "upscale", "makeup"];
  }
  async resolveMedia(media) {
    if (Buffer.isBuffer(media)) return media;
    if (typeof media === "string") {
      if (media.startsWith("http")) {
        console.log(`   [Process] Downloading image from URL...`);
        const response = await axios.get(media, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      }
      if (media.startsWith("data:") || /^[a-zA-Z0-9+/]*={0,2}$/.test(media)) {
        console.log(`   [Process] Decoding Base64 image...`);
        const base64Data = media.includes("base64,") ? media.split("base64,")[1] : media;
        return Buffer.from(base64Data, "base64");
      }
    }
    throw new Error("Invalid media format. Supported: Buffer, URL, Base64 String.");
  }
  async generate({
    mode,
    media,
    ...rest
  } = {}) {
    if (!mode) {
      return {
        status: false,
        code: 400,
        message: "Parameter 'mode' is required.",
        valid_modes: this.allowedModes
      };
    }
    if (!this.allowedModes.includes(mode)) {
      return {
        status: false,
        code: 400,
        message: `Mode '${mode}' is invalid.`,
        valid_modes: this.allowedModes
      };
    }
    if (!media) {
      return {
        status: false,
        code: 400,
        message: "Parameter 'media' (URL/Base64/Buffer) is required."
      };
    }
    console.log(`\n=== Starting Job: ${mode.toUpperCase()} ===`);
    let imageBuffer;
    try {
      imageBuffer = await this.resolveMedia(media);
    } catch (e) {
      return {
        status: false,
        code: 422,
        message: `Media processing failed: ${e.message}`
      };
    }
    for (const apiKey of this.keys) {
      const shortKey = apiKey.slice(-8);
      console.log(`🔹 Trying Key: ...${shortKey}`);
      try {
        let endpoint = "";
        let queryParams = `?apikey=${apiKey}`;
        switch (mode) {
          case "remove_bg":
            endpoint = "image-background-remover-api.php";
            break;
          case "cartoonify":
            endpoint = "image-toonme-api.php";
            break;
          case "upscale":
            endpoint = "image-upscale-api.php";
            queryParams += `&scale=${rest.scale || 2}`;
            break;
          case "makeup":
            endpoint = "image-makeup-api.php";
            const defaults = {
              use_skin_healing: true,
              use_eyes_enhancement: true,
              use_teeth_whitening: true,
              use_wrinkles_healing: true,
              use_skin_color_corrector: true,
              use_portrait_filters: true,
              use_flash_healing: false
            };
            const merged = {
              ...defaults,
              ...rest
            };
            for (const [k, v] of Object.entries(merged)) {
              queryParams += `&${k}=${v ? "true" : "false"}`;
            }
            break;
        }
        const form = new FormData();
        form.append("image", imageBuffer, {
          filename: "file.jpg",
          contentType: "image/jpeg"
        });
        const url = `${this.baseUrl}/${endpoint}${queryParams}`;
        const response = await axios.post(url, form, {
          headers: {
            ...form.getHeaders(),
            ...this.headers,
            "x-rapidapi-key": apiKey
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: status => status < 500
        });
        if (response.status === 200) {
          const dataStr = JSON.stringify(response.data);
          if (dataStr.includes("quota") || dataStr.includes("exceeded") || dataStr.includes("Unauthorized")) {
            console.log(`   ❌ Key Failed: Quota Exceeded / Unauthorized`);
            continue;
          }
          console.log(`   ✅ Success!`);
          return {
            status: true,
            code: 200,
            meta: {
              mode: mode,
              used_key: shortKey
            },
            ...response.data
          };
        } else {
          console.log(`   ⚠️ API Error Status: ${response.status}`);
          continue;
        }
      } catch (error) {
        console.log(`   ❌ Network Error: ${error.message}`);
      }
    }
    console.error(`\n[Fatal] All keys exhausted.`);
    return {
      status: false,
      code: 503,
      message: "Service unavailable. All API keys failed or quota exceeded."
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new generate();
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