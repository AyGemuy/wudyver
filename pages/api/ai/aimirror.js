import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import Encoder from "@/lib/encoder";
const genRandHash = () => {
  const hexChars = "0123456789abcdef";
  return Array.from({
    length: 16
  }, () => hexChars[Math.random() < .05 ? 10 : Math.floor(Math.random() * hexChars.length)]).join("");
};
class AIMirrorClient {
  constructor(log = false) {
    this._BASE_URL = "https://be.aimirror.fun";
    this._UID = genRandHash();
    this._log = log === true;
    this._hash = "";
    this._imageKey = "";
    this._HEADERS = {
      "User-Agent": "AIMirror/6.8.4+179 (android)",
      store: "googleplay",
      uid: this._UID,
      env: "PRO",
      "accept-language": "en",
      "accept-encoding": "gzip",
      "package-name": "com.ai.polyverse.mirror",
      host: "be.aimirror.fun",
      "content-type": "application/json",
      "app-version": "6.8.4+179"
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
  l(processName, msg) {
    if (this._log) {
      console.log(`[${processName}] ${msg}`);
    }
  }
  _s1(str) {
    if (!str || typeof str !== "string") throw new Error("Invalid input for _s1");
    return crypto.createHash("sha1").update(str, "utf8").digest("hex");
  }
  _wE(hexHash, ext = ".jpg") {
    if (!hexHash) throw new Error("Invalid hash for _wE");
    return `${hexHash}${ext}`;
  }
  async _uB(imageUrl, headers = {}) {
    if (Buffer.isBuffer(imageUrl)) {
      return imageUrl;
    } else if (typeof imageUrl === "string") {
      if (imageUrl.startsWith("data:")) {
        this.l("_uB", `Converting base64 string to Buffer`);
        const base64Data = imageUrl.split(",")[1] || "";
        return Buffer.from(base64Data, "base64");
      }
      this.l("_uB", `Downloading image from URL`);
      try {
        const res = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          headers: headers,
          timeout: 2e4
        });
        return Buffer.from(res.data);
      } catch (err) {
        throw new Error(`_uB failed. Status: ${err.response?.status || "N/A"}. Message: ${err.message}`);
      }
    }
    throw new Error("Invalid imageUrl type. Must be URL, Base64 string, or Buffer.");
  }
  async _fT() {
    if (!this._hash) throw new Error("Hash not set before _fT");
    const url = `${this._BASE_URL}/app_token/v2`;
    const params = {
      cropped_image_hash: this._wE(this._hash),
      uid: this._UID
    };
    this.l("_fT", `Params: ${JSON.stringify(params)}`);
    try {
      const res = await axios.get(url, {
        params: params,
        headers: this._HEADERS,
        timeout: 1e4
      });
      this.l("_fT", `Token fetched`);
      return res.data;
    } catch (err) {
      throw new Error(`_fT failed. Status: ${err.response?.status || 0} | Message: ${err.message}`);
    }
  }
  async _uP(payload = {}) {
    const requiredFields = ["key", "policy", "OSSAccessKeyId", "signature", "file", "upload_host"];
    for (const f of requiredFields)
      if (!(f in payload)) throw new Error(`_uP: missing field ${f}`);
    const body = new FormData();
    body.append("name", payload.name ? payload.name : "noname.jpg");
    body.append("key", payload.key);
    body.append("policy", payload.policy);
    body.append("OSSAccessKeyId", payload.OSSAccessKeyId);
    body.append("success_action_status", payload.success_action_status ? payload.success_action_status : "200");
    body.append("signature", payload.signature);
    body.append("backend_type", payload.backend_type ? payload.backend_type : "OSS");
    body.append("region", payload.region ? payload.region : "ap-south-1");
    body.append("file", payload.file, {
      filename: this._wE(this._hash),
      contentType: "application/octet-stream"
    });
    const headers = {
      "User-Agent": "Dart/3.6 (dart:io)",
      "Accept-Encoding": "gzip"
    };
    try {
      this.l("_uP", `Uploading to ${payload.upload_host}`);
      const res = await axios.post(payload.upload_host, body, {
        headers: {
          ...body.getHeaders(),
          ...headers
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 1e4
      });
      this.l("_uP", `Upload response received`);
      return res.data;
    } catch (err) {
      throw new Error(`_uP failed. Status: ${err.response?.status || 0} | Message: ${err.message}`);
    }
  }
  async _rD(payload) {
    const url = `${this._BASE_URL}/draw?uid=${this._UID}`;
    const data = {
      model_id: payload.model_id,
      cropped_image_key: this._imageKey,
      cropped_height: payload.cropped_height,
      cropped_width: payload.cropped_width,
      package_name: "com.ai.polyverse.mirror",
      ext_args: {
        imagine_value2: payload.imagine_value2,
        custom_prompt: payload.custom_prompt
      },
      version: "6.8.4",
      force_default_pose: payload.force_default_pose,
      is_free_trial: payload.is_free_trial
    };
    this.l("_rD", `Requesting draw`);
    try {
      const res = await axios.post(url, data, {
        headers: this._HEADERS,
        timeout: 2e4,
        validateStatus: () => true
      });
      this.l("_rD", `Draw request response received`);
      return res.data;
    } catch (err) {
      throw new Error(`_rD failed: ${err.message}`);
    }
  }
  async _fS(draw_request_id) {
    if (!draw_request_id) throw new Error("_fS: draw_request_id is required");
    const url = `${this._BASE_URL}/draw/process`;
    try {
      const res = await axios.get(url, {
        headers: this._HEADERS,
        params: {
          draw_request_id: draw_request_id,
          uid: this._UID
        },
        timeout: 15e3
      });
      this.l("_fS", `Response received`);
      return res.data;
    } catch (err) {
      throw new Error(`_fS failed. Status: ${err.response?.status || 0} | Message: ${err.message}`);
    }
  }
  async generate({
    imageUrl,
    log = true,
    model_id = 204,
    cropped_height = 1024,
    cropped_width = 768,
    imagine_value2 = 50,
    custom_prompt = "",
    force_default_pose = true,
    is_free_trial = true,
    ...rest
  } = {}) {
    if (!imageUrl) throw new Error("imageUrl is required.");
    this._log = log === true;
    const defaultedHP = {
      model_id: model_id,
      cropped_height: cropped_height,
      cropped_width: cropped_width,
      imagine_value2: imagine_value2,
      custom_prompt: custom_prompt,
      force_default_pose: force_default_pose,
      is_free_trial: is_free_trial,
      ...rest
    };
    try {
      this._hash = this._s1(crypto.randomUUID());
      this.l("generate", `Generated hash: ${this._hash}, UID: ${this._UID}`);
      const bufferImage = await this._uB(imageUrl);
      this.l("generate", `Image successfully processed. Size: ${bufferImage.length} bytes`);
      const appToken = await this._fT();
      this._imageKey = appToken.key;
      this.l("generate", `Fetched app token key: ${this._imageKey}`);
      appToken.file = bufferImage;
      const upload = await this._uP(appToken);
      this.l("generate", `Upload done. Status code: ${upload.status_code || 200}`);
      const generateRes = await this._rD(defaultedHP);
      const reqId = generateRes.draw_request_id || generateRes.msg;
      if (!reqId) throw new Error("Failed to get draw_request_id from response.");
      this.l("generate", `Draw request ID: ${reqId}`);
      const taskData = {
        reqId: reqId,
        uid: this._UID,
        headers: this._HEADERS,
        hash: this._hash,
        imgKey: this._imageKey
      };
      const taskId = await this.enc(taskData);
      console.log("Generation completed, task created");
      return {
        task_id: taskId
      };
    } catch (error) {
      console.error(`\n[AIMirrorClient.generate] Final Error: ${error.message}`);
      return null;
    }
  }
  async status({
    task_id,
    ...rest
  } = {}) {
    if (!task_id) {
      throw new Error("Task ID is required");
    }
    const taskData = await this.dec(task_id);
    const {
      reqId,
      uid,
      headers,
      hash,
      imgKey
    } = taskData;
    if (!reqId || !uid || !headers) {
      throw new Error("Invalid task data");
    }
    this._UID = uid;
    this._hash = hash;
    this._imageKey = imgKey;
    this._HEADERS = headers;
    const draw_request_id = reqId;
    if (!draw_request_id) throw new Error("task_id (draw_request_id) is required for status check.");
    this.l("status", `Checking status for Task ID: ${draw_request_id}`);
    try {
      const data = await this._fS(draw_request_id);
      const result = {
        status: data.draw_status || "UNKNOWN",
        progress: data.progress?.process || 0,
        images: data.generated_image_addresses || null,
        msg: data.msg || "OK"
      };
      if (result.status === "FAILED") {
        this.l("status", `Task failed: ${result.msg}`);
      } else if (result.status === "SUCCEED") {
        this.l("status", `Task succeeded. ${result.images?.length || 0} images generated.`);
      }
      return result;
    } catch (error) {
      console.error(`\n[AIMirrorClient.status] Error: ${error.message}`);
      return {
        status: "ERROR",
        msg: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AIMirrorClient();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.imageUrl) {
          return res.status(400).json({
            error: "Paramenter 'imageUrl' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate', 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}