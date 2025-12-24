import crypto from "crypto";
import axios from "axios";
import Encoder from "@/lib/encoder";
class MusicGenerator {
  constructor() {
    this.reportUrl = "https://account-api.musicful.ai/v2/report-data";
    this.descUrl = "https://aimusic-api.musicful.ai/musicful/app/v1/async/description-to-song";
    this.lyricsUrl = "https://aimusic-api.musicful.ai/musicful/app/v1/async/lyrics-to-song";
    this.resultUrl = "https://aimusic-api.musicful.ai/musicful/app/v1/song/result";
    this.key = Buffer.from("147258369topmeidia96385topmeidia", "utf8");
    this.iv = Buffer.from("1597531topmeidia", "utf8");
    this.code = this.genCode();
    this.ts = 0;
    this.sign = "";
    console.log(`[INIT] Device ID: ${this.code}`);
  }
  genCode() {
    try {
      return crypto.randomBytes(8).toString("hex");
    } catch (e) {
      console.error("[ERROR] genCode failed:", e.message);
      return "fallback-" + Date.now();
    }
  }
  md5(d) {
    return crypto.createHash("md5").update(String(d)).digest("hex").toUpperCase();
  }
  decrypt(txt) {
    if (!txt || typeof txt !== "string") return "";
    try {
      const buf = Buffer.from(txt, "base64");
      const dec = crypto.createDecipheriv("aes-256-cbc", this.key, this.iv);
      return dec.update(buf, null, "utf8") + dec.final("utf8");
    } catch (e) {
      console.error("[DECRYPT] Failed:", e.message);
      return txt;
    }
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
  async auth() {
    try {
      this.ts = Date.now();
      this.sign = this.md5(this.code + this.ts + "member_sign");
      const body = new URLSearchParams({
        software_code: this.code,
        lang: "EN",
        source_site: "google_play",
        information_sources: "200473",
        operating_type: "phone-app",
        operating_system: "android",
        token: "",
        timestamp: this.ts.toString(),
        sign: this.sign
      });
      console.log("[AUTH] Sending...");
      const {
        data
      } = await axios.post(this.reportUrl, body, {
        timeout: 1e4
      });
      if (!data || data.code !== 200) {
        throw new Error(data?.msg || "Auth failed");
      }
      console.log("[AUTH] Success");
      return {
        code: this.code,
        timestamp: this.ts,
        sign: this.sign
      };
    } catch (error) {
      console.error("[AUTH] Failed:", error.message);
      throw error;
    }
  }
  async reqWithAuth(url, body, auth, name) {
    try {
      const headers = {
        "tourist-authorization": `Bearer ${auth.code}`
      };
      console.log(`[${name}] Requesting...`);
      const {
        data
      } = await axios.post(url, body, {
        headers: headers,
        timeout: 15e3
      });
      if (!data || data.status !== 200) {
        throw new Error(data?.message || "Request failed");
      }
      console.log(`[${name}] Success`);
      return data.data;
    } catch (error) {
      console.error(`[${name}] Failed:`, error.message);
      throw error;
    }
  }
  async reqDesc(description, auth) {
    if (!description || typeof description !== "string" || !description.trim()) {
      throw new Error("Description required");
    }
    const body = new URLSearchParams({
      description: description.trim(),
      instrumental: "0",
      mv: "v4.0"
    });
    return await this.reqWithAuth(this.descUrl, body, auth, "DESC");
  }
  async reqLyrics({
    lyrics,
    style = "pop",
    title = "Untitled"
  }, auth) {
    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      throw new Error("Lyrics required");
    }
    const body = new URLSearchParams({
      lyrics: lyrics.trim(),
      style: style,
      title: title,
      instrumental: "0",
      mv: "v4.0"
    });
    return await this.reqWithAuth(this.lyricsUrl, body, auth, "LYRICS");
  }
  async checkSingleStatus(id, auth) {
    try {
      const url = `${this.resultUrl}?ids=${id}`;
      const headers = {
        "tourist-authorization": `Bearer ${auth.code}`
      };
      const {
        data
      } = await axios.get(url, {
        headers: headers,
        timeout: 1e4
      });
      if (!data || data.status !== 200 || !data.data?.result?.[0]) {
        return {
          id: id,
          status: -1,
          error: "Not found"
        };
      }
      const song = data.data.result[0];
      return {
        ...song,
        audio_url: song.audio_url ? this.decrypt(song.audio_url) : song.audio_url,
        cover_url: song.cover_url ? this.decrypt(song.cover_url) : song.cover_url
      };
    } catch (error) {
      return {
        id: id,
        status: -1,
        error: error.message
      };
    }
  }
  async generate({
    mode = "prompt",
    ...params
  }) {
    try {
      console.log("[GENERATE] Starting...");
      const auth = await this.auth();
      let taskData;
      if (mode === "lyrics") {
        taskData = await this.reqLyrics(params, auth);
      } else {
        const desc = params.prompt || params.description;
        if (!desc || typeof desc !== "string" || !desc.trim()) {
          throw new Error("Prompt or description required");
        }
        taskData = await this.reqDesc(desc, auth);
      }
      const ids = taskData.ids || [taskData.task_id];
      const payload = {
        auth: auth,
        ids: ids
      };
      const task_id = await this.enc(payload);
      console.log(`[GENERATE] task_id created: ${task_id}`);
      return {
        task_id: task_id
      };
    } catch (error) {
      console.error("[GENERATE] Failed:", error.message);
      throw error;
    }
  }
  async status({
    task_id
  }) {
    if (!task_id) throw new Error("task_id is required");
    try {
      console.log(`[STATUS] Decoding task_id: ${task_id}`);
      const {
        auth,
        ids
      } = await this.dec(task_id);
      if (!auth || !Array.isArray(ids) || ids.length === 0) {
        throw new Error("Invalid payload in task_id");
      }
      this.ts = auth.timestamp;
      this.sign = auth.sign;
      console.log(`[STATUS] Found ${ids.length} ID(s) to check`);
      const results = [];
      for (const id of ids) {
        console.log(`[STATUS] → Checking: ${id}`);
        const result = await this.checkSingleStatus(id, auth);
        results.push(result);
      }
      const completed = results.filter(r => r.audio_url && r.audio_url.trim() !== "");
      console.log(`[STATUS] Done: ${completed.length}/${results.length} completed.`);
      return {
        results: results,
        completed: completed
      };
    } catch (error) {
      console.error("[STATUS] Failed:", error.message);
      throw error;
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
  const api = new MusicGenerator();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt && !params.lyrics && !params.description) {
          return res.status(400).json({
            error: "Paramenter 'prompt', 'description', atau 'lyrics' wajib diisi."
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi."
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Gunakan: generate, status.`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`[ERROR] Action '${action}':`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal."
    });
  }
}