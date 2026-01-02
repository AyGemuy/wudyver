import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class PikwyAPI {
  constructor() {
    this.baseURL = "https://api.pikwy.com/";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true
    }));
    console.log("[PikwyAPI] Instance created");
  }
  async generate(options = {}) {
    const url = options.url || options.u || "https://chatgpt.com/";
    const output = options.output || "buffer";
    console.log("[generate] Processing:", url);
    try {
      const params = {
        tkn: options.tkn || 125,
        d: options.d || 3e3,
        u: encodeURIComponent(url),
        fs: options.fs || 0,
        w: options.w || 1280,
        h: options.h || 1200,
        s: options.s || 100,
        z: options.z || 100,
        f: options.f || "jpg",
        rt: options.rt || "jweb",
        ...options
      };
      const response = await this.client.get("/", {
        params: params
      });
      const data = response?.data || {};
      const iurl = data.iurl || null;
      if (!iurl) throw new Error(data.msg || "Invalid API Response");
      const res = await this.client.get(iurl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res?.data || "");
      const mime = res?.headers["content-type"] || "image/jpeg";
      const finalData = output === "base64" && buffer.toString("base64") || output === "url" && iurl || buffer;
      return {
        success: true,
        data: finalData,
        mime: mime
      };
    } catch (error) {
      console.error("[generate] Error:", error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Unknown error",
        code: error.response?.status || error.code
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new PikwyAPI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}