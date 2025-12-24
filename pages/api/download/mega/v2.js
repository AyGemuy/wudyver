import axios from "axios";
import crypto from "crypto";
import {
  lookup
} from "mime-types";
class MegaDL {
  constructor() {
    this.a = axios.create();
  }
  async i(u) {
    console.log("info →", u);
    const m = u.match(/mega\.nz\/(?:#!|file\/)([a-zA-Z0-9_-]+)[!#]([a-zA-Z0-9_-]+)/);
    if (!m) throw new Error("invalid mega url");
    const [, id, k] = m;
    const {
      data
    } = await this.a.post("https://g.api.mega.co.nz/cs", [{
      a: "g",
      g: 1,
      ssl: 2,
      v: 2,
      p: id
    }], {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const f = data[0] ?? null;
    if (!f?.at) throw new Error("file not found");
    const kb = Buffer.from(k.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - k.length % 4) % 4), "base64");
    const ka = Array.from({
      length: Math.ceil(kb.length / 4)
    }, (_, i) => kb.readUInt32BE(i * 4));
    const fk = ka.length === 8 ? [ka[0] ^ ka[4], ka[1] ^ ka[5], ka[2] ^ ka[6], ka[3] ^ ka[7]] : ka.slice(0, 4);
    const kbuf = Buffer.alloc(16);
    fk.forEach((v, i) => kbuf.writeUInt32BE(v >>> 0, i * 4));
    const ea = Buffer.from(f.at.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - f.at.length % 4) % 4), "base64");
    const d = crypto.createDecipheriv("aes-128-cbc", kbuf, Buffer.alloc(16, 0));
    d.setAutoPadding(false);
    const dec = Buffer.concat([d.update(ea), d.final()]);
    const attr = dec.toString("utf8").replace(/\0+$/, "");
    const meta = attr.startsWith("MEGA{") ? JSON.parse(attr.slice(4)) : {
      n: "Unknown"
    };
    const ext = meta.n?.split(".").pop()?.toLowerCase() ?? "";
    const size = f.s === 0 ? "0 Bytes" : (() => {
      const i = Math.floor(Math.log(f.s) / Math.log(1024));
      return `${(f.s / Math.pow(1024, i)).toFixed(2)} ${[ "Bytes", "KB", "MB", "GB", "TB" ][i]}`;
    })();
    console.log("info ok →", {
      name: meta.n,
      size: size
    });
    return {
      fileId: id,
      fileName: meta.n ?? "Unknown",
      fileSize: size,
      fileSizeBytes: f.s,
      mimeType: lookup(ext) || null,
      downloadUrl: f.g
    };
  }
  async download({
    url,
    output = "json",
    ...rest
  }) {
    try {
      console.log("download →", url, {
        output: output
      });
      const info = await this.i(url);
      if (output === "json") {
        console.log("validasi download url");
        const head = await this.a.head(info.downloadUrl, rest);
        const contentLength = head.headers["content-length"] ?? null;
        console.log("json ready →", contentLength, "bytes");
        return {
          ...info,
          downloadUrlValid: !!contentLength,
          contentLength: contentLength ? parseInt(contentLength, 10) : null,
          timestamp: new Date().toISOString(),
          region: "ID",
          timezone: "WITA"
        };
      }
      console.log(`fetching full file → ${info.fileName} (${info.fileSize})`);
      const res = await this.a.get(info.downloadUrl, {
        responseType: "arraybuffer",
        ...rest
      });
      const buf = Buffer.from(res.data);
      console.log("file downloaded →", buf.length, "bytes");
      return output === "base64" ? {
        base64: buf.toString("base64"),
        info: info
      } : {
        buffer: buf,
        info: info
      };
    } catch (e) {
      console.error("download error →", e.message);
      throw new Error(e.message);
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
  const api = new MegaDL();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}