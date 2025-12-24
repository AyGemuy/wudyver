import axios from "axios";
class CekResi {
  constructor() {
    this.baseURL = "http://ayiip.com";
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "User-Agent": "okhttp/3.8.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      },
      timeout: 12e3
    });
    console.log("CekResi class initialized");
  }
  async trackResi({
    resi,
    expedisi,
    ...rest
  }) {
    console.log(`Tracking resi: ${resi}, expedisi: ${expedisi}`);
    try {
      const expedisiMap = {
        jne: "tracking/jne2.php",
        sicepat: "sicepat.php",
        jnt: "tracking/jnt.php",
        pos: "tracking/pos.php",
        tiki: "tracking/tiki.php",
        wahana: "tracking/wahana.php",
        anteraja: "tracking/anteraja.php",
        lion: "tracking/lionparcel.php",
        rex: "tracking/rex.php",
        ninja: "tracking/ninja.php",
        idexpress: "tracking/idexpress.php",
        shopee: "tracking/shopee.php",
        jet: "tracking/jet.php",
        first: "tracking/fl.php",
        ark: "tracking/ark.php",
        lex: "tracking/lex.php",
        rpx: "tracking/rpx.php",
        lwe: "tracking/lwe.php",
        dakota: "tracking/dakota.php",
        chinapost: "tracking/chinapost.php",
        indah: "tracking/indah.php",
        sap: "tracking/sap.php",
        jx: "tracking/jx.php",
        jntcargo: "tracking/jntcargo.php"
      };
      const endpoint = expedisiMap[expedisi?.toLowerCase()] || expedisiMap.jne;
      const url = `${endpoint}?resi=${resi}`;
      console.log(`Request URL: ${url}`);
      const response = await this.client.get(url, {
        params: rest || {}
      });
      const result = response?.data || {};
      console.log(`Tracking response received: ${Object.keys(result).length} properties`);
      return {
        success: true,
        expedisi: expedisi,
        resi: resi,
        ...result
      };
    } catch (error) {
      console.error("Tracking error:", error?.message || "Unknown error");
      return {
        success: false,
        error: error?.response?.data || error?.message || "Tracking failed",
        expedisi: expedisi,
        resi: resi
      };
    }
  }
  async expedisiList() {
    console.log("Fetching expedisi list");
    try {
      const expedisiList = [{
        code: "jne",
        name: "JNE"
      }, {
        code: "sicepat",
        name: "SiCepat"
      }, {
        code: "jnt",
        name: "J&T"
      }, {
        code: "pos",
        name: "POS Indonesia"
      }, {
        code: "tiki",
        name: "TIKI"
      }, {
        code: "wahana",
        name: "Wahana"
      }, {
        code: "anteraja",
        name: "Anteraja"
      }, {
        code: "lion",
        name: "Lion Parcel"
      }, {
        code: "rex",
        name: "REX"
      }, {
        code: "ninja",
        name: "Ninja Express"
      }, {
        code: "idexpress",
        name: "ID Express"
      }, {
        code: "shopee",
        name: "Shopee Express"
      }, {
        code: "jet",
        name: "JET Express"
      }, {
        code: "first",
        name: "First Logistics"
      }, {
        code: "ark",
        name: "ARK"
      }, {
        code: "lex",
        name: "LEX"
      }, {
        code: "rpx",
        name: "RPX"
      }, {
        code: "lwe",
        name: "LWE"
      }, {
        code: "dakota",
        name: "Dakota"
      }, {
        code: "chinapost",
        name: "China Post"
      }, {
        code: "indah",
        name: "Indah Logistik"
      }, {
        code: "sap",
        name: "SAP Express"
      }, {
        code: "jx",
        name: "JX Express"
      }, {
        code: "jntcargo",
        name: "J&T Cargo"
      }];
      console.log(`Expedisi list loaded: ${expedisiList.length} carriers`);
      return {
        success: true,
        data: expedisiList,
        count: expedisiList?.length || 0
      };
    } catch (error) {
      console.error("Expedisi list error:", error?.message || "Unknown error");
      return {
        success: false,
        error: error?.message || "Failed to load expedisi list",
        data: []
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