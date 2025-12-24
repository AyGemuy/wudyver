import axios from "axios";
class LubanSMS {
  constructor() {
    this.api = {
      base: "https://lubansms.com",
      endpoints: {
        freeCountries: (lang = "en") => `/v2/api/freeCountries?language=${lang}`,
        freeNumbers: (countryName = "russia") => `/v2/api/freeNumbers?countries=${countryName}`,
        freeMessages: (countryName, number) => `/v2/api/freeMessage?countries=${countryName}&number=${number}`
      }
    };
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive"
    };
  }
  _atom(text) {
    const map = {
      minute: 1,
      minutes: 1,
      hour: 60,
      hours: 60,
      day: 1440,
      days: 1440,
      week: 10080,
      weeks: 10080
    };
    const [value, unit] = text.split(" ");
    return parseInt(value) * (map[unit] || 999999);
  }
  _handleError(error, defaultMessage) {
    return {
      success: false,
      code: error?.response?.status || 500,
      result: {
        error: error.message || defaultMessage
      }
    };
  }
  _getRandomIP() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join(".");
  }
  _buildHeaders({
    spoofIP = false
  }) {
    const finalHeaders = {
      ...this.headers,
      time: `${Date.now()}`
    };
    if (spoofIP) {
      finalHeaders["X-Forwarded-For"] = this._getRandomIP();
    }
    return finalHeaders;
  }
  async create({
    country,
    spoofIP = false,
    ...rest
  }) {
    if (typeof country !== "string" || !country.trim()) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Negara harus ditentukan."
        }
      };
    }
    try {
      const headers = this._buildHeaders({
        spoofIP: spoofIP
      });
      const url = `${this.api.base}${this.api.endpoints.freeNumbers(country)}`;
      const {
        data
      } = await axios.get(url, {
        headers: headers,
        timeout: 15e3,
        ...rest
      });
      if (!data || data.code !== 0 || !Array.isArray(data.msg)) {
        return {
          success: false,
          code: 500,
          result: {
            error: `Data nomor telepon untuk ${country} tidak valid.`
          }
        };
      }
      const active = data.msg.filter(n => !n.is_archive).map(n => ({
        full: n.full_number.toString(),
        short: n.number.toString(),
        code: n.code,
        country: n.country,
        age: n.data_humans
      }));
      return {
        success: true,
        code: 200,
        result: {
          total: active.length,
          numbers: active,
          created: new Date().toISOString()
        }
      };
    } catch (error) {
      return this._handleError(error, "Gagal mengambil nomor telepon.");
    }
  }
  async message({
    country,
    number,
    spoofIP = false,
    ...rest
  }) {
    if (typeof country !== "string" || !country.trim() || typeof number !== "string" || !number.trim()) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Negara dan nomor telepon harus ditentukan."
        }
      };
    }
    const sanitizedNumber = number.replace(/\D/g, "");
    const url = `${this.api.base}${this.api.endpoints.freeMessages(country, sanitizedNumber)}`;
    const headers = this._buildHeaders({
      spoofIP: spoofIP
    });
    try {
      const {
        data
      } = await axios.get(url, {
        headers: headers,
        timeout: 15e3,
        ...rest
      });
      if (!data || typeof data !== "object" || data.code !== 0 || !("msg" in data)) {
        return {
          success: false,
          code: 500,
          result: {
            error: "Data pesan tidak valid."
          }
        };
      }
      const i = Array.isArray(data.msg) ? data.msg : [];
      const messages = i.map(m => ({
        id: m.id,
        from: m.in_number || m.innumber || "",
        to: m.my_number,
        text: m.text,
        code: m.code !== "-" ? m.code : null,
        received: m.created_at,
        age: m.data_humans
      }));
      return {
        success: true,
        code: 200,
        result: {
          total: messages.length,
          messages: messages,
          created: new Date().toISOString()
        }
      };
    } catch (error) {
      return this._handleError(error, "Gagal mengambil pesan.");
    }
  }
  async generate({
    country,
    spoofIP = false,
    ...rest
  }) {
    if (typeof country !== "string" || !country.trim()) {
      return {
        success: false,
        code: 400,
        result: {
          error: "Negara harus ditentukan."
        }
      };
    }
    try {
      const headers = this._buildHeaders({
        spoofIP: spoofIP
      });
      const resCountries = await axios.get(`${this.api.base}${this.api.endpoints.freeCountries()}`, {
        headers: headers,
        timeout: 15e3,
        ...rest
      });
      if (!resCountries.data || resCountries.data.code !== 0) {
        return {
          success: false,
          code: 500,
          result: {
            error: "Gagal mendapatkan daftar negara."
          }
        };
      }
      const target = resCountries.data.msg.find(c => c.name.toLowerCase() === country.toLowerCase());
      if (!target) {
        return {
          success: false,
          code: 404,
          result: {
            error: `Negara ${country} tidak ditemukan.`
          }
        };
      }
      if (!target.online) {
        return {
          success: false,
          code: 403,
          result: {
            error: `Negara ${country} sedang offline.`
          }
        };
      }
      const resNumbers = await this.create({
        country: country,
        spoofIP: spoofIP,
        ...rest
      });
      if (!resNumbers.success) return resNumbers;
      const countByCountry = {
        [target.locale]: resNumbers.result.total
      };
      const sorted = resNumbers.result.numbers.sort((a, b) => {
        const ageA = this._atom(a.age);
        const ageB = this._atom(b.age);
        return ageA - ageB;
      });
      return {
        success: true,
        code: 200,
        result: {
          total: sorted.length,
          numbers: sorted.map(n => ({
            ...n,
            countryName: target.locale
          })),
          countByCountry: countByCountry,
          created: new Date().toISOString()
        }
      };
    } catch (error) {
      return this._handleError(error, "Gagal membuat nomor baru.");
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
      success: false,
      error: "Paramenter 'action' diperlukan.",
      allowed_actions: ["create", "message"]
    });
  }
  const luban = new LubanSMS();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.country) {
          return res.status(400).json({
            success: false,
            error: `Paramenter 'country' diperlukan untuk aksi '${action}'.`
          });
        }
        result = await luban[action](params);
        break;
      case "message":
        if (!params.country || !params.number) {
          return res.status(400).json({
            success: false,
            error: `Paramenter 'country' dan 'number' diperlukan untuk aksi '${action}'.`
          });
        }
        result = await luban[action](params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Aksi tidak valid: '${action}'. Aksi yang diizinkan: 'create' | 'message'.`
        });
    }
    return res.status(result.code).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: 500,
      result: {
        error: `Terjadi error saat memproses permintaan: ${error.message}`
      }
    });
  }
}