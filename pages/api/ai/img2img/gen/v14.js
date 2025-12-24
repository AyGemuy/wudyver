import SpoofHead from "@/lib/spoof-head";
import PROMPT from "@/configs/ai-prompt";
import FormData from "form-data";
import crypto from "crypto";
import axios from "axios";
const MIME_MAP = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp"
};
const DL_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.google.com/",
  "Sec-Fetch-Dest": "image",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
  Priority: "u=1, i"
};
class GridPlus {
  constructor() {
    this.ins = axios.create({
      baseURL: "https://api.grid.plus/v1",
      headers: {
        "user-agent": "Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0",
        "X-AppID": "808645",
        "X-Platform": "h5",
        "X-Version": "8.9.7",
        "X-SessionToken": "",
        "X-UniqueID": this.uid(),
        "X-GhostID": this.uid(),
        "X-DeviceID": this.uid(),
        "X-MCC": "id-ID",
        sig: `XX${this.uid() + this.uid()}`,
        ...SpoofHead()
      }
    });
  }
  uid() {
    return crypto.randomUUID().replace(/-/g, "");
  }
  form(dt) {
    const f = new FormData();
    Object.entries(dt ?? {}).forEach(([k, v]) => {
      if (v != null) f.append(k, String(v));
    });
    return f;
  }
  ext(buf) {
    const h = buf.subarray(0, 12).toString("hex");
    return h.startsWith("ffd8ffe") ? "jpg" : h.startsWith("89504e47") ? "png" : h.startsWith("52494646") && h.substring(16, 24) === "57454250" ? "webp" : h.startsWith("47494638") ? "gif" : h.startsWith("424d") ? "bmp" : "png";
  }
  async up(buf, mtd) {
    console.log("[UP] Mulai upload");
    if (!Buffer.isBuffer(buf)) throw new Error("Data bukan Buffer");
    const e = this.ext(buf);
    const mime = MIME_MAP[e] ?? "image/png";
    try {
      const d = await this.ins.post("/ai/web/nologin/getuploadurl", this.form({
        ext: e,
        method: mtd
      })).then(r => r?.data).catch(err => {
        throw new Error(`Gagal ambil URL: ${err.message}`);
      });
      console.log("[UP] Upload ke:", d?.data?.upload_url?.slice(0, 60) + "...");
      await axios.put(d.data.upload_url, buf, {
        headers: {
          "content-type": mime
        }
      }).catch(err => {
        throw new Error(`Upload gagal: ${err.message}`);
      });
      const imgUrl = d?.data?.img_url;
      console.log("[UP] Selesai:", imgUrl);
      return imgUrl;
    } catch (err) {
      console.error("[UP] Error:", err.message);
      throw err;
    }
  }
  async poll({
    path,
    data,
    sl = () => false
  }) {
    console.log("[POLL] Mulai polling:", path);
    const start = Date.now(),
      interval = 3e3,
      timeout = 6e4;
    return new Promise((resolve, reject) => {
      const check = async () => {
        if (Date.now() - start > timeout) {
          console.error("[POLL] Timeout setelah 60 detik");
          return reject(new Error("Polling timeout"));
        }
        try {
          const r = await this.ins({
            url: path,
            method: data ? "POST" : "GET",
            ...data ? {
              data: data
            } : {}
          }).catch(err => {
            throw new Error(`Request gagal: ${err.message}`);
          });
          const errMsg = r?.data?.errmsg?.trim();
          if (errMsg) {
            console.error("[POLL] API error:", errMsg);
            return reject(new Error(errMsg));
          }
          if (sl(r.data)) {
            console.log("[POLL] Selesai, hasil ditemukan");
            return resolve(r.data);
          }
          console.log("[POLL] Belum selesai, cek lagi dalam 3 detik...");
          setTimeout(check, interval);
        } catch (err) {
          console.error("[POLL] Exception:", err.message);
          reject(err);
        }
      };
      check();
    });
  }
  async generate({
    prompt = PROMPT.text,
    imageUrl,
    ...rest
  }) {
    console.log("[GEN] Proses dimulai", {
      prompt: !!prompt,
      hasImage: !!imageUrl
    });
    let buf = imageUrl;
    try {
      if (typeof imageUrl === "string") {
        if (imageUrl.startsWith("http")) {
          console.log("[GEN] Download gambar dari URL...");
          const res = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            headers: DL_HEADERS,
            timeout: 15e3,
            maxRedirects: 5
          }).catch(err => {
            throw new Error(`Download gagal: ${err.response?.status || err.message}`);
          });
          buf = Buffer.from(res.data);
          console.log("[GEN] Download selesai:", buf.length, "bytes");
        } else if (imageUrl.startsWith("data:")) {
          console.log("[GEN] Decode Data URI");
          const b64 = imageUrl.split(",")[1] || "";
          buf = Buffer.from(b64, "base64");
        } else {
          console.log("[GEN] Decode Base64 string");
          buf = Buffer.from(imageUrl, "base64");
        }
      }
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        throw new Error("Gambar tidak valid atau kosong");
      }
      const uploadedUrl = await this.up(buf, "wn_aistyle_nano");
      const taskRes = await this.ins.post("/ai/nano/upload", this.form({
        prompt: prompt,
        url: uploadedUrl,
        ...rest
      })).then(r => r?.data).catch(err => {
        throw new Error(`Submit task gagal: ${err.message}`);
      });
      const taskId = taskRes?.task_id;
      if (!taskId) throw new Error("Task ID tidak ditemukan");
      console.log("[GEN] Task ID:", taskId);
      const result = await this.poll({
        path: `/ai/nano/get_result/${taskId}`,
        sl: d => d?.code === 0 && !!d?.image_url
      });
      const finalUrl = result?.image_url;
      console.log("[GEN] Sukses! URL hasil:", finalUrl);
      return result;
    } catch (err) {
      console.error("[GEN] Gagal:", err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Input 'imageUrl' wajib diisi."
    });
  }
  try {
    const api = new GridPlus();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("Terjadi kesalahan pada API:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}