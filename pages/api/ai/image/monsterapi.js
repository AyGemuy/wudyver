import axios from "axios";
import {
  randomBytes
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
class MonsterAPI {
  constructor(authToken = "trailUser") {
    this.baseURL = "https://eksbackend.monsterapi.ai/v2playground";
    this.authToken = authToken;
    this.defaultGenerationData = {
      model: "txt2img",
      data: {
        negprompt: "deformed, bad anatomy, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, disgusting, poorly drawn hands, missing limb, floating limbs, disconnected limbs, malformed hands, blurry, mutated hands, fingers",
        samples: 1,
        steps: 15,
        aspect_ratio: "portrait",
        guidance_scale: 7.5,
        prompt: "Surreal and fantastic composition, portrait of Anna Sawai, messy hair, WhisperingHorrorCore, perfect anatomy, centered, close to perfection, dynamic, very detailed, artstation, concept art, soft and sharp focus, illustration, art by Carne Griffiths , Wadim Kashin, Harrison Fisher, Brian Froud and Jeremy Mann, graffiti airbrush techniques, high definition accent lighting contrasted with bright paint colors, artgerm, octane.",
        style: "futuristic"
      }
    };
  }
  _randomID(length = 16) {
    return randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
  }
  _buildSpoofHeaders(extra = {}) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9",
      authorization: this.authToken,
      "content-type": "application/json",
      origin: "https://monsterapi.ai",
      priority: "u=1, i",
      referer: "https://monsterapi.ai/",
      rid: "anti-csrf",
      "sec-ch-ua": `"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"`,
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": `"Android"`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-request-id": this._randomID(8),
      ...SpoofHead(),
      ...extra
    };
    return headers;
  }
  async generate(options = {}) {
    const payload = {
      model: options.model || this.defaultGenerationData.model,
      data: {
        ...this.defaultGenerationData.data
      }
    };
    for (const key in options) {
      if (options.hasOwnProperty(key)) {
        if (key !== "model" && key !== "data") {
          payload.data[key] = options[key];
        } else if (key === "data") {
          payload.data = {
            ...payload.data,
            ...options.data
          };
        }
      }
    }
    const url = `${this.baseURL}/generate/processId`;
    const requestHeaders = this._buildSpoofHeaders();
    try {
      const response = await axios.post(url, payload, {
        headers: requestHeaders
      });
      if (response.data && response.data.http_code === 200) {
        return await this.waitForCompletion(response.data.data.process_id);
      } else {
        throw new Error(`Gagal generate: ${response.data.message || "Respons tidak valid"}`);
      }
    } catch (error) {
      console.error("Error saat generate:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async pollStatus(processId, customPayload = {}) {
    const url = `${this.baseURL}/check-status`;
    const payload = {
      process_id: processId,
      ...customPayload
    };
    const requestHeaders = this._buildSpoofHeaders();
    try {
      const response = await axios.post(url, payload, {
        headers: requestHeaders
      });
      if (response.data && response.data.http_code === 200 && response.data.data) {
        const status_data = response.data.data.data;
        if (status_data) {
          console.log(`Task ID: ${processId}, Status: ${status_data.status}`);
          return status_data;
        } else {
          throw new Error(`Gagal parse data status: ${response.data.data.message || 'Data "data" bersarang tidak ditemukan'}`);
        }
      } else {
        throw new Error(`Gagal cek status: ${response.data.message || "Respons tidak valid atau http_code bukan 200"}`);
      }
    } catch (error) {
      console.error("Error saat polling status:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async waitForCompletion(processId, interval = 3e3, timeout = 6e5, pollCustomPayload = {}) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const check = setInterval(async () => {
        if (Date.now() - startTime > timeout) {
          clearInterval(check);
          return reject(new Error("Polling timeout. Task took too long to complete."));
        }
        try {
          const statusResult = await this.pollStatus(processId, pollCustomPayload);
          console.log(`Task ID: ${processId}, Status: ${statusResult.status}`);
          if (statusResult.status === "COMPLETED") {
            clearInterval(check);
            console.log(`Task ID: ${processId}, Result:`, statusResult.result);
            resolve(statusResult.result);
          } else if (statusResult.status === "FAILED") {
            clearInterval(check);
            return reject(new Error(`Task failed: ${statusResult.message || "Unknown error"}`));
          }
        } catch (error) {
          clearInterval(check);
          return reject(error);
        }
      }, interval);
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const api = new MonsterAPI();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}