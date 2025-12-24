import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import WebSocket from "ws";
class AnonSaver {
  constructor() {
    this.jar = new CookieJar();
    this.headers = {
      authority: "anonsaver.com",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      origin: "https://anonsaver.com",
      referer: "https://anonsaver.com/en/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      priority: "u=1, i"
    };
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: this.headers
    }));
  }
  async _req(url, opts = {}) {
    try {
      console.log(`[log] GET: ${url.split("?")[0]}`);
      return await this.client.get(url, opts);
    } catch (e) {
      console.error(`[err] GET: ${e.message}`);
      return null;
    }
  }
  async _post(url, data) {
    try {
      console.log(`[log] POST: ${url.split("?")[0]} [len:${data.length}]`);
      return await this.client.post(url, data, {
        headers: {
          "content-type": "text/plain;charset=UTF-8"
        }
      });
    } catch (e) {
      console.error(`[err] POST: ${e.message}`);
      return null;
    }
  }
  _t() {
    return Math.random().toString(36).substring(2, 9);
  }
  _cdn(raw, filename = "") {
    if (!raw) return null;
    return `https://cdn.anonsaver.com/img.php?url=${encodeURIComponent(raw)}&filename=${filename}`;
  }
  _ws(sid, token, targetUrl) {
    return new Promise((resolve, reject) => {
      try {
        const cookie = this.jar.getCookieStringSync("https://anonsaver.com");
        const url = `wss://anonsaver.com/socket.io/?EIO=4&transport=websocket&sid=${sid}`;
        console.log(`[log] WS Start: ${sid}`);
        const ws = new WebSocket(url, {
          headers: {
            ...this.headers,
            Cookie: cookie,
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
            "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
          }
        });
        let done = false;
        ws.on("open", () => ws.send("2probe"));
        ws.on("message", msg => {
          const str = msg.toString();
          if (str === "2") {
            ws.send("3");
            return;
          }
          if (str === "3probe") {
            console.log("[log] WS Probe OK. Upgrading...");
            ws.send("5");
            setTimeout(() => {
              ws.send(`42["search",{"date":${Date.now()},"token":"${token}","requestType":"2","linkValue":"${targetUrl}"}]`);
            }, 500);
          }
          if (str.startsWith('42["searchResult"')) {
            console.log("[log] Result Received");
            done = true;
            try {
              const rawJson = JSON.parse(str.substring(2));
              const coreData = rawJson?.[1]?.data?.data || {};
              ws.close();
              resolve(coreData);
            } catch (err) {
              ws.close();
              reject(err);
            }
          }
        });
        ws.on("error", reject);
        ws.on("close", c => !done && reject(new Error(`WS Closed: ${c}`)));
      } catch (e) {
        reject(e);
      }
    });
  }
  async download({
    url,
    ...rest
  }) {
    const start = Date.now();
    console.log(`[proc] Processing: ${url}`);
    try {
      await this._req("https://anonsaver.com/");
      const r1 = await this._req("https://anonsaver.com/connect/");
      const token = r1?.data?.token;
      if (!token) throw new Error("No Token");
      const t = this._t();
      const r2 = await this._req(`https://anonsaver.com/socket.io/?EIO=4&transport=polling&t=${t}`, {
        responseType: "text"
      });
      const sid = JSON.parse(r2?.data?.substring(1) || "{}")?.sid;
      if (!sid) throw new Error("No SID");
      await this._post(`https://anonsaver.com/socket.io/?EIO=4&transport=polling&t=${this._t()}&sid=${sid}`, "40");
      const raw = await this._ws(sid, token, url);
      const downloadList = [];
      const items = raw.items || [];
      for (const item of items) {
        const links = item.downloadLink || [];
        for (const link of links) {
          const fname = link.filename || `anonsaver_${raw.id || Date.now()}.mp4`;
          downloadList.push({
            type: item.type,
            filename: fname,
            thumbnail: this._cdn(item.imageSrc),
            url: this._cdn(link.value, fname)
          });
        }
      }
      return {
        status: true,
        time: `${((Date.now() - start) / 1e3).toFixed(2)}s`,
        id: raw.id,
        username: raw.username,
        caption: raw.text,
        taken_at: raw.takenAt,
        stats: {
          views: raw.countViews,
          likes: raw.countLikes,
          comments: raw.countComments
        },
        download: downloadList,
        ...rest
      };
    } catch (e) {
      console.error(`[fail] ${e.message}`);
      return {
        status: false,
        msg: e.message
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
  const api = new AnonSaver();
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