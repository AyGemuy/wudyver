import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import * as cheerio from "cheerio";
class VocalCutAiUploader {
  constructor() {
    this.url = "https://mmd.uvronline.app/upload/vocalCutAi?catch-file";
  }
  async fetchHeaders() {
    try {
      const response = await axios.get("https://x-minus.pro/ai", {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "multipart/form-data",
          origin: "https://x-minus.pro",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://x-minus.pro/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      });
      const $ = cheerio.load(response.data);
      const authKey = $("#vocal-cut-auth-key").val();
      const cookies = response.headers["set-cookie"] || [];
      return {
        authKey: authKey,
        cookies: cookies
      };
    } catch (error) {
      throw new Error("Failed to fetch headers (auth key)");
    }
  }
  async vocalCut({
    url: audioUrl,
    locale = "en_US",
    separation = "inst_vocal",
    separation_type = "vocals_music",
    format = "mp3",
    version = "3-4-0",
    model = "mdx_v2_vocft",
    aggressiveness = "2",
    lvpanning = "center",
    uvrbve_ct = "auto",
    pre_rate = "100",
    bve_preproc = "auto",
    show_setting_format = "0",
    hostname = "x-minus.pro",
    client_fp = "-",
    ...extraParams
  }) {
    try {
      const {
        authKey,
        cookies
      } = await this.fetchHeaders();
      const {
        data: fileBuffer,
        headers
      } = await axios.get(audioUrl, {
        responseType: "arraybuffer"
      });
      const ext = headers["content-type"].split("/")[1];
      const formData = new FormData();
      formData.append("auth_key", authKey);
      formData.append("locale", locale);
      formData.append("separation", separation);
      formData.append("separation_type", separation_type);
      formData.append("format", format);
      formData.append("version", version);
      formData.append("model", model);
      formData.append("aggressiveness", aggressiveness);
      formData.append("lvpanning", lvpanning);
      formData.append("uvrbve_ct", uvrbve_ct);
      formData.append("pre_rate", pre_rate);
      formData.append("bve_preproc", bve_preproc);
      formData.append("show_setting_format", show_setting_format);
      formData.append("hostname", hostname);
      formData.append("client_fp", client_fp);
      formData.append("myfile", new Blob([fileBuffer], {
        type: `audio/${ext}`
      }), `file.${ext}`);
      Object.keys(extraParams).forEach(key => formData.append(key, extraParams[key]));
      const response = await axios.post(this.url, formData, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "multipart/form-data",
          origin: "https://x-minus.pro",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://x-minus.pro/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          cookie: cookies.join("; "),
          ...formData.headers
        }
      });
      const {
        job_id
      } = response.data;
      const polling = await this.pollJobStatus(job_id, authKey);
      if (polling.status === "done") {
        const result = await this.getVocal(job_id);
        return result;
      }
    } catch (error) {
      throw new Error("Error uploading file: " + error.message);
    }
  }
  async pollJobStatus(jobId, authKey) {
    try {
      while (true) {
        const response = await axios.post("https://mmd.uvronline.app/upload/vocalCutAi?check-job-status", new URLSearchParams({
          job_id: jobId,
          auth_key: authKey,
          locale: "en_US"
        }), {
          headers: {
            accept: "*/*",
            "accept-language": "id-ID,id;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/x-www-form-urlencoded",
            origin: "https://x-minus.pro",
            pragma: "no-cache",
            priority: "u=1, i",
            referer: "https://x-minus.pro/",
            "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site",
            "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
          }
        });
        const {
          status,
          err_msg
        } = response.data;
        if (status === "done") {
          return response.data;
        }
        if (status === "failed") {
          throw new Error(`Job failed: ${err_msg}`);
        }
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
    } catch (error) {
      throw new Error("Error checking job status: " + error.message);
    }
  }
  async getRedirect(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://x-minus.pro",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://x-minus.pro/",
          "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        },
        maxRedirects: 0,
        validateStatus: status => status === 302
      });
      return response.headers.location;
    } catch (error) {
      throw new Error("Error during redirection: " + error.message);
    }
  }
  async getVocal(jobId) {
    try {
      const result = {
        vocal: await this.getRedirect(`https://mmd.uvronline.app/dl/vocalCutAi?job-id=${jobId}&stem=vocal&fmt=mp3&cdn=0`),
        other: await this.getRedirect(`https://mmd.uvronline.app/dl/vocalCutAi?job-id=${jobId}&stem=inst&fmt=mp3&cdn=0`)
      };
      return result;
    } catch (error) {
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const uploader = new VocalCutAiUploader();
  try {
    const data = await uploader.vocalCut(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}