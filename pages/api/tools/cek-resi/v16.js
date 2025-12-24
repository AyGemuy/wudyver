import axios from "axios";
const ALL = ["spx", "anteraja", "jne", "jnt", "sicepat", "tiki", "pos", "lion", "sap", "ninja", "lex", "ide", "wahana"];
const BASE = "https://resi.idm.web.id/api.php";
const HEAD = {
  Accept: "application/json",
  Referer: "https://resi.idm.web.id/",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "Accept-Language": "id-ID"
};

function detectCandidates(code) {
  const c = String(code).trim().toUpperCase();
  const out = [];
  if (/^SPXID\d{10,16}$/i.test(c)) return ["spx"];
  if (/^SPX\d{10,16}$/i.test(c)) return ["spx"];
  if (/^\d{10,16}$/.test(c)) out.push("anteraja");
  return out.length > 0 ? out : [...ALL];
}
async function hit(code, courier, ax) {
  const url = `${BASE}?code=${encodeURIComponent(code)}&courier=${encodeURIComponent(courier)}`;
  try {
    const r = await ax.get(url);
    return {
      http: r.status,
      data: r?.data ?? {},
      courier: courier
    };
  } catch (e) {
    return {
      http: e?.response?.status ?? 0,
      data: {},
      courier: courier,
      err: e?.code ?? "ERR"
    };
  }
}

function extractStatus(p) {
  if (!p) return "Unknown";
  if (p.status === "success" || p.waybill) return "Found";
  if (p.raw?.data?.histories && Array.isArray(p.raw.data.histories) && p.raw.data.histories.length > 0) {
    const hasValidStatus = ["InTransit", "Delivered", "PickedUp", "OutForDelivery"].includes(p.raw.data.status);
    if (hasValidStatus) return "Found";
  }
  if (p.message?.includes("tidak ditemukan") || p.status === "failed") return "NotFound";
  return "Unknown";
}
class ResiApi {
  constructor() {
    this.ax = axios.create({
      headers: HEAD,
      timeout: 1e4
    });
  }
  expedisiList() {
    return [...ALL];
  }
  async trackResi({
    resi,
    expedisi
  }) {
    const code = (resi ?? "").toString().trim();
    if (!code) throw new Error("resi required");
    const order = expedisi ? [expedisi.toLowerCase()] : detectCandidates(code);
    console.log("Detect order:", {
      code: code,
      order: order
    });
    let result = null;
    let usedCourier = order[0];
    for (const c of order) {
      const res = await hit(code, c, this.ax);
      usedCourier = c;
      const status = extractStatus(res.data);
      console.log(`Trying ${c}:`, status);
      if (status === "Found") {
        result = res;
        break;
      }
      if (!result && status === "Unknown") {
        result = res;
      }
    }
    if (result && extractStatus(result.data) === "Found") {
      const {
        data
      } = result;
      return {
        ...data,
        _courier: usedCourier,
        events: data.raw?.data?.histories?.map(h => ({
          status: h.status,
          message: h.message,
          date: h.date
        })) || [],
        status: data.raw?.data?.status || "InTransit"
      };
    }
    return {
      status: "failed",
      message: "Tidak ditemukan",
      _courier: usedCourier,
      events: [],
      raw: result?.data?.raw || null
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new ResiApi();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        data = await api.trackResi(params);
        return res.status(200).json(data);
      case "list":
        data = await api.expedisiList();
        return res.status(200).json(data);
      default:
        return res.status(400).json({
          error: "Aksi yang diminta tidak valid.",
          availableActions: ["check", "list"]
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan."
    });
  }
}