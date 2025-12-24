import axios from "axios";
import qs from "qs";
class CekResi {
  constructor() {
    this.baseURL = "https://loman.id";
    this.trackURL = "/resapp/";
    this.listURL = "/resapp/getdropdown.php";
    this.cache = null;
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 12e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        Referer: "https://loman.id/",
        Origin: "https://loman.id",
        "Sec-CH-UA": `"Chromium";v="131", "Google Chrome";v="131", "Not=A?Brand";v="99"`,
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": `"Windows"`,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      }
    });
  }
  _normalize(text) {
    return typeof text === "string" ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "";
  }
  _toFormat(name) {
    return this._normalize(name);
  }
  _parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const clean = dateStr.replace(/Pukul\s*/i, "").trim();
    const months = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      mei: 4,
      jun: 5,
      jul: 6,
      agu: 7,
      sep: 8,
      okt: 9,
      nov: 10,
      des: 11
    };
    const match = clean.match(/(\d{1,2})-([a-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/i);
    if (!match) return null;
    const [, day, mon, year, h, m, s] = match;
    const month = months[mon.toLowerCase()];
    if (month === undefined) return null;
    const date = new Date(Date.UTC(+year, month, +day, +h, +m, +s));
    if (isNaN(date)) return null;
    return {
      datetime: date.toISOString(),
      timestamp: date.getTime()
    };
  }
  async expedisiList() {
    if (this.cache) return this.cache;
    try {
      const {
        data
      } = await this.http.get(this.listURL);
      if (data?.status !== "berhasil" || !Array.isArray(data.data)) {
        return {
          success: false,
          code: 500,
          error: "Gagal mengambil daftar kurir"
        };
      }
      const couriers = data.data.map(c => {
        const name = c.title?.trim();
        if (!name) return null;
        return {
          name: name,
          format: this._toFormat(name)
        };
      }).filter(Boolean);
      const formatToName = {};
      const nameToFormat = {};
      couriers.forEach(c => {
        formatToName[c.format] = c.name;
        nameToFormat[this._normalize(c.name)] = c.format;
      });
      const result = {
        success: true,
        code: 200,
        couriers: couriers
      };
      this.cache = {
        ...result,
        _formatToName: formatToName,
        _nameToFormat: nameToFormat
      };
      return result;
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        error: "Jaringan error"
      };
    }
  }
  async trackResi({
    resi,
    expedisi
  }) {
    if (!resi?.trim() || !expedisi?.trim()) {
      return {
        success: false,
        code: 400,
        error: "resi dan expedisi wajib diisi"
      };
    }
    const list = await this.expedisiList();
    if (!list.success) return list;
    const input = expedisi.trim();
    const inputNorm = this._normalize(input);
    const {
      _formatToName,
      _nameToFormat
    } = this.cache;
    let courierName = null;
    if (_formatToName[inputNorm]) {
      courierName = _formatToName[inputNorm];
    } else {
      for (const [normName, format] of Object.entries(_nameToFormat)) {
        if (normName.includes(inputNorm) || inputNorm.includes(normName)) {
          courierName = _formatToName[format];
          break;
        }
      }
    }
    if (!courierName) {
      return {
        success: false,
        code: 404,
        error: `Kurir "${input}" tidak ditemukan`,
        suggestion: `Coba: spx, jne, jtexpress, shopeeexpress, ...`
      };
    }
    const payload = qs.stringify({
      resi: resi.trim(),
      ex: courierName
    });
    try {
      const {
        data
      } = await this.http.post(this.trackURL, payload, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      if (data?.status !== "berhasil") {
        return {
          success: false,
          code: 400,
          error: data?.details?.infopengiriman || "Gagal melacak paket"
        };
      }
      const details = data.details || {};
      const historyRaw = Array.isArray(data.history) ? data.history : [];
      const history = historyRaw.map(item => {
        const dateInfo = this._parseDate(item.tanggal);
        const desc = item.details?.trim();
        if (!desc) return null;
        return {
          datetime: dateInfo?.datetime || null,
          timestamp: dateInfo?.timestamp || 0,
          description: desc
        };
      }).filter(Boolean).sort((a, b) => b.timestamp - a.timestamp);
      const tips = (details.ucapan || "").split("\n").map(l => l.trim()).filter(Boolean);
      return {
        success: true,
        code: 200,
        resi: resi.trim(),
        courier: courierName,
        status: details.status || "Unknown",
        message: details.infopengiriman?.trim() || "",
        tips: tips.length > 0 ? tips : null,
        history: history
      };
    } catch (err) {
      return {
        success: false,
        code: err.response?.status || 500,
        error: err.response?.data?.details?.infopengiriman || err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const api = new CekResi();
  try {
    let data;
    switch (action) {
      case "check":
        if (!params.resi) {
          return res.status(400).json({
            error: "Silakan masukkan nomor resi."
          });
        }
        if (!params.expedisi) {
          data = await api.expedisiList();
          return res.status(200).json({
            message: "Ekspedisi tidak diisi, berikut adalah daftar ekspedisi:",
            data: data
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