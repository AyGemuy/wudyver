import axios from "axios";
import FormData from "form-data";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const ANIMATION_MODELS = ["running_jump", "wave_hello_3", "hip_hop_dancing", "box_jump", "boxing", "catwalk_walk", "dab_dance", "dance", "dance001", "dance002", "floating", "flying_kick", "happy_idle", "hip_hop_dancing2", "hip_hop_dancing3", "jab_cross", "joyful_jump_l", "jump", "jump_attack", "jump_rope", "punching_bag", "run", "run_walk_jump_walk", "shoot_gun", "shuffle_dance", "skipping", "standard_walk", "walk_punch_kick_jump_walk", "walk_sway", "walk_swing_arms", "waving_gesture", "zombie_walk"];
class SketchMeta {
  constructor() {
    this.baseUrl = "https://production-sketch-api.metademolab.com";
    this.videoBaseUrl = "https://production-sketch-video.metademolab.com";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        origin: "https://sketch.metademolab.com",
        referer: "https://sketch.metademolab.com/",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async postRequest(endpoint, formData) {
    try {
      const url = `${this.baseUrl}/${endpoint}`;
      const config = {
        headers: {
          ...formData?.getHeaders?.()
        }
      };
      const response = await this.client.post(url, formData, config);
      return response?.data;
    } catch (error) {
      const errorMsg = error?.response?.data || error?.message;
      console.error(`Log: Error pada request ${endpoint} ->`, errorMsg);
      throw error;
    }
  }
  async processImage(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log("Log: Mengunduh gambar...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("Tipe input gambar tidak valid");
    } catch (e) {
      console.error("Log: Gagal memproses gambar", e.message);
      throw e;
    }
  }
  async upload(buffer) {
    try {
      const form = new FormData();
      form.append("file", buffer, {
        filename: "blob.png",
        contentType: "image/png"
      });
      return await this.postRequest("upload_image", form);
    } catch (e) {
      throw new Error(`Upload Failed: ${e.message}`);
    }
  }
  async getBBox(uuid) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      return await this.postRequest("get_bounding_box_coordinates", form);
    } catch (e) {
      throw new Error(`Get BBox Failed: ${e.message}`);
    }
  }
  async setBBox(uuid, coords) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      form.append("is_scenes", "false");
      form.append("bounding_box_coordinates", JSON.stringify(coords));
      return await this.postRequest("set_bounding_box_coordinates", form);
    } catch (e) {
      throw new Error(`Set BBox Failed: ${e.message}`);
    }
  }
  async getMask(uuid) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      return await this.postRequest("get_mask", form);
    } catch (e) {
      throw new Error(`Get Mask Failed: ${e.message}`);
    }
  }
  async getCropped(uuid) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      return await this.postRequest("get_cropped_image", form);
    } catch (e) {
      throw new Error(`Get Cropped Failed: ${e.message}`);
    }
  }
  async setConsent(uuid) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      form.append("consent_response", "0");
      return await this.postRequest("set_consent_answer", form);
    } catch (e) {
      throw new Error(`Set Consent Failed: ${e.message}`);
    }
  }
  async getJoints(uuid) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      return await this.postRequest("get_joint_locations_json", form);
    } catch (e) {
      throw new Error(`Get Joints Failed: ${e.message}`);
    }
  }
  async setJoints(uuid, joints) {
    try {
      const form = new FormData();
      form.append("uuid", uuid);
      form.append("joint_location_json", JSON.stringify(joints));
      return await this.postRequest("set_joint_locations_json", form);
    } catch (e) {
      throw new Error(`Set Joints Failed: ${e.message}`);
    }
  }
  async requestAnim(uuid, modelName) {
    try {
      const form = new FormData();
      form.append("animation", modelName);
      form.append("create_webp", "false");
      form.append("uuid", uuid);
      return await this.postRequest("get_animation", form);
    } catch (e) {
      throw new Error(`Request Anim Failed: ${e.message}`);
    }
  }
  async generate({
    model,
    imageUrl
  }) {
    try {
      const selectedModel = model || "floating";
      if (!ANIMATION_MODELS.includes(selectedModel)) throw new Error("Model tidak ditemukan");
      const buffer = await this.processImage(imageUrl);
      const uploadRes = await this.upload(buffer);
      const uuid = typeof uploadRes === "string" ? uploadRes : uploadRes.uuid;
      console.log(`[1/9] Uploaded UUID: ${uuid}`);
      const bbox = await this.getBBox(uuid);
      const confirmedBbox = bbox || {
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100
      };
      console.log(`[2/9] Got BBox`);
      await this.setBBox(uuid, confirmedBbox);
      console.log(`[3/9] Set BBox`);
      await this.getMask(uuid);
      console.log(`[4/9] Got Mask`);
      await this.getCropped(uuid);
      console.log(`[5/9] Got Cropped Image`);
      await this.setConsent(uuid);
      console.log(`[6/9] Consent Set`);
      const joints = await this.getJoints(uuid);
      console.log(`[7/9] Got Joints`);
      await this.setJoints(uuid, joints);
      console.log(`[8/9] Set Joints`);
      const resultId = await this.requestAnim(uuid, selectedModel);
      console.log(`[9/9] Animation Requested. ID: ${resultId}`);
      return {
        status: true,
        model: selectedModel,
        url: `${this.videoBaseUrl}/${resultId}/${selectedModel}.mp4`
      };
    } catch (error) {
      return {
        status: false,
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new SketchMeta();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}