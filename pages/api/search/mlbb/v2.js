import axios from "axios";
class MLBB_API {
  constructor() {
    this.base_url = "https://mlbb-api.vercel.app";
  }
  async all({
    offset = 0,
    limit = 10,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await axios.get(`${this.base_url}/heroes`, {
        params: {
          offset: offset,
          limit: limit,
          ...rest
        }
      });
      return {
        status: true,
        data: data
      };
    } catch (e) {
      return {
        status: false,
        message: "Gagal mengambil daftar hero"
      };
    }
  }
  async by_name({
    name,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await axios.get(`${this.base_url}/heroes/${name}`);
      return {
        status: true,
        data: data
      };
    } catch (e) {
      return {
        status: false,
        message: `Hero '${name}' tidak ditemukan`
      };
    }
  }
  async by_id({
    id,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await axios.get(`${this.base_url}/${id}`);
      return {
        status: true,
        data: data
      };
    } catch (e) {
      return {
        status: false,
        message: `ID '${id}' tidak ditemukan`
      };
    }
  }
  async by_role({
    role,
    ...rest
  } = {}) {
    try {
      const {
        data
      } = await axios.get(`${this.base_url}/roles/${role}`);
      return {
        status: true,
        data: data
      };
    } catch (e) {
      return {
        status: false,
        message: `Role '${role}' tidak ditemukan`
      };
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
      status: false,
      message: "Parameter 'action' wajib diisi",
      valid_actions: ["all", "by_name", "by_id", "by_role"]
    });
  }
  const api = new MLBB_API();
  try {
    let result;
    switch (action) {
      case "all":
        result = await api.all(params);
        break;
      case "by_name":
        if (!params.name) {
          return res.status(400).json({
            status: false,
            message: "Parameter 'name' wajib diisi"
          });
        }
        result = await api.by_name(params);
        break;
      case "by_id":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            message: "Parameter 'id' wajib diisi"
          });
        }
        result = await api.by_id(params);
        break;
      case "by_role":
        if (!params.role) {
          return res.status(400).json({
            status: false,
            message: "Parameter 'role' wajib diisi"
          });
        }
        result = await api.by_role(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          message: `Action '${action}' tidak valid`,
          valid_actions: ["all", "by_name", "by_id", "by_role"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[HANDLER ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server"
    });
  }
}