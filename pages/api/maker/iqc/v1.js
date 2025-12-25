import axios from "axios";
class IQCGenerator {
  constructor() {
    this.timeFmt = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta"
    });
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.cfg = {
      1: {
        url: "https://anabot.my.id/api/maker/iqc",
        method: "GET",
        headers: {
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          Referer: "https://berrymodapeka.edgeone.app/",
          "Accept-Language": "id-ID",
          "sec-ch-ua-platform": '"Android"'
        },
        buildPayload: (params, defTime) => ({
          ...params,
          text: params.text || "Halo",
          chatTime: params.chatTime || defTime,
          statusBarTime: params.statusBarTime || params.chatTime || defTime,
          signalName: params.signalName || params.carrierName || "XL",
          bubbleColor: params.bubbleColor || "#272A2F",
          menuColor: params.menuColor || "#272A2F",
          textColor: params.textColor || "#FFFFFF",
          fontName: params.fontName || "Arial",
          apikey: params.apikey || "freeApikey"
        })
      },
      2: {
        url: "https://brat.siputzx.my.id/iphone-quoted",
        method: "GET",
        headers: {
          "accept-language": "id-ID",
          referer: "https://berrymodapeka.edgeone.app/",
          "sec-ch-ua-platform": '"Android"'
        },
        buildPayload: (params, defTime) => ({
          ...params,
          messageText: params.messageText || params.text || "Halo",
          time: params.time || params.chatTime || defTime,
          carrierName: params.carrierName || "Telkomsel",
          batteryPercentage: params.batteryPercentage || "92",
          signalStrength: params.signalStrength || "4",
          emojiStyle: params.emojiStyle || "apple"
        })
      },
      3: {
        url: "https://iqc.anisaofc.my.id/api/generate-iqc",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://iqc.anisaofc.my.id/"
        },
        buildPayload: (params, defTime) => ({
          text: params.text || "Test",
          chatTime: params.chatTime || defTime,
          statusBarTime: params.statusBarTime || defTime,
          ...params
        })
      }
    };
  }
  log(hostId, msg) {
    console.log(`[IQC-Host-${hostId}] -> ${msg}`);
  }
  async _exec(hostId, params) {
    const config = this.cfg[hostId];
    if (!config) throw new Error(`Host configuration ${hostId} not found`);
    const now = this.timeFmt.format(new Date());
    const payload = config.buildPayload(params, now);
    const axiosOpts = {
      method: config.method,
      url: config.url,
      headers: {
        "User-Agent": this.ua,
        ...config.headers
      },
      responseType: "arraybuffer",
      timeout: 1e4
    };
    if (config.method === "GET") axiosOpts.params = payload;
    else axiosOpts.data = payload;
    this.log(hostId, `Requesting...`);
    const res = await axios(axiosOpts);
    if (!res.data) throw new Error("Empty data received");
    return {
      buffer: Buffer.from(res.data),
      contentType: res.headers["content-type"] || "image/png",
      hostUsed: hostId
    };
  }
  async generate({
    host,
    ...rest
  }) {
    let hostsToTry = host ? [host] : Object.keys(this.cfg).map(Number);
    let lastError = null;
    for (const targetHost of hostsToTry) {
      try {
        const result = await this._exec(targetHost, rest);
        this.log(targetHost, `Success! Size: ${result.buffer.length}`);
        return result;
      } catch (e) {
        const code = e.response?.status || e.code || "UNKNOWN";
        this.log(targetHost, `Failed (${code}).`);
        lastError = e;
      }
    }
    console.error("[IQC] All hosts failed.");
    return {
      buffer: null,
      contentType: null,
      error: lastError?.message
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new IQCGenerator();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}