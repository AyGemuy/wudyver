import axios from "axios";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", PROXY.url);
class BreachNode {
  constructor() {
    this.host = `${proxy}https://databreach.com`;
    this.head = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "text/plain",
      origin: "https://databreach.com",
      referer: "https://databreach.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  log(m, d = "") {
    console.log(`[LOG] ${m}`, d);
  }
  solve(v) {
    const s = String(v).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? "email" : /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(s) ? "ip" : /^[A-HJ-NPR-Z0-9]{17}$/.test(s) ? "vehicle_vin" : /^\d{5}$/.test(s) ? "zipcode" : /^\d{3}-?\d{2}-?\d{4}$/.test(s) ? "ssn_preview" : (s.startsWith("+") || /^\d+$/.test(s)) && s.replace(/\D/g, "").length >= 7 ? "phone" : "full_name";
  }
  async req(body) {
    try {
      this.log("POST via CORS...", body.name);
      const {
        data
      } = await axios.post(`${this.host}/_telefunc`, JSON.stringify(body), {
        headers: this.head
      });
      return data;
    } catch (e) {
      this.log("Err Req", e.message);
      return null;
    }
  }
  async search({
    input,
    ...opts
  }) {
    try {
      const type = opts.type || this.solve(input);
      let val = input;
      if (type === "phone") {
        const clean = input.replace(/[^0-9+]/g, "");
        val = clean.startsWith("+") ? clean : `+${clean.startsWith("0") ? "62" + clean.slice(1) : clean}`;
      }
      this.log(`Type: ${type} | Val: ${val}`);
      const payload = {
        file: "/app/rpc/search.telefunc.ts",
        name: "public_search",
        args: [{
          piis: [{
            type: type,
            value: val,
            pii_id: String(Date.now())
          }],
          main_breach_id: "!undefined"
        }]
      };
      const raw = await this.req(payload);
      const finalData = raw?.ret?.results || raw || null;
      return {
        status: finalData ? "success" : "failed",
        result: finalData
      };
    } catch (err) {
      this.log("Err Search", err);
      return {
        result: null,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.input) {
    return res.status(400).json({
      error: "Parameter 'input' diperlukan"
    });
  }
  const api = new BreachNode();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}