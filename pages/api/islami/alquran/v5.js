import axios from "axios";
class NuQuran {
  constructor() {
    this.apiBase = "https://konten.nu.or.id/api/surah";
    this.headers = {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "Postify/1.0.0"
    };
    this.qoriNya = [{
      id: 1,
      name: "Abdul Basit",
      slug: "abdul-basit"
    }, {
      id: 2,
      name: "Al Husary",
      slug: "al-husary"
    }, {
      id: 4,
      name: "Al Minshawi Mujawwad",
      slug: "al-minshawi-mujawwad"
    }, {
      id: 5,
      name: "Ali bin Abdurrahman-al-hudzaifi",
      slug: "ali-bin-abdurrahman-al-hudzaifi"
    }, {
      id: 6,
      name: "Aziz Alili",
      slug: "aziz-alili"
    }, {
      id: 7,
      name: "Mishari Alafasy",
      slug: "mishari-alafasy"
    }, {
      id: 8,
      name: "Saad Al Ghamidi",
      slug: "saad-al-ghamidi"
    }, {
      id: 9,
      name: "Saud Asy-Syuraim",
      slug: "saud-asy-syuraim"
    }];
  }
  async request(url) {
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      return {
        status: true,
        code: 200,
        result: data
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        result: {
          message: error.response?.data?.message || "Terjadi kesalahan pada server."
        }
      };
    }
  }
  async getAllSurahs() {
    return await this.request(this.apiBase);
  }
  async getSurahByNumber(number) {
    if (!number) return {
      status: false,
      code: 400,
      result: {
        message: "Nomor surah tidak boleh kosong."
      }
    };
    const {
      status,
      result,
      code
    } = await this.getAllSurahs();
    if (!status) return {
      status: status,
      code: code,
      result: result
    };
    const surah = result.find(s => s.id === number);
    if (!surah) return {
      status: false,
      code: 404,
      result: {
        message: `Surah dengan nomor ${number} tidak ditemukan.`
      }
    };
    return await this.request(`${this.apiBase}/${number}`);
  }
  async getSurahByName(name) {
    if (!name) return {
      status: false,
      code: 400,
      result: {
        message: "Nama surah tidak boleh kosong."
      }
    };
    const {
      status,
      result,
      code
    } = await this.getAllSurahs();
    if (!status) return {
      status: status,
      code: code,
      result: result
    };
    const surah = result.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (!surah) return {
      status: false,
      code: 404,
      result: {
        message: `Surah "${name}" tidak ditemukan.`
      }
    };
    return await this.request(`${this.apiBase}/${surah.id}`);
  }
  getQoriById(id) {
    if (!id) return {
      status: false,
      code: 400,
      result: {
        message: "ID Qori tidak boleh kosong."
      }
    };
    const qori = this.qoriNya.find(q => q.id === id);
    return qori ? {
      status: true,
      code: 200,
      result: qori
    } : {
      status: false,
      code: 404,
      result: {
        message: `Qori dengan ID ${id} tidak ditemukan.`
      }
    };
  }
  getQoriByName(name) {
    if (!name) return {
      status: false,
      code: 400,
      result: {
        message: "Nama Qori tidak boleh kosong."
      }
    };
    const qori = this.qoriNya.find(q => q.name.toLowerCase() === name.toLowerCase());
    return qori ? {
      status: true,
      code: 200,
      result: qori
    } : {
      status: false,
      code: 404,
      result: {
        message: `Qori "${name}" tidak ditemukan.`
      }
    };
  }
  async getAudio(id, surahId, verseId) {
    if (!id || !surahId) return {
      status: false,
      code: 400,
      result: {
        message: "ID Qori dan Surah tidak boleh kosong."
      }
    };
    const qori = this.getQoriById(id);
    if (!qori.status) return qori;
    const surah = await this.getSurahByNumber(surahId);
    if (!surah.status) return surah;
    if (verseId < 1 || verseId > surah.result.verse_count) return {
      status: false,
      code: 400,
      result: {
        message: `Ayat ${verseId} tidak ditemukan dalam surah ini.`
      }
    };
    const fs = String(surahId).padStart(3, "0");
    const fv = String(verseId).padStart(3, "0");
    const url = `https://storage.nu.or.id/storage/nuQuran/${qori.result.slug}/${fs}${fv}.mp3`;
    return {
      status: true,
      code: 200,
      result: {
        url: url,
        qori: qori.result,
        surah: surah.result,
        ayat: verseId
      }
    };
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const args = Object.values(params).map(p => isNaN(p) ? p : Number(p));
    const nuQuran = new NuQuran();
    let response;
    switch (action) {
      case "surah_all":
        response = await nuQuran.getAllSurahs();
        break;
      case "surah_number":
        response = await nuQuran.getSurahByNumber(args[0]);
        break;
      case "surah_name":
        response = await nuQuran.getSurahByName(args[0]);
        break;
      case "qori_id":
        response = nuQuran.getQoriById(args[0]);
        break;
      case "qori_name":
        response = nuQuran.getQoriByName(args[0]);
        break;
      case "audio":
        response = await nuQuran.getAudio(args[0], args[1], args[2]);
        break;
      default:
        throw {
          status: false,
            code: 400,
            result: {
              message: "Aksi tidak ditemukan. Gunakan action yang valid."
            }
        };
    }
    return res.status(response.code).json(response);
  } catch (error) {
    return res.status(error.code || 500).json(error);
  }
}