import WebSocket from "ws";
import crypto from "crypto";
import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import https from "https";
import SpoofHead from "@/lib/spoof-head";
class AyeSoulChat {
  constructor() {
    this.url = "wss://goto.ayesoul.com/";
    this.origin = "https://ayesoul.com";
    this.headers = {
      "user-agent": "Postify/1.0.0",
      origin: this.origin,
      referer: `${this.origin}/`,
      accept: "*/*",
      connection: "keep-alive",
      ...SpoofHead()
    };
    this.results = {};
  }
  async uploadImage(imageUrl) {
    console.log(`[UPLOAD] Fetching image from: ${imageUrl}`);
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(response.data);
      const contentType = response.headers["content-type"];
      const imageName = `IMG-${Date.now()}.jpg`;
      console.log(`[UPLOAD] Preparing image for upload...`);
      const form = new FormData();
      form.append("file", new Blob([imageBuffer], {
        type: contentType
      }), imageName);
      const xcs = `${this.genId(7)}-|BANKAI|-${this.genId(7)}`;
      console.log(`[UPLOAD] Sending image to AyeSoul API...`);
      const uploadResponse = await axios.post("https://ayesoul.com/api/attachgoto", form, {
        headers: {
          ...form.headers,
          accept: "*/*",
          origin: this.origin,
          "x-cache-sec": xcs,
          ...SpoofHead()
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          keepAlive: true,
          timeout: 6e4
        }),
        timeout: 6e4,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      console.log(`[UPLOAD] Upload successful. File ID: ${uploadResponse.data.file_id}`);
      return {
        file_id: uploadResponse.data.file_id,
        imageName: imageName,
        contentType: contentType
      };
    } catch (error) {
      console.error(`[UPLOAD ERROR] ${error.message}`);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }
  async chat({
    prompt = "halo",
    follow_up = false,
    id,
    question = null,
    answer = null,
    imageUrl = null
  } = {}) {
    const dateNow = new Date();
    const formattedDate = dateNow.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    let payload = {
      event: prompt,
      dateObject: formattedDate,
      currentDateTimeISOString: dateNow.toISOString(),
      id: this.genId(),
      "x-cache-sec": `${this.genId(7)}-|BANKAI|-${this.genId(7)}`,
      chin_tapak_dum_dum: {
        cf_config: {
          unos: "",
          dos: "",
          tres: "",
          chin: ""
        }
      },
      nostal: follow_up && id ? [{
        id: id,
        rank: 1,
        question: question,
        answer: answer
      }] : [],
      ultra_mode: true,
      customExcludeList: []
    };
    if (imageUrl) {
      const {
        file_id,
        imageName,
        contentType
      } = await this.uploadImage(imageUrl);
      payload.attach = [{
        file_id: file_id,
        name: imageName,
        type: contentType.split("/")[1],
        mime: contentType
      }];
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, {
        headers: this.headers
      });
      ws.on("open", () => {
        ws.send(JSON.stringify({
          input: JSON.stringify(payload)
        }));
      });
      const tempResults = {};
      ws.on("message", data => {
        let res = JSON.parse(data.toString());
        let key = this.mapStatus(res.status);
        if (key) {
          tempResults[key] = tempResults[key] || [];
          tempResults[key].push(typeof res.message === "object" ? JSON.stringify(res.message) : res.message);
        }
        if (res.status === "SOUL XOver") {
          this.results = Object.fromEntries(Object.entries(tempResults).map(([key, messages]) => [key, messages.join("")]).filter(([, value]) => value.trim() !== ""));
          for (let k in this.results) {
            try {
              this.results[k] = JSON.parse(this.results[k]);
            } catch {}
          }
          ws.close();
        }
      });
      ws.on("close", () => {
        if (Object.keys(this.results).length === 0) {
          this.results = Object.fromEntries(Object.entries(tempResults).map(([key, messages]) => [key, messages.join("")]).filter(([, value]) => value.trim() !== ""));
          for (let k in this.results) {
            try {
              this.results[k] = JSON.parse(this.results[k]);
            } catch {}
          }
        }
        resolve(this.results);
      });
      ws.on("error", reject);
    });
  }
  genId(length = 21) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
    return Array.from({
      length: length
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  mapStatus(status) {
    return {
      "SOUL XLyze": "analyze",
      "SOUL XCon": "context",
      "SOUL XCraft": "answer",
      "SOUL XOver": "finished",
      "SOUL XErr": "error",
      "SOUL XStream": "stream",
      "SOUL XDots": "dots",
      "SOUL XMeta": "metadata",
      "SOUL XImage": "image",
      "SOUL XType": "type",
      "SOUL Step": "step",
      "sOUL stock": "stock_chart"
    } [status] || null;
  }
  randomIP() {
    return Array.from({
      length: 4
    }, () => Math.floor(Math.random() * 256)).join(".");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const ayeSoul = new AyeSoulChat();
  try {
    const data = await ayeSoul.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}