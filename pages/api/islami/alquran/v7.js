import axios from "axios";
class QuranAPI {
  constructor() {
    this.baseURL = "https://equran.id/api/v2";
  }
  async fetchDataInternal(endpoint) {
    try {
      const response = await axios.get(`${this.baseURL}/${endpoint}`);
      if (response.data.code === 200) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          message: response.data.message || "Gagal mengambil data."
        };
      }
    } catch (error) {
      throw {
        success: false,
        code: 500,
        result: {
          message: error.message || "Kesalahan jaringan."
        }
      };
    }
  }
  async getAyat(params) {
    const {
      id
    } = params;
    if (!id) {
      throw {
        success: false,
        code: 400,
        result: {
          message: "ID surat diperlukan."
        }
      };
    }
    const result = await this.fetchDataInternal(`surat/${id}`);
    if (result.success) {
      return {
        success: true,
        code: 200,
        result: result.data
      };
    } else {
      throw {
        success: false,
        code: 404,
        result: {
          message: result.message
        }
      };
    }
  }
  async getList() {
    const result = await this.fetchDataInternal("surat");
    if (result.success) {
      return {
        success: true,
        code: 200,
        result: result.data
      };
    } else {
      throw {
        success: false,
        code: 500,
        result: {
          message: result.message
        }
      };
    }
  }
  async getTafsir(params) {
    const {
      id
    } = params;
    if (!id) {
      throw {
        success: false,
        code: 400,
        result: {
          message: "ID surat diperlukan."
        }
      };
    }
    const result = await this.fetchDataInternal(`tafsir/${id}`);
    if (result.success) {
      return {
        success: true,
        code: 200,
        result: result.data
      };
    } else {
      throw {
        success: false,
        code: 404,
        result: {
          message: result.message
        }
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const quran = new QuranAPI();
    let response;
    switch (action) {
      case "surah":
        response = await quran.getAyat(params);
        break;
      case "list":
        response = await quran.getList();
        break;
      case "tafsir":
        response = await quran.getTafsir(params);
        break;
      default:
        throw {
          success: false,
            code: 400,
            result: {
              message: "Aksi tidak ditemukan. Gunakan action yang valid: 'surah', 'list', atau 'tafsir'."
            }
        };
    }
    return res.status(200).json(response);
  } catch (error) {
    return res.status(error.code || 500).json(error);
  }
}