import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import apiConfig from "@/configs/apiConfig";
import Encoder from "@/lib/encoder";
class Sonu {
  constructor() {
    this.api = {
      base: "https://musicai.apihub.today/api/v1",
      endpoints: {
        register: "/users",
        create: "/song/create",
        checkStatus: "/song/user"
      }
    };
    this.headers = {
      "user-agent": "NB Android/1.0.0",
      "content-type": "application/json",
      accept: "application/json",
      "x-platform": "android",
      "x-app-version": "1.0.0",
      "x-country": "ID",
      "accept-language": "id-ID",
      "x-client-timezone": "Asia/Jakarta"
    };
    this.deviceId = uuidv4();
    this.userId = null;
    this.fcmToken = "eqnTqlxMTSKQL5NQz6r5aP:APA91bHa3CvL5Nlcqx2yzpTDAeqxm_L_vIYxXqehkgmTsCXrV29eAak6_jqXv5v1mQrdw4BGMLXl_BFNrJ67Em0vmdr3hQPVAYF8kR7RDtTRHQ08F3jLRRI";
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
  async _ensureRegistered() {
    if (!this.userId) {
      const registerResult = await this.register();
      if (!registerResult.success) {
        throw new Error(`Registration failed: ${registerResult.result.error}`);
      }
    }
  }
  async register() {
    const msgId = uuidv4();
    const time = Date.now().toString();
    const header = {
      ...this.headers,
      "x-device-id": this.deviceId,
      "x-request-id": msgId,
      "x-message-id": msgId,
      "x-request-time": time
    };
    try {
      const response = await axios.put(`${this.api.base}${this.api.endpoints.register}`, {
        deviceId: this.deviceId,
        fcmToken: this.fcmToken
      }, {
        headers: header
      });
      this.userId = response.data.id;
      return {
        success: true,
        code: 200,
        result: {
          userId: this.userId
        }
      };
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message
        }
      };
    }
  }
  async create({
    type = "lyrics",
    title = "Lagu AI Generasi Baru",
    mood = "futuristic",
    genre = "electronic",
    gender = "female",
    lyrics = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`
  }) {
    await this._ensureRegistered();
    if (!title || title.trim() === "") {
      return {
        success: false,
        code: 400,
        result: {
          error: "Title missing."
        }
      };
    }
    if (!lyrics || lyrics.trim() === "") {
      return {
        success: false,
        code: 400,
        result: {
          error: "Lyrics missing."
        }
      };
    }
    if (lyrics.length > 1500) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Lyrics too long."
        }
      };
    }
    const msgId = uuidv4();
    const time = Date.now().toString();
    const header = {
      ...this.headers,
      "x-device-id": this.deviceId,
      "x-client-id": this.userId,
      "x-request-id": msgId,
      "x-message-id": msgId,
      "x-request-time": time
    };
    const body = {
      type: type,
      name: title,
      lyrics: lyrics
    };
    if (mood && mood.trim() !== "") body.mood = mood;
    if (genre && genre.trim() !== "") body.genre = genre;
    if (gender && gender.trim() !== "") body.gender = gender;
    try {
      const response = await axios.post(`${this.api.base}${this.api.endpoints.create}`, body, {
        headers: header
      });
      const songId = response.data.id;
      const task_id = await this.enc({
        songId: songId,
        userId: this.userId
      });
      return {
        success: true,
        code: 200,
        result: {
          task_id: task_id
        }
      };
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message
        }
      };
    }
  }
  async status({
    task_id
  }) {
    await this._ensureRegistered();
    let decryptedData;
    try {
      decryptedData = await this.dec(task_id);
    } catch (error) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Invalid task ID."
        }
      };
    }
    const {
      songId,
      userId: decryptedUserId
    } = decryptedData;
    const header = {
      ...this.headers,
      "x-client-id": this.userId
    };
    try {
      const response = await axios.get(`${this.api.base}${this.api.endpoints.checkStatus}`, {
        params: {
          userId: decryptedUserId,
          isFavorite: false,
          page: 1,
          searchText: ""
        },
        headers: header
      });
      const found = response.data.datas.find(song => song.id === songId);
      if (found) {
        if (found.url) {
          return {
            success: true,
            code: 200,
            result: found
          };
        } else {
          return {
            success: true,
            code: 202,
            result: found
          };
        }
      } else {
        return {
          success: false,
          code: 404,
          result: {
            error: "Song not found."
          }
        };
      }
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        result: {
          error: err.message
        }
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
      error: "Action (create or status) is required."
    });
  }
  const sonuApp = new Sonu();
  try {
    switch (action) {
      case "create":
        const createResponse = await sonuApp.create(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await sonuApp.status({
          task_id: params.task_id
        });
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}