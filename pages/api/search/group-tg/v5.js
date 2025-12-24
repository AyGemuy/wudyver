import axios from "axios";
class TlgrmClient {
  constructor() {
    this.searchUrl = "https://typesense.tlgrm.app/collections/channels/documents/search";
    this.feedBaseUrl = "https://api.tlgrm.app/v3/channels/";
    this.searchHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://tlgrm.eu",
      referer: "https://tlgrm.eu/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "x-typesense-api-key": "S21Iay9yTjM0QnVUNkJ2STREZHhoZ3liVFJhdW9UaGc4UXAxRUthNS9DRT1PMjkweyJleGNsdWRlX2ZpZWxkcyI6InRhZ3MsZW1iZWRkaW5nIn0="
    };
    this.feedHeaders = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9",
      origin: "https://tlgrm.eu",
      referer: "https://tlgrm.eu/",
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query,
    ...rest
  }) {
    console.log("Memulai pencarian untuk:", query);
    try {
      const defaultParams = {
        q: query,
        query_by: "tokenized_name,tags,link",
        per_page: 11,
        page: 1,
        query_by_weights: "120,120,10",
        sort_by: "_eval(official:true):desc,subscribers:desc,_text_match:desc",
        filter_by: "lang:[na,en,id]",
        highlight_fields: "_",
        min_len_1typo: 5,
        min_len_2typo: 8
      };
      const response = await axios.get(this.searchUrl, {
        headers: this.searchHeaders,
        params: {
          ...defaultParams,
          ...rest
        }
      });
      console.log("Pencarian berhasil. Data diterima.");
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat melakukan pencarian:", error.message);
      throw error;
    }
  }
  async feed({
    id,
    ...rest
  }) {
    console.log("Memulai pengambilan feed trending untuk channel ID:", id);
    try {
      const url = `${this.feedBaseUrl}${id}/feed/trending`;
      const defaultParams = {
        filter: "trending",
        page: 1,
        period: "month"
      };
      const response = await axios.get(url, {
        headers: this.feedHeaders,
        params: {
          ...defaultParams,
          ...rest
        }
      });
      console.log("Pengambilan feed berhasil. Data diterima.");
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil feed:", error.message);
      throw error;
    }
  }
  async recent({
    id,
    ...rest
  }) {
    console.log("Memulai pengambilan feed terbaru untuk channel ID:", id);
    try {
      const url = `${this.feedBaseUrl}${id}/feed/recent`;
      const defaultParams = {
        offset_id: 0
      };
      const response = await axios.get(url, {
        headers: this.feedHeaders,
        params: {
          ...defaultParams,
          ...rest
        }
      });
      console.log("Pengambilan feed terbaru berhasil. Data diterima.");
      return response.data;
    } catch (error) {
      console.error("Terjadi kesalahan saat mengambil feed terbaru:", error.message);
      throw error;
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
      error: "Missing required field: action",
      required: {
        action: "search | feed | recent"
      }
    });
  }
  const tlgrm = new TlgrmClient();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await tlgrm[action](params);
        break;
      case "feed":
      case "recent":
        if (!params.id) {
          return res.status(400).json({
            error: `Missing required field: id (required for ${action})`
          });
        }
        result = await tlgrm[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | feed | recent`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Processing error for action '${action}':`, error);
    return res.status(500).json({
      success: false,
      error: `Processing error: ${error.message}`
    });
  }
}