import {
  File
} from "megajs";
import {
  lookup
} from "mime-types";
class MegaDL {
  constructor() {
    this.t = new Date().toISOString();
    this.r = "ID";
    this.z = "WITA";
  }
  s(b) {
    if (b === 0) return "0 Bytes";
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(2)} ${[ "Bytes", "KB", "MB", "GB", "TB" ][i]}`;
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
      const u = decodeURIComponent(url);
      if (!u) throw new Error("File URL is required");
      const f = File.fromURL(u);
      console.log("load attributes →", f.fileId ?? "unknown");
      await f.loadAttributes();
      const name = f.name ?? "Unknown";
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      const size = this.s(f.size ?? 0);
      const mime = lookup(ext) || "application/octet-stream";
      const info = {
        fileId: f.fileId ?? null,
        fileName: name,
        fileSize: size,
        fileSizeBytes: f.size ?? 0,
        mimeType: mime,
        downloadUrl: f.url ?? null,
        downloadUrlValid: !!f.url,
        contentLength: f.size ?? null,
        timestamp: this.t,
        region: this.r,
        timezone: this.z
      };
      if (output === "json") {
        console.log("json ready →", info.fileName, info.fileSize);
        return info;
      }
      console.log(`downloading full → ${info.fileName} (${info.fileSize})`);
      const buf = await f.downloadBuffer();
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