import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class PercifyAPI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.base = "https://percify.io/api";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.userId = null;
  }
  h() {
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://percify.io",
      referer: "https://percify.io/explore",
      "user-agent": this.ua,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      ...SpoofHead()
    };
  }
  rnd(l = 8) {
    return crypto.randomBytes(l).toString("hex");
  }
  async s() {
    console.log("🔐 Signing up...");
    try {
      const e = `${this.rnd(4)}-${this.rnd(2)}-${this.rnd(2)}-${this.rnd(2)}-${this.rnd(6)}@emailhook.site`;
      const p = this.rnd(8) + "A1!";
      const n = this.rnd(4);
      const {
        data
      } = await this.client.post(`${this.base}/auth/sign-up/email`, {
        email: e,
        password: p,
        name: n
      }, {
        headers: this.h()
      });
      this.userId = data?.user?.id || null;
      console.log("✅ Sign up success:", {
        email: e,
        userId: this.userId
      });
      return {
        email: e,
        password: p,
        userId: this.userId
      };
    } catch (err) {
      console.error("❌ Sign up error:", err?.response?.data || err.message);
      throw err;
    }
  }
  async b64(input) {
    if (Buffer.isBuffer(input)) return input.toString("base64");
    if (input?.startsWith("data:")) return input;
    if (input?.startsWith("http")) {
      try {
        const {
          data
        } = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return `data:image/png;base64,${Buffer.from(data).toString("base64")}`;
      } catch (err) {
        console.error("❌ Image fetch error:", err.message);
        throw err;
      }
    }
    return `data:image/png;base64,${input}`;
  }
  async generate({
    prompt,
    imageUrl,
    ...rest
  }) {
    if (!this.userId) await this.s();
    const isI2I = !!imageUrl;
    console.log(`🎨 Generating ${isI2I ? "image-to-image" : "text-to-image"}...`);
    try {
      if (isI2I) {
        const img = await this.b64(imageUrl);
        const payload = {
          userId: this.userId,
          imageUrl: img,
          prompt: prompt || "creative image",
          style: rest?.style || "photo",
          composition: rest?.composition || "headshot",
          aspectRatio: rest?.aspectRatio || "1:1",
          modelUsed: rest?.modelUsed || "standard"
        };
        const {
          data
        } = await this.client.post(`${this.base}/user-avatars/save`, payload, {
          headers: this.h()
        });
        console.log("✅ Image-to-image success");
        return data;
      } else {
        const payload = {
          prompt: prompt || "beautiful landscape",
          negative_prompt: rest?.negative_prompt || "ugly, deformed",
          model: rest?.model || "standard",
          num_images: rest?.num_images || 1,
          aspect_ratio: rest?.aspect_ratio || "square_1_1",
          styling: rest?.styling || {
            style: "photo",
            effects: {
              color: "vibrant",
              lightning: "studio",
              framing: "portrait"
            }
          },
          guidance_scale: rest?.guidance_scale || 2,
          person_generation: rest?.person_generation || "allow_adult",
          safety_settings: rest?.safety_settings || "block_low_and_above",
          filter_nsfw: rest?.filter_nsfw !== false
        };
        const {
          data
        } = await this.client.post(`${this.base}/freepik-api/generate`, payload, {
          headers: this.h()
        });
        console.log("✅ Text-to-image success");
        return data;
      }
    } catch (err) {
      console.error("❌ Generate error:", err?.response?.data || err.message);
      throw err;
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
    const api = new PercifyAPI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}