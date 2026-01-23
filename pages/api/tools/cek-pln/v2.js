import axios from "axios";
class PitucodeAPI {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.pitucode.com",
      timeout: 12e4,
      headers: {
        "user-agent": "Dart/3.0 (dart:io)",
        accept: "application/json"
      }
    });
    this.apiKey = "wanzet";
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  async check({
    id,
    ...rest
  }) {
    this.log(`Memproses ID Pelanggan: ${id}`, "PROSES");
    try {
      const res = await this.client.get("/cek-tagihan-pln", {
        params: {
          apikey: this.apiKey,
          customer_number: id,
          ...rest
        }
      });
      this.log("Data berhasil diterima.", "SUKSES");
      return {
        status: "200",
        success: true,
        ...res.data
      };
    } catch (e) {
      const errRes = e.response?.data || {};
      const errCode = e.response?.status || "500";
      const detailMsg = errRes?.message || e.message || "Error";
      this.log(`Gagal: [${errCode}] ${detailMsg}`, "ERROR");
      return {
        status: errCode.toString(),
        success: false,
        message: detailMsg,
        ...errRes
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
  const api = new PitucodeAPI();
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