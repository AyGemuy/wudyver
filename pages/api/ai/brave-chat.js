import axios from "axios";
import {
  webcrypto
} from "crypto";
const BASE = "https://search.brave.com/api/tap/v1";
const HEAD = {
  accept: "application/json",
  "accept-language": "id-ID",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  referer: "https://search.brave.com/ask"
};
class BraveChat {
  constructor(options = {}) {
    this.id = null;
    this.key = null;
    this.store = {};
    this.urlHash = options.urlHash || null;
    this.crypto = webcrypto;
  }
  async ms(b64) {
    try {
      console.log("ms: import key");
      const jsonStr = Buffer.from(b64, "base64").toString();
      const jwk = JSON.parse(jsonStr);
      const key = await this.crypto.subtle.importKey("jwk", jwk, {
        name: "AES-GCM",
        length: 256
      }, true, ["encrypt", "decrypt"]);
      console.log("ms: ok");
      return key;
    } catch (e) {
      console.error("ms: invalid key", e?.message || e);
      return false;
    }
  }
  async fl() {
    try {
      console.log("fl: generate key");
      const key = await this.crypto.subtle.generateKey({
        name: "AES-GCM",
        length: 256
      }, true, ["encrypt", "decrypt"]);
      const jwk = await this.crypto.subtle.exportKey("jwk", key);
      const b64 = Buffer.from(JSON.stringify(jwk)).toString("base64");
      console.log("fl: ok");
      return b64;
    } catch (e) {
      console.error("fl: err", e?.message || e);
      return null;
    }
  }
  async gd(convId = null) {
    try {
      console.log("gd: get key");
      if (this.urlHash && this.urlHash.length > 0) {
        const keyObj = await this.ms(this.urlHash);
        if (keyObj) {
          console.log("gd: key from hash");
          return {
            symmetricKey: this.urlHash,
            source: "fragment"
          };
        }
      }
      if (convId) {
        const keys = this.fs() || {};
        const stored = keys[convId];
        if (stored) {
          const valid = await this.ms(stored);
          if (valid) {
            console.log("gd: key from storage");
            return {
              symmetricKey: stored,
              source: "storage"
            };
          } else {
            delete keys[convId];
            this.store.conversationKeys = keys;
            console.log("gd: invalid stored key removed");
          }
        }
      }
      console.log("gd: no key found");
      return null;
    } catch (e) {
      console.error("gd: err", e?.message || e);
      return null;
    }
  }
  fs() {
    return this.store.conversationKeys || {};
  }
  Br(convId, keyB64) {
    try {
      console.log("Br: save key");
      const keys = this.fs();
      keys[convId] = keyB64;
      this.store.conversationKeys = keys;
      console.log("Br: saved");
    } catch (e) {
      console.error("Br: err", e?.message || e);
    }
  }
  async nc(prompt = "") {
    try {
      console.log("nc: start");
      const keyB64 = await this.fl();
      if (!keyB64) throw new Error("failed generate key");
      const u = new URL(`${BASE}/new`);
      ["language", "country", "ui_lang"].forEach(p => u.searchParams.append(p, "id"));
      u.searchParams.append("symmetric_key", keyB64);
      u.searchParams.append("source", "llmSuggest");
      u.searchParams.append("query", prompt);
      const r = await axios.get(u.toString(), {
        headers: HEAD
      });
      const d = r?.data || {};
      const convId = d.id;
      if (convId) {
        this.id = convId;
        this.key = keyB64;
        this.Br(convId, keyB64);
        console.log("nc: id", convId);
      }
      return {
        id: convId,
        key: keyB64,
        ...d
      };
    } catch (e) {
      console.error("nc: err", e?.response?.data || e?.message || e);
      return null;
    }
  }
  async chat({
    prompt,
    id,
    ...rest
  }) {
    const self = this;
    return new Promise(async function(resolve, reject) {
      try {
        console.log("chat: start");
        let cid = id || self.id;
        let keyB64 = rest.symmetric_key || self.key;
        if (!cid || !keyB64) {
          console.log("chat: no id/key → gd lookup");
          const found = await self.gd(cid);
          if (found) {
            keyB64 = found.symmetricKey;
            if (!cid) {
              console.log("chat: key found but no id → nc auto");
              const init = await self.nc(prompt);
              if (!init?.id) return reject(new Error("failed create new chat"));
              cid = init.id;
              keyB64 = init.key;
            }
          }
        }
        if (!cid || !keyB64) {
          console.log("chat: no key → nc auto");
          const init = await self.nc(prompt);
          if (!init?.id) return reject(new Error("failed create new chat"));
          cid = init.id;
          keyB64 = init.key;
        }
        const keyObj = await self.ms(keyB64);
        if (!keyObj) return reject(new Error("invalid symmetric key"));
        const u = new URL(`${BASE}/stream`);
        u.searchParams.append("id", cid);
        u.searchParams.append("query", prompt);
        u.searchParams.append("symmetric_key", keyB64);
        ["language", "country", "ui_lang"].forEach(p => u.searchParams.append(p, "id"));
        const ref = `https://search.brave.com/ask?q=${encodeURIComponent(prompt)}&conversation=${cid}`;
        const res = await axios({
          method: "get",
          url: u.toString(),
          headers: {
            ...HEAD,
            referer: ref
          },
          responseType: "stream"
        });
        let buf = "",
          full = "",
          labels = [],
          meta = {};
        res.data.on("data", function(c) {
          buf += c.toString();
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const l of lines) {
            if (!l.trim()) continue;
            try {
              const j = JSON.parse(l);
              const t = j.type || "";
              if (t === "text_delta") {
                const d = j.delta || "";
                full += d;
                process.stdout.write(d);
              } else if (t === "text_stop") {
                console.log("\nchat: stop");
              } else if (t === "debug_labels") {
                labels = j.labels || [];
                console.log("labels:", labels.join(", "));
              } else if (t === "initial_response") {
                meta = j.service_response || {};
              }
            } catch {}
          }
        });
        res.data.on("end", function() {
          console.log("chat: stream end");
          self.id = cid;
          self.key = keyB64;
          self.Br(cid, keyB64);
          const sourceType = rest.symmetric_key ? "input" : self.urlHash && keyB64 === self.urlHash ? "fragment" : "generated";
          resolve({
            response: full,
            id: cid,
            key: keyB64,
            source: sourceType,
            labels: labels,
            meta: meta,
            timestamp: new Date().toISOString().replace("T", " ").split(".")[0] + " WITA",
            country: "ID"
          });
        });
        res.data.on("error", function(e) {
          console.error("chat: stream err", e?.message || e);
          reject(e);
        });
      } catch (e) {
        console.error("chat: err", e?.message || e);
        reject(e);
      }
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new BraveChat();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}