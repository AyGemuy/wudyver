import axios from "axios";
import crypto from "crypto";
class Shuiyinla {
  constructor() {
    this.base = "https://shuiyinla.com";
    this.regex = {
      tiktok: /^https?:\/\/(www\.|m\.|vt\.)?tiktok\.com/,
      douyin: /^https?:\/\/(v\.|www\.)?douyin\.com/,
      xiaohongshu: /^https?:\/\/www\.xiaohongshu\.com\/explore\//,
      kuaishou: /^https?:\/\/(v\.|www\.)?kuaishou\.com|v\.m\.chenzhongtech\.com\//,
      weibo: /^https?:\/\/(video\.|m\.|www\.)?weibo\.(com|cn)\//
    };
    this.secretKey = Buffer.from("*)(YH21oi'l/k2n.3gva]9-0u'`1/2lk", "utf8");
    this.iv = Buffer.from("1234567890123456", "utf8");
  }
  async redirect(url) {
    try {
      const {
        headers
      } = await axios.head(url, {
        maxRedirects: 0,
        validateStatus: s => s < 400
      });
      return headers.location || url;
    } catch (error) {
      console.error(`Error redirecting URL: ${error.message}`);
      return url;
    }
  }
  async process(url) {
    try {
      if (this.regex.tiktok.test(url) && (url.includes("m.tiktok.com") || url.includes("vt.tiktok.com"))) {
        url = await this.redirect(url);
      }
      return this.regex.tiktok.test(url) ? url.replace("www.tiktok.com", "tiktok.com") : url;
    } catch (error) {
      console.error(`Error processing URL: ${error.message}`);
      throw new Error("Failed to process URL");
    }
  }
  decrypt(enc) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-cbc", this.secretKey, this.iv);
      return Buffer.concat([decipher.update(Buffer.from(enc, "base64")), decipher.final()]).toString("utf8");
    } catch (error) {
      console.error(`Error decrypting data: ${error.message}`);
      throw new Error("Failed to decrypt data");
    }
  }
  async download(url) {
    if (!url?.trim()) throw new Error("Link tidak valid.");
    if (!Object.values(this.regex).some(regex => regex.test(url))) {
      throw new Error("Link tidak didukung.");
    }
    const time = Math.floor(Date.now() / 1e3).toString();
    const token = crypto.createHash("md5").update(`&()PKL?.\`1m2bnlw2.${time}`).digest("hex");
    console.log("Memproses link...");
    try {
      const processedUrl = await this.process(url);
      const encodedUrl = encodeURIComponent(processedUrl);
      const {
        data
      } = await axios.post(`${this.base}/getVideo?a=m&agent=shuiyinla.com`, `url=${encodedUrl}`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "Postify/1.0.0",
          token: token,
          version: "1.0.0",
          time: time
        }
      });
      if (data.code === 1) {
        console.log("Video berhasil didownload.");
        return JSON.parse(this.decrypt(data.data));
      } else {
        throw new Error(`Gagal: ${data.message}`);
      }
    } catch (error) {
      console.error(`Error downloading video: ${error.message}`);
      throw new Error(error.message || "Terjadi kesalahan");
    }
  }
}
export default async function handler(req, res) {
  const url = req.method === "GET" ? req.query.url : req.body.url;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak valid."
    });
  }
  const downloader = new Shuiyinla();
  try {
    const result = await downloader.download(url);
    return res.status(200).json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error(`Handler error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}