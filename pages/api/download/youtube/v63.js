import crypto from "crypto";
import fetch from "node-fetch";
class YT {
  constructor() {}
  url() {
    try {
      return "https://v1.yt1s.biz";
    } catch (e) {
      console.error("Error in url:", e);
      throw e;
    }
  }
  headers() {
    try {
      return {
        accept: "application/json, text/plain, */*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        origin: this.url()
      };
    } catch (e) {
      console.error("Error in headers:", e);
      throw e;
    }
  }
  validate(str) {
    try {
      if (typeof str !== "string" || !str?.trim()?.length) {
        throw new Error("Input tidak boleh kosong");
      }
    } catch (e) {
      console.error("Error in validate:", e.message);
      throw e;
    }
  }
  getVideoId(url) {
    try {
      this.validate(url);
      const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
      throw new Error("URL YouTube tidak valid atau tidak mengandung Video ID");
    } catch (e) {
      console.error("Error in getVideoId:", e.message);
      throw e;
    }
  }
  format(userFormat) {
    try {
      const formats = ["64kbps", "96kbps", "128kbps", "256kbps", "320kbps", "144p", "240p", "360p", "480p", "720p", "1080p"];
      if (!formats.includes(userFormat)) {
        throw new Error(`Format tidak valid. Pilih dari: ${formats.join(", ")}`);
      }
      const path = /p$/.test(userFormat) ? "/video" : "/audio";
      const quality = userFormat.match(/\d+/)[0];
      return {
        path: path,
        quality: quality
      };
    } catch (e) {
      console.error("Error in format:", e.message);
      throw e;
    }
  }
  async req(url, opts, returnType = "json") {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) {
        throw new Error(`${r.status} ${r.statusText} ${await r.text() || ""}`);
      }
      return returnType === "json" ? r.json() : {
        headers: r.headers
      };
    } catch (e) {
      console.error(`Request failed:`, e);
      throw e;
    }
  }
  async token() {
    try {
      console.log("[Getting session token]");
      const {
        headers
      } = await this.req("https://fast.dlsrv.online/", {
        headers: this.headers()
      }, "headers");
      const session = headers.get("x-session-token");
      if (!session) throw new Error("Gagal mendapatkan session token");
      console.log("[Session token acquired]");
      return session;
    } catch (e) {
      console.error("Error getting token:", e.message);
      throw e;
    }
  }
  pow(session, path) {
    try {
      let nonce = 0;
      console.log("[Executing Proof of Work]");
      while (true) {
        const data = `${session}:${path}:${nonce}`;
        const powHash = crypto.createHash("SHA256").update(data).digest("hex");
        if (powHash.startsWith("0000")) {
          console.log("[Proof of Work successful]");
          return {
            nonce: nonce.toString(),
            powHash: powHash
          };
        }
        nonce++;
      }
    } catch (e) {
      console.error("Error in pow:", e.message);
      throw e;
    }
  }
  sign(session, path, timestamp) {
    try {
      const data = `${session}:${path}:${timestamp}`;
      const key = "a8d4e2456d59b90c8402fc4f060982aa";
      return crypto.createHmac("SHA256", key).update(data).digest("hex");
    } catch (e) {
      console.error("Error in sign:", e.message);
      throw e;
    }
  }
  async search({
    query,
    ...rest
  }) {
    try {
      this.validate(query);
      console.log(`[Searching for: "${query}"]`);
      const api = new URL("https://me0xn4hy3i.execute-api.us-east-1.amazonaws.com/staging/api/resolve/resolveYoutubeSearch");
      api.searchParams.set("search", query);
      const json = await this.req(api);
      if (!json?.data?.[0]?.videoId) throw new Error("Video tidak ditemukan.");
      console.log(`[Found]: ${json.data[0].title}`);
      return json.data;
    } catch (e) {
      console.error("Error during search:", e.message);
      throw e;
    }
  }
  async download({
    url,
    format: userFormat = "128kbps",
    ...rest
  }) {
    try {
      const videoId = this.getVideoId(url);
      console.log(`[Initiating download for videoId: ${videoId} with format: ${userFormat}]`);
      const {
        path,
        quality
      } = this.format(userFormat);
      const session = await this.token();
      const timestamp = Date.now().toString();
      const signature = this.sign(session, path, timestamp);
      const {
        nonce,
        powHash
      } = this.pow(session, path);
      const headers = {
        ...this.headers(),
        "content-type": "application/json",
        "x-api-auth": "Ig9CxOQPYu3RB7GC21sOcgRPy4uyxFKTx54bFDu07G3eAMkrdVqXY9bBatu4WqTpkADrQ",
        "x-session-token": session,
        "x-signature": signature,
        "x-signature-timestamp": timestamp,
        nonce: nonce,
        powhash: powHash
      };
      const body = JSON.stringify({
        videoId: videoId,
        quality: quality
      });
      console.log("[Requesting download link]");
      const result = await this.req(`https://fast.dlsrv.online/gateway/${path}`, {
        headers: headers,
        body: body,
        method: "post"
      });
      console.log("[Download link received]");
      return result;
    } catch (e) {
      console.error("Error during download:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const action = input.action || "download";
  const params = {
    ...input
  };
  const yt = new YT();
  try {
    let result;
    switch (action) {
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await yt.download({
          url: params.url,
          format: params.format || "360p"
        });
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await yt.search({
          query: params.query
        });
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: download | status`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}