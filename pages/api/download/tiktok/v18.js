import axios from "axios";
import CryptoJS from "crypto-js";
class TikTokDownloader {
  constructor() {
    this.ep = "https://savetik.app/requests";
    this.kReq = "GJvE5RZIxrl9SuNrAtgsvCfWha3M7NGC";
    this.kRes = "H3quWdWoHLX5bZSlyCYAnvDFara25FIu";
    this.head = {
      authority: "savetik.app",
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://savetik.app",
      referer: "https://savetik.app/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  fmtData(type, str) {
    const isEnc = type === "enc";
    const kStr = isEnc ? this.kReq : this.kRes;
    const k = CryptoJS.enc.Utf8.parse(kStr);
    const iv = CryptoJS.enc.Utf8.parse(kStr.slice(0, 16));
    return isEnc ? CryptoJS.AES.encrypt(str, k, {
      iv: iv
    }).toString() : CryptoJS.AES.decrypt(str?.toString() || "", k, {
      iv: iv
    }).toString(CryptoJS.enc.Utf8);
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[SaveTik] Start: ${url}`);
    try {
      const {
        data
      } = await axios.post(this.ep, {
        bdata: this.fmtData("enc", url)
      }, {
        headers: this.head
      });
      console.log(`[SaveTik] Res: ${data?.status || "unknown"}`);
      const ok = data?.status === "success";
      const raw = ok ? this.fmtData("dec", data?.data) : null;
      return {
        status: ok ? 200 : 400,
        message: ok ? "Success" : "Failed",
        result: ok ? {
          info: {
            id: data?.username_id || "N/A",
            username: data?.username || "Unknown",
            cover: data?.thumbnailUrl || "",
            desc: data?.desc || ""
          },
          media: {
            video: raw || null,
            mp3: data?.mp3 || null
          },
          meta: rest
        } : null
      };
    } catch (e) {
      console.log(`[SaveTik] Err: ${e?.message}`);
      return {
        status: 500,
        message: e?.message || "Internal Error",
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  try {
    const downloader = new TikTokDownloader();
    const result = await downloader.download(params);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({
      error: error.message
    });
  }
}