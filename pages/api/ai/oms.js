import axios from "axios";
class OneMoreShot {
  constructor() {
    this.API_KEY = "AIzaSyDMmUggUDGmQIq8OxyIWMLkiyywzUcCF24";
    this.BASE_URL = "https://us-central1-photographer-dv8f47.cloudfunctions.net";
    this.GATEWAY = `${this.BASE_URL}/ffPrivateApiCall`;
    this.sess = {
      token: null,
      uid: null,
      refresh: null,
      exp: 0,
      time: 0
    };
    this.map = {
      auth_anon: {
        type: "EXT",
        url: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.API_KEY}`,
        method: "POST",
        req: [],
        build: () => ({
          returnSecureToken: true
        })
      },
      text_speech: {
        type: "CLOUD",
        call: "TextSpeechCall",
        req: ["text", "voiceId"],
        build: a => ({
          text: a.text,
          voiceId: a.voiceId
        })
      },
      check_text_speech: {
        type: "CLOUD",
        call: "CheckTextSpeechCall",
        req: ["requestId"],
        build: a => ({
          requestId: a.requestId
        })
      },
      clone_voice: {
        type: "CLOUD",
        call: "CloneVoiceCall",
        req: ["audioUrl"],
        build: a => ({
          audioUrl: a.audioUrl
        })
      },
      check_clone_voice: {
        type: "CLOUD",
        call: "CheckCloneVoiceCall",
        req: ["requestId"],
        build: a => ({
          requestId: a.requestId
        })
      },
      edit_image: {
        type: "CLOUD",
        call: "EditImageCall",
        req: ["prompt", "imageUrl"],
        build: a => ({
          prompt: a.prompt,
          imageUrl: a.imageUrl
        })
      },
      check_edit_image: {
        type: "CLOUD",
        call: "CheckEditImageCall",
        req: ["requestId"],
        build: a => ({
          requestId: a.requestId
        })
      },
      change_outfit: {
        type: "CLOUD",
        call: "ChangeOutfitCall",
        req: ["humanImageUrl", "garmentImageUrl"],
        build: a => ({
          humanImageUrl: a.humanImageUrl,
          garmentImageUrl: a.garmentImageUrl
        })
      },
      check_change_outfit: {
        type: "CLOUD",
        call: "CheckChangeOutfitCall",
        req: ["requestId"],
        build: a => ({
          requestId: a.requestId
        })
      },
      upscale: {
        type: "CLOUD",
        call: "UpscaleCall",
        req: ["imageUrl"],
        build: a => ({
          imageUrl: a.imageUrl
        })
      },
      check_upscale: {
        type: "CLOUD",
        call: "CheckUpscaleCall",
        req: ["requestId"],
        build: a => ({
          requestId: a.requestId
        })
      },
      generate_scenes: {
        type: "CLOUD",
        call: "GenerateScenesCall",
        req: ["songTitle", "songDescription", "songGenre"],
        build: a => ({
          songTitle: a.songTitle,
          songDescription: a.songDescription,
          songGenre: a.songGenre
        })
      }
    };
  }
  _out(ok, msg, data = null, meta = null) {
    return data?.data || data;
  }
  _head(useAuth = true) {
    const h = {
      "Content-Type": "application/json",
      "User-Agent": "Dart/3.2 (dart:io)",
      "X-Client-Version": "iOS/FirebaseSDK/10.20.0/FirebaseCore/10.20.0",
      "Accept-Encoding": "gzip"
    };
    if (useAuth && this.sess.token) {
      h["Authorization"] = `Bearer ${this.sess.token}`;
    }
    return h;
  }
  _check(args, keys) {
    if (!keys || keys.length === 0) return {
      ok: true,
      miss: []
    };
    const miss = [];
    for (const k of keys) {
      if (args[k] === undefined || args[k] === null || args[k] === "") miss.push(k);
    }
    return {
      ok: miss.length === 0,
      miss: miss
    };
  }
  async _login() {
    const now = Date.now() / 1e3;
    if (this.sess.token && this.sess.time + this.sess.exp - 60 > now) return true;
    console.log("[Auth] Token expired. Re-authenticating...");
    const cfg = this.map.auth_anon;
    const res = await this._http(cfg.url, cfg.method, cfg.build(), false);
    if (res && res.idToken) {
      this.sess = {
        token: res.idToken,
        uid: res.localId,
        refresh: res.refreshToken,
        exp: parseInt(res.expiresIn, 10),
        time: now
      };
      return true;
    }
    return false;
  }
  async _http(url, method, data, useAuth = true) {
    try {
      const res = await axios({
        url: url,
        method: method,
        data: data,
        headers: this._head(useAuth),
        validateStatus: () => true
      });
      return res.data;
    } catch (e) {
      return {
        error: {
          message: e.message || "Network Error",
          code: "NET_ERR"
        }
      };
    }
  }
  async run({
    mode,
    ...args
  }) {
    if (!mode) return this._out(false, "Mode required.", null, {
      modes: Object.keys(this.map)
    });
    const cfg = this.map[mode];
    if (!cfg) return this._out(false, `Mode '${mode}' invalid.`, null, {
      modes: Object.keys(this.map)
    });
    const val = this._check(args, cfg.req);
    if (!val.ok) return this._out(false, "Missing params.", null, {
      required: cfg.req,
      missing: val.miss
    });
    try {
      const payload = cfg.build(args);
      let raw = null;
      if (cfg.type === "EXT") {
        raw = await this._http(cfg.url, cfg.method, payload, false);
      } else if (cfg.type === "CLOUD") {
        const authed = await this._login();
        if (!authed) return this._out(false, "Auth failed.");
        const body = {
          data: {
            callName: cfg.call,
            variables: payload
          }
        };
        console.log(`[Run] ${mode} -> ${cfg.call}`);
        raw = await this._http(this.GATEWAY, "POST", body, true);
      }
      if (!raw) return this._out(false, "Empty response.");
      if (raw.error) {
        const errMsg = raw.error.message || JSON.stringify(raw.error);
        return this._out(false, errMsg, raw, {
          code: raw.error.code
        });
      }
      let final = raw;
      if (cfg.type === "CLOUD" && raw.result) {
        final = raw.result;
      }
      if (final && typeof final === "object") {
        if (final.statusCode !== undefined && final.body !== undefined) {
          if (final.statusCode >= 200 && final.statusCode < 300) {
            final = final.body;
          } else {
            return this._out(false, `API Error: ${final.statusCode}`, final.body, {
              headers: final.headers
            });
          }
        }
      }
      if (typeof final === "string") {
        try {
          if (final.trim().startsWith("{") || final.trim().startsWith("[")) {
            final = JSON.parse(final);
          }
        } catch (e) {}
      }
      return this._out(true, "Success.", final);
    } catch (e) {
      return this._out(false, "Internal Error.", null, {
        details: e.message
      });
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new OneMoreShot();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}