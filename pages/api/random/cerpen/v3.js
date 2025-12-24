import axios from "axios";
import crypto from "crypto";
class CerpenAPI {
  constructor() {
    this.k = "AIzaSyApA0aRj0xAEsc3rMxviJ6f5dIA40OdEDU";
    this.db = "https://cerpen-remaja-default-rtdb.firebaseio.com";
    this.tk = null;
    this.rt = null;
  }
  log(m) {
    console.log(`[PROSES]: ${m}`);
  }
  rnd() {
    const id = crypto.randomBytes(4).toString("hex");
    const pw = crypto.randomBytes(10).toString("base64").replace(/[/+=]/g, "x");
    return {
      e: `user_${id}@cerpen.io`,
      p: `pass_${pw}`
    };
  }
  async reg() {
    this.log("Mendaftarkan akun random baru...");
    try {
      const {
        e,
        p
      } = this.rnd();
      const {
        data
      } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.k}`, {
        email: e,
        password: p,
        returnSecureToken: true
      });
      this.tk = data?.idToken || null;
      this.rt = data?.refreshToken || null;
      this.log(`Registrasi berhasil: ${e}`);
      return data;
    } catch (err) {
      this.log("Gagal registrasi akun.");
      throw err?.response?.data || err.message;
    }
  }
  async ref() {
    this.log("Menyegarkan token (Refresh Token)...");
    try {
      const {
        data
      } = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${this.k}`, {
        grant_type: "refresh_token",
        refresh_token: this.rt
      });
      this.tk = data?.id_token || null;
      this.rt = data?.refresh_token || this.rt;
      this.log("Token berhasil diperbarui.");
      return data;
    } catch (err) {
      this.log("Refresh token gagal, mendaftar ulang...");
      return await this.reg();
    }
  }
  async ens() {
    return this.tk ? {
      idToken: this.tk
    } : await this.reg();
  }
  async search({
    token,
    title,
    ...rest
  }) {
    this.log(`Memulai pencarian: ${title || "Mode Random"}...`);
    try {
      const activeTk = token || this.tk || (await this.ens())?.idToken;
      const {
        data
      } = await axios.get(`${this.db}/.json`, {
        params: {
          auth: activeTk,
          ...rest
        }
      });
      const postsObj = data?.posts || {};
      const postsArr = Object.entries(postsObj).map(([key, val]) => ({
        key: key,
        ...val
      }));
      let filtered = [];
      if (title) {
        const query = title.toLowerCase();
        filtered = postsArr.filter(p => p?.judul?.toLowerCase()?.includes(query));
      } else {
        this.log("Title kosong, mengambil cerpen secara acak...");
        const rndIdx = Math.floor(Math.random() * postsArr.length);
        filtered = postsArr.length > 0 ? [postsArr[rndIdx]] : [];
      }
      this.log(`Pencarian selesai. Ditemukan: ${filtered.length} item.`);
      return {
        result: filtered,
        token: this.tk,
        refreshToken: this.rt,
        count: filtered.length,
        status: filtered.length > 0 ? "success" : "not_found",
        query: title || "random_pick"
      };
    } catch (err) {
      if (err?.response?.status === 401 && this.rt) {
        this.log("Akses ditolak (Expired). Mencoba refresh dan ulangi...");
        const refreshed = await this.ref();
        return await this.search({
          token: refreshed?.id_token,
          title: title,
          ...rest
        });
      }
      this.log(`Terjadi kesalahan: ${err.message}`);
      throw err?.response?.data || err.message;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new CerpenAPI();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}