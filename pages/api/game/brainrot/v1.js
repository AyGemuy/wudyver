import axios from "axios";
import qs from "qs";
class QuizAPI {
  constructor() {
    this.cfg = {
      base: "http://iquizbrainrot.unitedstatesjobs.online/onlinequiz/Api.php",
      auth: "Bearer b14495b0fc64036a7d0f",
      agent: "okhttp/4.12.0",
      conn: "Keep-Alive",
      enc: "gzip",
      type: "application/x-www-form-urlencoded",
      modes: {
        guess: "1",
        puzzle: "2",
        truefalse: "3",
        random: "4"
      }
    };
  }
  headers(extra = {}) {
    return {
      "User-Agent": this.cfg.agent,
      Connection: this.cfg.conn,
      "Accept-Encoding": this.cfg.enc,
      Authorization: this.cfg.auth,
      ...extra
    };
  }
  async req(opts) {
    try {
      console.log(`[REQ] ${opts?.method || "GET"} ${opts?.url || "N/A"}`);
      const res = await axios.request(opts);
      console.log(`[OK] Status: ${res?.status}`);
      return res?.data || res;
    } catch (err) {
      console.log(`[ERR] ${err?.message || err}`);
      return null;
    }
  }
  parse(answer) {
    if (!answer) return [];
    if (typeof answer !== "string") return [String(answer)];
    return answer.split("|||").map(a => a?.trim()).filter(Boolean);
  }
  async category({
    ...rest
  }) {
    try {
      console.log("[CATEGORY] Fetching...");
      const data = await this.req({
        method: "GET",
        url: `${this.cfg.base}?apicall=categories`,
        headers: this.headers()
      });
      if (!data) {
        return {
          error: true,
          message: "Failed to fetch categories",
          result: null
        };
      }
      return {
        error: false,
        message: "Categories fetched successfully",
        result: data
      };
    } catch (err) {
      console.log("[CATEGORY] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
  async generate({
    mode,
    level,
    ...rest
  }) {
    try {
      const m = mode || rest?.m || "puzzle";
      const lvl = level || rest?.lvl || "1";
      const cat = this.cfg.modes[m];
      if (!cat) {
        console.log(`[GENERATE] Invalid mode: ${m}`);
        console.log(`[GENERATE] Valid modes: ${Object.keys(this.cfg.modes).join(", ")}`);
        return {
          error: true,
          message: `Invalid mode: ${m}. Valid modes: ${Object.keys(this.cfg.modes).join(", ")}`,
          result: null
        };
      }
      console.log(`[GENERATE] Mode: ${m}, Cat: ${cat}, Lvl: ${lvl}`);
      const data = await this.req({
        method: "POST",
        url: `${this.cfg.base}?apicall=questions`,
        headers: this.headers({
          "Content-Type": this.cfg.type
        }),
        data: qs.stringify({
          category: cat,
          level: String(lvl)
        })
      });
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log("[GENERATE] No data");
        return {
          error: true,
          message: "No questions available",
          result: null
        };
      }
      const results = data.map(item => {
        return {
          ...item,
          answer: this.parse(item?.answer)
        };
      });
      return {
        error: false,
        message: "Questions generated successfully",
        result: results
      };
    } catch (err) {
      console.log("[GENERATE] Failed");
      return {
        error: true,
        message: err?.message || "Unknown error",
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new QuizAPI();
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