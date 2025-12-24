import fetch from "node-fetch";
class BmkgGempa {
  constructor() {
    this.baseImageUrl = "https://data.bmkg.go.id/DataMKG/TEWS/";
    this.urls = {
      auto: `${this.baseImageUrl}autogempa.json`,
      terkini: `${this.baseImageUrl}gempaterkini.json`,
      dirasakan: `${this.baseImageUrl}gempadirasakan.json`
    };
  }
  async fetchData(type = "auto") {
    const url = this.urls[type];
    if (!url) {
      console.log(`[BmkgGempa] Invalid type: ${type}`);
      return {
        status: "error",
        message: `Tipe "${type}" tidak valid. Gunakan: auto, terkini, dirasakan.`
      };
    }
    try {
      console.log(`[BmkgGempa] Fetching data from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`[BmkgGempa] Fetch failed with status: ${response.status} ${response.statusText}`);
        return {
          status: "error",
          message: `Gagal ambil data BMKG: ${response.statusText}`
        };
      }
      const data = await response.json();
      console.log(`[BmkgGempa] Data fetched successfully for type: ${type}`);
      return {
        status: "success",
        type: type,
        data: this.formatData(data, type)
      };
    } catch (error) {
      console.error(`[BmkgGempa] Error during fetch: ${error.message}`);
      return {
        status: "error",
        message: "Kesalahan proses permintaan.",
        error: error.message
      };
    }
  }
  formatData(data, type) {
    const formatGempa = gempa => {
      const formatted = {};
      for (const key in gempa) {
        formatted[key.toLowerCase()] = gempa[key];
      }
      if (formatted.shakemap) {
        formatted.shakemap = `${this.baseImageUrl}${formatted.shakemap}`;
      }
      return formatted;
    };
    if (type === "auto" && data.Infogempa?.gempa) {
      return formatGempa(data.Infogempa.gempa);
    } else if (["terkini", "dirasakan"].includes(type) && Array.isArray(data.Infogempa?.gempa)) {
      return data.Infogempa.gempa.map(formatGempa);
    }
    return data;
  }
}
export default async function handler(req, res) {
  const {
    type
  } = req.method === "GET" ? req.query : req.body;
  const bmkg = new BmkgGempa();
  try {
    console.log(`[Handler] Incoming request with type: ${type}`);
    const result = await bmkg.fetchData(type);
    console.log(`[Handler] Sending response with status: ${result.status}`);
    res.status(result.status === "success" ? 200 : result.status).json(result);
  } catch (error) {
    console.error(`[Handler] Error in handler: ${error.message}`);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan dalam handler.",
      error: error.message
    });
  }
}