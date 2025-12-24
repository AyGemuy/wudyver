import axios from "axios";
import FormData from "form-data";
import {
  EventSource
} from "eventsource";
class FrogLeo {
  constructor() {
    this.host = "https://frogleo-ai-clothes-changer.hf.space";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.hdr = {
      accept: "*/*",
      origin: "https://www.aiclotheschanger.org",
      referer: "https://www.aiclotheschanger.org/",
      "user-agent": this.ua
    };
  }
  log(msg) {
    console.log(`[FrogLeo] ${msg}`);
  }
  rnd() {
    return Math.random().toString(36).substring(2);
  }
  async buf(inp) {
    try {
      return Buffer.isBuffer(inp) ? inp : typeof inp === "string" && inp.startsWith("http") ? (await axios.get(inp, {
        responseType: "arraybuffer"
      })).data : Buffer.from(inp, "base64");
    } catch (e) {
      this.log(`BufErr: ${e.message}`);
      return null;
    }
  }
  async up(file) {
    try {
      this.log("Uploading resource...");
      const fd = new FormData();
      fd.append("files", file, "blob");
      const res = await axios.post(`${this.host}/upload`, fd, {
        headers: {
          ...this.hdr,
          ...fd.getHeaders()
        }
      });
      return res?.data?.[0];
    } catch (e) {
      throw new Error(`UpFail: ${e.message}`);
    }
  }
  async join(sPath, tPath, hash, opts = {}) {
    try {
      this.log("Joining queue...");
      const pl = {
        data: [{
          path: sPath,
          meta: {
            _type: "gradio.FileData"
          }
        }, {
          path: tPath,
          meta: {
            _type: "gradio.FileData"
          }
        }, opts.denoise || 30, opts.seed || 42],
        fn_index: 2,
        session_hash: hash
      };
      await axios.post(`${this.host}/queue/join?`, pl, {
        headers: this.hdr
      });
    } catch (e) {
      throw new Error(`JoinFail: ${e.message}`);
    }
  }
  async listen(hash) {
    return new Promise((resolve, reject) => {
      this.log("Waiting for EventSource...");
      const url = `${this.host}/queue/data?session_hash=${hash}`;
      const es = new EventSource(url, {
        headers: this.hdr
      });
      es.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg === "process_completed") {
            this.log("Process completed");
            es.close();
            resolve(data?.output);
          } else if (data.msg === "close_stream") {
            es.close();
            resolve(null);
          }
        } catch (e) {}
      };
      es.onerror = err => {
        es.close();
        reject(new Error("EventSource Error"));
      };
    });
  }
  async generate({
    source,
    target,
    ...rest
  }) {
    try {
      const sid = this.rnd();
      this.log(`ID: ${sid}`);
      const inputs = [source, target];
      const paths = [];
      for (const inp of inputs) {
        const buffer = await this.buf(inp);
        if (!buffer) throw new Error("Failed to process input buffer");
        const path = await this.up(buffer);
        if (!path) throw new Error("Failed to upload file");
        paths.push(path);
      }
      const [sPath, tPath] = paths;
      await this.join(sPath, tPath, sid, rest);
      return await this.listen(sid);
    } catch (e) {
      this.log(e.message);
      return {
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source || !params.target) {
    return res.status(400).json({
      error: "source and target images are required"
    });
  }
  try {
    const api = new FrogLeo();
    const result = await api.generate(params);
    if (!result) {
      return res.status(500).json({
        error: "Image generation failed"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}