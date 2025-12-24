import axios from "axios";
class Oceansaver {
  constructor() {
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
    this.iframe_source = "https://www.yt1d.app";
    this.referer = "https://p.oceansaver.in/api/card2/?url=" + encodeURIComponent("https://youtube.com/watch");
  }
  async download({
    url,
    quality: format = "360",
    iframe_source = this.iframe_source
  }) {
    try {
      console.log("[1] Fetching oEmbed info...");
      const oembed = await axios.get("https://www.youtube.com/oembed", {
        params: {
          type: "json",
          url: url
        },
        headers: {
          ...this.headers,
          origin: "https://p.oceansaver.in",
          referer: "https://p.oceansaver.in/"
        }
      });
      console.log("[1] Title:", oembed.data.title);
      console.log("[2] Inserting iframe source...");
      const insertRes = await axios.post("https://p.oceansaver.in/api/insertIframeSource", {
        source: iframe_source,
        timestamp: new Date().toISOString(),
        userAgent: this.headers["user-agent"]
      }, {
        headers: {
          ...this.headers,
          origin: "https://p.oceansaver.in",
          referer: this.referer
        }
      });
      console.log("[2] Insert iframe source status:", insertRes.data.message);
      console.log("[3] Checking iframe permission...");
      const allowRes = await axios.get("https://p.oceansaver.in/api/is-allowed-to-use-iframe", {
        params: {
          iframe_source: iframe_source
        },
        headers: {
          ...this.headers,
          referer: this.referer
        }
      });
      console.log("[3] Is allowed to use iframe:", allowRes.data.is_allowed);
      console.log("[4] Requesting download link...");
      const params = new URLSearchParams({
        button: 1,
        start: 1,
        end: 1,
        format: format,
        iframe_source: iframe_source,
        url: url
      });
      const res = await axios.get("https://p.oceansaver.in/ajax/download.php?" + params.toString(), {
        headers: {
          ...this.headers,
          referer: this.referer
        }
      });
      console.log("[4] Download data received.");
      return res.data;
    } catch (err) {
      console.error("[Download Error]", err.message);
      return null;
    }
  }
  async status({
    task_id: id
  }) {
    try {
      console.log("[Status] Checking progress for ID:", id);
      const res = await axios.get("https://p.oceansaver.in/api/progress", {
        params: {
          id: id
        },
        headers: {
          ...this.headers,
          referer: this.referer
        }
      });
      console.log("[Status] Progress:", res.data.progress);
      return res.data;
    } catch (err) {
      console.error("[Status Error]", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const action = input.action || "download";
  const params = {
    ...input
  };
  const client = new Oceansaver();
  try {
    let result;
    switch (action) {
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await client.download({
          url: params.url,
          quality: params.quality || "360"
        });
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: `Missing required field: task_id (required for ${action})`
          });
        }
        result = await client.status({
          task_id: params.task_id
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