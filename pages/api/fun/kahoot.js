import axios from "axios";
class KahootClient {
  constructor() {
    this.base = "https://create.kahoot.it/rest/kahoots/";
    this.l("Client siap digunakan.");
  }
  l(msg) {
    console.log(`[KCT Log] ${msg}`);
  }
  urlBuilder(baseUrl, params = {}) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        url.searchParams.append(key, strValue);
      }
    });
    return url.toString();
  }
  async search({
    query,
    ...rest
  }) {
    const q = query || "programming";
    const limit = rest.limit ? rest.limit : 50;
    const defaultParams = {
      query: q,
      limit: limit,
      cursor: 0,
      searchCluster: 1,
      includeExtendedCounters: false,
      inventoryItemId: "NONE"
    };
    const finalParams = {
      ...defaultParams,
      ...rest
    };
    const url = this.urlBuilder(this.base, finalParams);
    this.l(`Mulai pencarian: '${q}' dengan URL: ${url}`);
    try {
      const response = await axios.get(url);
      const count = response.data?.entities?.length || 0;
      this.l(`Pencarian berhasil. Ditemukan ${count} entitas.`);
      return response.data;
    } catch (error) {
      console.error(`[KCT ERROR] Gagal mencari data:`, error.message);
      return {
        entities: []
      };
    }
  }
  async detail({
    uuid,
    ...rest
  }) {
    const id = uuid ? uuid : null;
    if (!id) {
      this.l("UUID diperlukan untuk detail. Mengembalikan null.");
      return null;
    }
    const baseUrl = `${this.base}${id}/card/`;
    const defaultParams = {
      includeKahoot: true
    };
    const finalParams = {
      ...defaultParams,
      ...rest
    };
    const url = this.urlBuilder(baseUrl, finalParams);
    this.l(`Mulai ambil detail untuk UUID: ${id} dengan URL: ${url}`);
    try {
      const response = await axios.get(url);
      const title = response.data?.card?.title || "Judul Tidak Ditemukan";
      this.l(`Detail berhasil. Judul: "${title}"`);
      return response.data;
    } catch (error) {
      console.error(`[KCT ERROR] Gagal mengambil detail UUID ${id}:`, error.message);
      return null;
    }
  }
}
const availableActions = {
  search: ["query"],
  detail: ["uuid"]
};
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi.",
      available_actions: Object.keys(availableActions)
    });
  }
  const api = new KahootClient();
  if (!availableActions[action] || typeof api[action] !== "function") {
    return res.status(400).json({
      error: `Action tidak valid: '${action}'`,
      available_actions: Object.keys(availableActions)
    });
  }
  const requiredParams = availableActions[action];
  if (requiredParams) {
    for (const param of requiredParams) {
      if (!params[param]) {
        return res.status(400).json({
          error: `Paramenter '${param}' wajib untuk action '${action}'.`
        });
      }
    }
  }
  try {
    const result = await api[action](params);
    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({
      error: err.message || "Terjadi kesalahan pada server",
      action: action
    });
  }
}