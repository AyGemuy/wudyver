import axios from "axios";
import Encoder from "@/lib/encoder";
class Y2MateDownloader {
  constructor(domain = "random") {
    this.domains = ["https://content-cdn.y2mate.app", "https://bzhve.y2mate.app"];
    this.baseUrl = this.resolveBaseUrl(domain);
    this.commonHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      pragma: "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  resolveBaseUrl(domain) {
    if (domain === "random") {
      const random = this.domains[Math.floor(Math.random() * this.domains.length)];
      console.log("[Y2Mate] Random CDN Selected:", random);
      return random;
    }
    if (this.domains.includes(domain)) return domain;
    return this.domains[0];
  }
  async download({
    url,
    quality = "360"
  }) {
    try {
      const analyzeUrl = `${this.baseUrl}/mates/analyzeV2/ajax`;
      const analyzeData = new URLSearchParams({
        k_query: url,
        k_page: "home",
        hl: "en",
        q_auto: "0"
      }).toString();
      const analyzeResponse = await axios.post(analyzeUrl, analyzeData, {
        headers: {
          ...this.commonHeaders,
          referer: `${this.baseUrl}/en102`
        }
      });
      const analyzeResult = analyzeResponse.data;
      if (analyzeResult.status !== "ok") throw new Error(analyzeResult.mess || "Gagal analisis");
      const videoId = analyzeResult.vid;
      let b_id = null;
      if (analyzeResult.links?.mp4?.[quality]) {
        b_id = analyzeResult.links.mp4[quality].k;
      } else if (analyzeResult.links?.mp3?.[quality]) {
        b_id = analyzeResult.links.mp3[quality].k;
      }
      if (!b_id) {
        const available = {
          video: Object.keys(analyzeResult.links?.mp4 || {}),
          audio: Object.keys(analyzeResult.links?.mp3 || {})
        };
        throw new Error(`Quality '${quality}' tidak tersedia. Format tersedia: ${JSON.stringify(available)}`);
      }
      const convertUrl = `${this.baseUrl}/mates/convertV2/pool`;
      const convertData = new URLSearchParams({
        vid: videoId,
        b_id: b_id
      }).toString();
      const convertResponse = await axios.post(convertUrl, convertData, {
        headers: {
          ...this.commonHeaders,
          referer: `${this.baseUrl}/youtube/${videoId}`
        }
      });
      const convertResult = convertResponse.data;
      if (convertResult.status !== "ok") throw new Error(convertResult.mess || "Gagal konversi");
      const text = {
        ...analyzeResult,
        ...convertResult,
        vid: videoId,
        b_id: b_id
      };
      const task_id = await this.enc(text);
      return {
        status: true,
        task_id: task_id
      };
    } catch (err) {
      console.error("[Y2Mate][Download] Error:", err.message);
      return {
        status: false,
        message: err.message
      };
    }
  }
  async status({
    task_id
  }) {
    try {
      const json = await this.dec(task_id);
      if (!json) throw new Error("Gagal decrypt task_id (hasil kosong)");
      const parsed = json;
      const {
        vid: videoId,
        b_id
      } = parsed;
      if (!b_id || !videoId) throw new Error("Isi task_id tidak valid");
      const statusUrl = `${this.baseUrl}/mates/convertV2/pool`;
      const statusData = new URLSearchParams({
        vid: videoId,
        b_id: b_id
      }).toString();
      const statusResponse = await axios.post(statusUrl, statusData, {
        headers: {
          ...this.commonHeaders,
          referer: `${this.baseUrl}/youtube/${videoId}`
        }
      });
      const statusResult = statusResponse.data;
      if (statusResult.status !== "ok") throw new Error(statusResult.mess || "Status gagal");
      return {
        status: true,
        ...parsed,
        ...statusResult
      };
    } catch (err) {
      console.error("[Y2Mate][Status] Error:", err.message);
      return {
        status: false,
        message: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const input = req.method === "GET" ? req.query : req.body;
  const action = input.action || "download";
  const params = {
    ...input
  };
  const y2mate = new Y2MateDownloader();
  try {
    let result;
    switch (action) {
      case "download":
        if (!params.url) {
          return res.status(400).json({
            error: `Missing required field: url (required for ${action})`
          });
        }
        result = await y2mate.download({
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
        result = await y2mate.status({
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