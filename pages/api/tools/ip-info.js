import requestIp from "request-ip";
import axios from "axios";
import moment from "moment-timezone";
import UAParser from "ua-parser-js";
class IPInfoFetcher {
  constructor(ip, userAgent) {
    this.ip = ip;
    this.userAgent = userAgent || "";
    this.uaParser = new UAParser(this.userAgent);
    this.apis = [{
      name: "ipwhois",
      url: `https://ipwhois.app/json/${ip}`
    }, {
      name: "ipapi",
      url: `https://ipapi.co/${ip}/json/`
    }, {
      name: "ipapi_com",
      url: `http://ip-api.com/json/${ip}?fields=66846719`
    }];
  }
  getFlagInfo(countryCode) {
    if (!countryCode || countryCode === "XX") {
      return {
        emoji: "🏳️",
        unicode: "U+1F3F3 U+FE0F"
      };
    }
    const codePoints = countryCode.toUpperCase().split("").map(char => 127397 + char.charCodeAt(0));
    return {
      emoji: String.fromCodePoint(...codePoints),
      unicode: codePoints.map(c => `U+${c.toString(16).toUpperCase()}`).join(" ")
    };
  }
  getTimezoneData(timezoneId) {
    try {
      if (!timezoneId || timezoneId === "N/A") return null;
      const m = moment().tz(timezoneId);
      return {
        id: timezoneId,
        name: m.format("z"),
        utc: m.format("Z"),
        is_dst: m.isDST(),
        current_time: m.format()
      };
    } catch (e) {
      return {
        id: timezoneId || "UTC",
        name: "N/A",
        utc: "+00:00",
        is_dst: false,
        current_time: new Date().toISOString()
      };
    }
  }
  getDeviceDetails() {
    const result = this.uaParser.getResult();
    return {
      browser: {
        name: result.browser.name || "Unknown",
        version: result.browser.version || "Unknown",
        engine: result.engine.name || "Unknown"
      },
      os: {
        name: result.os.name || "Unknown",
        version: result.os.version || "Unknown",
        platform: result.os.name || "Unknown"
      },
      device: {
        vendor: result.device.vendor || "Generic",
        model: result.device.model || "Unknown",
        type: result.device.type || "Desktop",
        cpu: result.cpu.architecture || "Unknown"
      },
      raw_ua: this.userAgent
    };
  }
  async reverseDNSLookup() {
    try {
      if (this.ip.includes(".") && !this.ip.includes(":")) {
        const reversedIp = this.ip.split(".").reverse().join(".") + ".in-addr.arpa";
        const response = await axios.get("https://dns.google/resolve", {
          params: {
            name: reversedIp,
            type: "PTR"
          },
          timeout: 2500
        });
        if (response.data?.Answer?.[0]?.data) {
          let hostname = response.data.Answer[0].data;
          return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
        }
      }
      return "N/A";
    } catch {
      return "N/A";
    }
  }
  normalizeData(data, source) {
    const def = "N/A";
    if (source === "ipwhois") {
      return {
        city: data.city || def,
        region: data.region || def,
        country: data.country || def,
        country_code: data.country_code || "XX",
        continent: data.continent || def,
        postal: data.postal || def,
        lat: data.latitude || 0,
        lon: data.longitude || 0,
        isp: data.isp || def,
        org: data.org || def,
        asn: data.asn || def,
        timezone: data.timezone || "UTC",
        flag_img: data.flag?.img,
        capital: data.country_capital || def,
        calling_code: data.phone || def,
        tld: def,
        is_eu: data.is_eu || false,
        borders: data.borders || def,
        currency_name: data.currency || def,
        currency_code: data.currency_code || def,
        currency_symbol: data.currency_symbol || def,
        type: data.type || def
      };
    }
    if (source === "ipapi") {
      return {
        city: data.city || def,
        region: data.region || def,
        country: data.country_name || def,
        country_code: data.country_code || "XX",
        continent: data.continent_code || def,
        postal: data.postal || def,
        lat: data.latitude || 0,
        lon: data.longitude || 0,
        isp: data.org || def,
        org: data.org || def,
        asn: data.asn || def,
        timezone: data.timezone || "UTC",
        capital: data.country_capital || def,
        calling_code: data.country_calling_code || def,
        tld: data.country_tld || def,
        is_eu: data.in_eu || false,
        borders: def,
        currency_name: data.currency_name || def,
        currency_code: data.currency || def,
        currency_symbol: def,
        type: def
      };
    }
    if (source === "ipapi_com") {
      return {
        city: data.city || def,
        region: data.regionName || def,
        country: data.country || def,
        country_code: data.countryCode || "XX",
        continent: def,
        postal: data.zip || def,
        lat: data.lat || 0,
        lon: data.lon || 0,
        isp: data.isp || def,
        org: data.org || def,
        asn: data.as || def,
        timezone: data.timezone || "UTC",
        capital: def,
        calling_code: def,
        tld: def,
        is_eu: false,
        borders: def,
        currency_name: data.currency || def,
        currency_code: data.currency || def,
        currency_symbol: def,
        type: data.mobile ? "Mobile" : data.proxy ? "Proxy" : "Broadband"
      };
    }
  }
  async fetchData() {
    const reverseDnsPromise = this.reverseDNSLookup();
    let apiData = null;
    for (const api of this.apis) {
      try {
        const response = await axios.get(api.url, {
          timeout: 5e3
        });
        const data = response.data;
        if (api.name === "ipwhois" && !data.success) continue;
        if (api.name === "ipapi_com" && data.status !== "success") continue;
        if (api.name === "ipapi" && data.error) continue;
        apiData = this.normalizeData(data, api.name);
        break;
      } catch (e) {
        continue;
      }
    }
    if (!apiData) {
      return {
        author: "IPInfo",
        status: false,
        message: "Gagal mengambil data dari semua provider.",
        result: null
      };
    }
    const reverseDns = await reverseDnsPromise;
    const flagInfo = this.getFlagInfo(apiData.country_code);
    const tzInfo = this.getTimezoneData(apiData.timezone);
    const deviceInfo = this.getDeviceDetails();
    return {
      author: "IPInfo",
      status: true,
      message: "Informasi IP berhasil diambil.",
      result: {
        ip: this.ip,
        type: this.ip.includes(":") ? "IPv6" : "IPv4",
        location: {
          city: apiData.city,
          region: apiData.region,
          country: apiData.country,
          continent: apiData.continent,
          postal_code: apiData.postal,
          coordinates: {
            lat: apiData.lat,
            lon: apiData.lon
          },
          maps: `https://www.google.com/maps?q=${apiData.lat},${apiData.lon}`
        },
        region_details: {
          capital: apiData.capital,
          tld: apiData.tld,
          calling_code: apiData.calling_code,
          is_eu: apiData.is_eu,
          borders: apiData.borders
        },
        currency: {
          name: apiData.currency_name,
          code: apiData.currency_code,
          symbol: apiData.currency_symbol
        },
        network: {
          isp: apiData.isp,
          org: apiData.org,
          asn: apiData.asn,
          domain: apiData.domain || reverseDns,
          reverse_dns: reverseDns,
          connection_type: apiData.type
        },
        timezone: {
          id: tzInfo.id,
          name: tzInfo.name,
          utc: tzInfo.utc,
          is_dst: tzInfo.is_dst,
          current_time: tzInfo.current_time
        },
        flag: {
          img: apiData.flag_img || `https://cdn.ipwhois.io/flags/${apiData.country_code.toLowerCase()}.svg`,
          emoji: flagInfo.emoji,
          emoji_unicode: flagInfo.unicode
        },
        device: deviceInfo
      }
    };
  }
}
export default async function handler(req, res) {
  let clientIp = requestIp.getClientIp(req);
  if (clientIp && clientIp.includes("::ffff:")) {
    clientIp = clientIp.replace("::ffff:", "");
  }
  if (!clientIp || clientIp === "::1" || clientIp === "127.0.0.1") {
    clientIp = "114.125.68.140";
  }
  const userAgent = req.headers["user-agent"];
  const api = new IPInfoFetcher(clientIp, userAgent);
  try {
    const data = await api.fetchData();
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      author: "IPInfo",
      status: false,
      error: errorMessage
    });
  }
}