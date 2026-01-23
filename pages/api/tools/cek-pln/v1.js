import axios from "axios";
import crypto from "crypto";
import qs from "qs";
class PlnConnection {
  constructor() {
    this.u = "https://kau-tau-link-ini-dak-ikhlas-aku.my.id/listrik/kau_tau_ini_aku_tidak_ikhlas_dunia_akhirat.php/?kampret=kacuk_kau";
    this.k = "zvmPahAkud4K1KHL4sK4MUtAVKVnClin";
    this.v_iv = "AkVdakIkHL4S2027";
    this.ua = "okhttp/4.12.0";
    this.sA = "AKU DAK RIDHO DUNIA AKHIRAT KAMU BOBOL INI";
    this.sB = "0311";
    this.sD = "DAKI_KLHAS-";
  }
  l(level, msg, context = null) {
    const logData = {
      t: new Date().toISOString(),
      lvl: level,
      msg: msg,
      ctx: context
    };
    console.log(JSON.stringify(logData));
  }
  p(t) {
    const b = Buffer.from(String(t), "utf8");
    const r = 16 - b.length % 16;
    return r === 0 || r === 16 ? b : Buffer.concat([b, Buffer.alloc(r, 0)]);
  }
  e(t) {
    try {
      const c = crypto.createCipheriv("aes-256-cbc", Buffer.from(this.k), Buffer.from(this.v_iv));
      c.setAutoPadding(false);
      const i = this.p(t);
      let r = c.update(i, null, "hex");
      r += c.final("hex");
      return r;
    } catch (err) {
      this.l("ERROR", "Encryption failed", err.message);
      throw new Error("Encryption failed");
    }
  }
  d(h) {
    try {
      const d = crypto.createDecipheriv("aes-256-cbc", Buffer.from(this.k), Buffer.from(this.v_iv));
      d.setAutoPadding(false);
      let r = d.update(h, "hex", "utf8");
      r += d.final("utf8");
      return r.replace(/\0+$/, "");
    } catch (err) {
      return null;
    }
  }
  v(payload) {
    const id = payload?.id || payload?.no_meter || "";
    const typeRaw = payload?.type?.toUpperCase() || "TAGIHAN";
    if (!id) throw new Error("Parameter [id] is required.");
    if (typeof id !== "string" && typeof id !== "number") {
      throw new Error(`Invalid type for [id]. Got: ${typeof id}`);
    }
    const cleanId = String(id).replace(/[^0-9]/g, "");
    if (cleanId.length < 5) throw new Error("Invalid [id] length.");
    const map = {
      TAGIHAN: "AKU-PLN",
      TOKEN: "AKU-PLN Pra Bayar",
      NONTAGLIS: "AKU-PLNNONTAGLIS"
    };
    return {
      id: cleanId,
      c_val: map[typeRaw] || "AKU-PLN",
      type_str: typeRaw
    };
  }
  async check({
    ...rest
  }) {
    const start = Date.now();
    try {
      const validData = this.v(rest);
      this.l("INFO", "Start", {
        id: validData.id,
        type: validData.type_str
      });
      const form = {
        a: this.e(this.sA),
        b: this.e(this.sB),
        c: this.e(validData.c_val),
        d: this.e(this.sD + validData.id)
      };
      const res = await axios.post(this.u, qs.stringify(form), {
        headers: {
          "User-Agent": this.ua,
          "Accept-Encoding": "gzip",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 12e4
      });
      const hexRaw = res?.data;
      if (!hexRaw || typeof hexRaw !== "string") {
        throw new Error("Invalid response from server");
      }
      const jsonStr = this.d(hexRaw.trim());
      let parsedData;
      try {
        parsedData = JSON.parse(jsonStr);
      } catch {
        parsedData = {
          raw: jsonStr
        };
      }
      this.l("INFO", "Success", {
        ms: Date.now() - start
      });
      return {
        status: true,
        message: "Success",
        ...parsedData
      };
    } catch (err) {
      this.l("ERROR", "Exception caught", err.message);
      return {
        status: false,
        message: err.message || "Internal Error",
        data: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.id) {
    return res.status(400).json({
      error: "Parameter 'id' diperlukan"
    });
  }
  const api = new PlnConnection();
  try {
    const data = await api.check(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}