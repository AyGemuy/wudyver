import CryptoJS from "crypto-js";
import fetch from "node-fetch";
import https from "https";
const delay = ms => new Promise(res => setTimeout(res, ms));
class EaseusGen {
  constructor(timeoutMs = 6e4) {
    this.BASE_URL = "https://video-process.easeus.com/long_to_short";
    this.AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Ind3dy5iZWpzb24uY29tIiwic3ViIjoiZGVtbyIsImlhdCI6MTc1MTUwOTc5MiwibmJmIjoxNzUxNTA5NzkyLCJleHAiOjE3NTE1OTYxOTJ9.Dr0pCPPOdlgnx4wdev2Q6VegUgmIfWfEAiwcq0a9upA";
    this.SECRET = "hg7mENfdKZdm4!Z!5@&RRB";
    this.agent = new https.Agent({
      timeout: timeoutMs,
      keepAlive: true
    });
  }
  _gR(paramsMap, url, method = "post") {
    const s = Math.floor(Date.now() / 1e3);
    const l = s + 3600;
    const f = `${s};${l}`;
    const keys = Array.from(paramsMap.keys()).sort();
    const o = keys.map(k => encodeURIComponent(k)).join(";");
    const g = keys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(paramsMap.get(k))}`).join("&");
    const y = CryptoJS.HmacSHA1(f, this.SECRET).toString(CryptoJS.enc.Hex);
    const v = method.toLowerCase();
    let path;
    try {
      const urlObj = new URL(url);
      path = urlObj.pathname;
    } catch {
      path = url.startsWith("/") ? url : `/${url}`;
    }
    const w = `${v}\n${path}\n${o}\n${g}\n`;
    const n = CryptoJS.SHA1(w).toString(CryptoJS.enc.Hex);
    const c = `sha1\n${f}\n${n}\n`;
    const u = CryptoJS.HmacSHA1(c, y).toString(CryptoJS.enc.Hex);
    return {
      "Al-Formdata-Key": o,
      "Al-Formdata-Key-Value": g,
      "Al-Keytime": f,
      "Al-Sign": u
    };
  }
  _genHeaders(paramsMap, url, method = "post") {
    const authHeaders = this._gR(paramsMap, url, method);
    return {
      Authorization: this.AUTH_TOKEN,
      ...authHeaders,
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: "https://multimedia.easeus.com",
      referer: "https://multimedia.easeus.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      priority: "u=1, i"
    };
  }
  async _req(endpoint, paramsMap, method = "post") {
    const fullUrl = endpoint.startsWith("http") ? endpoint : `${this.BASE_URL}${endpoint}`;
    const headers = this._genHeaders(paramsMap, fullUrl, method);
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    let body = "";
    for (const [key, value] of paramsMap) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    console.log(`\n[REQ] ${method.toUpperCase()} ${endpoint}`);
    console.log(`[PARAMS] ${Array.from(paramsMap.entries()).map(([ k, v ]) => `${k}=${v}`).join(", ")}`);
    const res = await fetch(fullUrl, {
      method: method.toUpperCase(),
      headers: {
        ...headers,
        "content-type": `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });
    const responseText = await res.text();
    console.log(`[RESP] Status: ${res.status}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${responseText.substring(0, 200)}`);
    }
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }
    if (json.code !== 200) {
      throw new Error(`API Error ${json.code}: ${json.msg || "Unknown error"}`);
    }
    return json.data;
  }
  async _poll(taskId, taskType, max = 30, intv = 2e3) {
    const params = new Map([
      ["task_id", taskId],
      ["task_type", taskType.toString()]
    ]);
    for (let i = 1; i <= max; i++) {
      try {
        console.log(`[POLL] Attempt ${i}/${max} for task ${taskId}`);
        const data = await this._req("/getTaskStatus", params);
        if (data.finished && data.status === "completed") {
          console.log("[POLL] Task completed!");
          return data;
        }
        console.log(`[POLL] Status: ${data.status || "processing"}, finished: ${data.finished}`);
      } catch (e) {
        console.log(`[POLL] Error: ${e.message}`);
      }
      if (i < max) {
        console.log(`[POLL] Waiting ${intv}ms...`);
        await delay(intv);
      }
    }
    throw new Error("Polling timeout");
  }
  async _getTranscript(url) {
    console.log("\n=== STARTING TRANSCRIPT PROCESS ===");
    const type = "3";
    console.log("\n[STEP 1] Upload remote video (type=3)...");
    const initParams = new Map([
      ["url", url],
      ["type", type]
    ]);
    const init = await this._req("/uploadRemoteVideo", initParams);
    console.log("[STEP 1] Response:", JSON.stringify(init, null, 2));
    const taskId1 = init.task_id;
    if (!taskId1) throw new Error("No task_id from upload");
    console.log("\n[STEP 2] Polling task status (type 0)...");
    const poll1 = await this._poll(taskId1, 0);
    console.log("[STEP 2] Poll result:", JSON.stringify(poll1, null, 2));
    const projectId = poll1.project_id;
    if (!projectId) throw new Error("No project_id from polling");
    console.log("\n[STEP 3] Generate transcript...");
    const genParams = new Map([
      ["project_id", projectId.toString()],
      ["type", type]
    ]);
    const gen = await this._req("/generateTranscript", genParams);
    console.log("[STEP 3] Response:", JSON.stringify(gen, null, 2));
    if (gen.status && gen.status !== "completed") {
      const taskId2 = gen.task_id;
      if (taskId2) {
        console.log("\n[STEP 4] Polling transcript generation (type 1)...");
        await this._poll(taskId2, 1);
      }
    }
    console.log("\n[STEP 5] Get transcript project detail...");
    const detailParams = new Map([
      ["transcript_project_id", projectId.toString()]
    ]);
    const result = await this._req("/getTranscriptProjectDetail", detailParams);
    console.log("[STEP 5] Final result received");
    return result;
  }
  async _getSummary(url) {
    console.log("\n=== STARTING SUMMARY PROCESS ===");
    const type = "4";
    console.log("\n[STEP 1] Upload remote video (type=4)...");
    const initParams = new Map([
      ["url", url],
      ["type", type]
    ]);
    const init = await this._req("/uploadRemoteVideo", initParams);
    console.log("[STEP 1] Response:", JSON.stringify(init, null, 2));
    let projectId = init.project_id;
    if (!projectId && init.task_id) {
      console.log("[STEP 1] Using task_id to get project_id via polling...");
      const poll1 = await this._poll(init.task_id, 0);
      projectId = poll1.project_id;
    }
    if (!projectId) {
      throw new Error("No project_id from upload");
    }
    console.log("\n[STEP 2] Generate transcript for summary...");
    const genParams = new Map([
      ["project_id", projectId.toString()],
      ["type", type]
    ]);
    const gen = await this._req("/generateTranscript", genParams);
    console.log("[STEP 2] Response:", JSON.stringify(gen, null, 2));
    console.log("[STEP 2] Waiting for summary processing...");
    await delay(3e3);
    console.log("\n[STEP 3] Get summary project detail...");
    const detailParams = new Map([
      ["summary_project_id", projectId.toString()]
    ]);
    const result = await this._req("/getSummaryProjectDetail", detailParams);
    console.log("[STEP 3] Final result received");
    return result;
  }
  async generate({
    mode = "transcript",
    url
  }) {
    if (!url || !url.startsWith("http")) {
      throw new Error("URL harus valid dan dimulai dengan http/https");
    }
    console.log(`\n🚀 START ${mode.toUpperCase()} PROCESS`);
    console.log(`📹 URL: ${url}`);
    try {
      let result;
      if (mode.toLowerCase() === "transcript") {
        result = await this._getTranscript(url);
      } else if (mode.toLowerCase() === "summary") {
        result = await this._getSummary(url);
      } else {
        throw new Error('Mode harus "transcript" atau "summary"');
      }
      const detail = mode.toLowerCase() === "transcript" ? result.transcript_project_detail : result.summary_detail;
      return {
        title: result.title,
        thumbnail: result.thumbnail,
        duration: result.duration,
        detail: detail
      };
    } catch (err) {
      console.error(`❌ ${mode} failed:`, err.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Paramenter 'url' wajib diisi."
    });
  }
  try {
    const api = new EaseusGen();
    const response = await api.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}