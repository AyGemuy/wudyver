import axios from "axios";
class Api {
  constructor() {
    this.config = {
      base: "https://api.twinstation.xyz",
      endpoint: "/api/cek_statmhs/find",
      headers: {
        accept: "application/json",
        "x-version": "10.5.1",
        authorization: "Bearer 9787|xJeHZM7piFqK46gG6PHJK4cE05ATlIHLT88XvLZc",
        "x-token": "eEE60VJnR6aQ-rRFaAT2HN:APA91bGfhuqu_G8j4Vzbx6-JvuJbfAUu8zYe9cSLfr-3NDyAYCRjJUOdQK7QSwc2Al1WNl46rcMZ6-1DMh77Gl6Z7OQ-Gv025d5R2SHsRIveJs_wqCRM_qo",
        "content-type": "application/x-www-form-urlencoded",
        "accept-encoding": "gzip",
        "user-agent": "okhttp/4.2.0"
      }
    };
  }
  async search({
    nama,
    ...r
  }) {
    console.log("s: start", {
      nama: nama,
      ...r
    });
    try {
      const u = `${this.config.base}${this.config.endpoint}`;
      const p = new URLSearchParams({
        nama: nama,
        ...r
      });
      console.log("s: post", u, p.toString());
      const {
        data
      } = await axios.post(u, p, {
        headers: this.config.headers
      });
      console.log("s: raw", data);
      const res = data ?? [];
      console.log("s: hasil", res);
      return {
        result: res
      };
    } catch (e) {
      console.error("s: err", e?.response?.data ?? e.message);
      return {
        result: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.nama) {
    return res.status(400).json({
      error: "nama is required"
    });
  }
  try {
    const api = new Api();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    console.error("handler: err", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}