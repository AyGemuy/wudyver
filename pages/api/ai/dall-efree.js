import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
import * as cheerio from "cheerio";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class Dalle {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
    this.base = "https://www.dall-efree.com";
    this.apiMail = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
  }
  log(m) {
    console.log(`[${new Date().toLocaleTimeString()}] ${m}`);
  }
  async wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  creds() {
    try {
      const c = {
        u: "ABCDEFGHJKLMNPQRSTUVWXYZ",
        l: "abcdefghijkmnpqrstuvwxyz",
        n: "123456789",
        s: "@#$!&"
      };
      const rnd = s => s[crypto.randomInt(0, s.length)];
      let p = [c.u, c.l, c.n, c.s].map(x => rnd(x)).join("");
      p += Array(6).fill(0).map(() => rnd(c.u + c.l + c.n)).join("");
      return {
        user: `User${crypto.randomBytes(2).toString("hex")}`,
        pass: p.split("").sort(() => .5 - Math.random()).join("")
      };
    } catch (e) {
      return {
        user: "UserDef",
        pass: "Pass123!"
      };
    }
  }
  async media(src) {
    try {
      this.log("Proc media...");
      if (!src) return null;
      if (Buffer.isBuffer(src)) return src;
      if (src.startsWith("http")) return (await axios.get(src, {
        responseType: "arraybuffer"
      })).data;
      if (src.startsWith("data:")) return Buffer.from(src.split(",")[1], "base64");
      return Buffer.from(src, "base64");
    } catch (e) {
      return null;
    }
  }
  async up(buf) {
    try {
      this.log("Uploading result...");
      const f = new FormData();
      f.append("reqtype", "fileupload");
      f.append("fileToUpload", buf, {
        filename: `img_${Date.now()}.png`,
        contentType: "image/png"
      });
      const r = await axios.post("https://catbox.moe/user/api.php", f, {
        headers: f.getHeaders()
      });
      return r.data;
    } catch (e) {
      this.log("Up fail, return base64");
      return buf.toString("base64");
    }
  }
  async mail() {
    try {
      this.log("Get mail...");
      const r = await axios.get(`${this.apiMail}?action=create`);
      return r?.data?.email || null;
    } catch (e) {
      throw e;
    }
  }
  async link(email) {
    try {
      this.log(`Poll link ${email}...`);
      for (let i = 0; i < 60; i++) {
        await this.wait(3e3);
        try {
          const r = await axios.get(`${this.apiMail}?action=message&email=${email}`);
          const h = r?.data?.data?.[0]?.html_content;
          if (h) {
            const $ = cheerio.load(h);
            const l = $('a[href*="token="]').attr("href");
            if (l) return l;
          }
        } catch (e) {}
      }
      throw new Error("Link timeout");
    } catch (e) {
      throw e;
    }
  }
  async reg(email, {
    user,
    pass
  }) {
    try {
      this.log(`Reg ${user}...`);
      await this.client.post(`${this.base}/api/signup`, {
        full_name: user,
        email: email,
        password: pass,
        cpassword: pass
      }, {
        headers: {
          origin: this.base,
          referer: `${this.base}/register`
        }
      });
      return true;
    } catch (e) {
      throw new Error(e?.response?.data?.message || "Reg fail");
    }
  }
  async verify(email, url) {
    try {
      this.log("Verify...");
      await this.client.get(url, {
        headers: {
          referer: this.base
        }
      }).catch(() => {});
      const r = await this.client.post(`${this.base}/api/verifyOtp`, {
        type: "login",
        email: email
      }, {
        headers: {
          origin: this.base,
          referer: url
        }
      });
      if (!r?.data?.token) throw new Error("No token");
      return r.data.token;
    } catch (e) {
      throw e;
    }
  }
  async generate({
    token,
    prompt,
    media,
    output = "url",
    ...rest
  }) {
    try {
      this.log("Start gen...");
      let jwt = token,
        uid = "695b5ff0069c0f19e6f7162f";
      if (!jwt) {
        const em = await this.mail();
        if (!em) throw new Error("No mail");
        const cr = this.creds();
        await this.reg(em, cr);
        const lnk = await this.link(em);
        jwt = await this.verify(em, lnk);
      }
      try {
        if (jwt) uid = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString())?._id || uid;
      } catch (e) {}
      const buf = await this.media(media);
      const mode = buf ? "Image to Image" : "Text to Image";
      const form = new FormData();
      form.append("prompt", prompt || "Art");
      form.append("style", rest?.style || "none");
      form.append("orientation", rest?.orientation || "832x1216");
      form.append("numberOfImage", (rest?.numberOfImage || 1).toString());
      form.append("type", mode);
      form.append("subscription", uid);
      form.append("plan", "Free");
      form.append("moduleType", "Replicate Ai");
      form.append("currentCountry", "Indonesia");
      form.append("image", buf || "", buf ? {
        filename: "i.jpg",
        contentType: "image/jpeg"
      } : {});
      const res = await this.client.post(`${this.base}/api/generateImage`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: jwt,
          Cookie: `token=${jwt}`,
          Referer: `${this.base}/user/${buf ? "image-to-image" : "text-to-image"}`
        }
      });
      const rawUrls = res.data?.savedImageUrls || [];
      const processed = [];
      this.log(`Processing output as: ${output}`);
      for (const item of rawUrls) {
        let data = item;
        if (typeof item === "string" && item.startsWith("data:")) {
          data = Buffer.from(item.split(",")[1], "base64");
        }
        if (output === "buffer") {
          processed.push(data);
        } else if (output === "base64") {
          processed.push(Buffer.isBuffer(data) ? data.toString("base64") : data);
        } else {
          const url = await this.up(data);
          processed.push(url);
        }
      }
      return {
        result: processed,
        token: jwt,
        ...res.data
      };
    } catch (e) {
      this.log(`Err: ${e.message}`);
      return {
        status: false,
        msg: e.message,
        token: token || null
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
  const api = new Dalle();
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