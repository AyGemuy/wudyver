import axios from "axios";
const mathJsApi = "http://api.mathjs.org/v4/";
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      expr,
      precision
    } = req.query;
    if (!expr) {
      return res.status(400).json({
        error: "Paramenter 'expr' diperlukan."
      });
    }
    try {
      const response = await axios.get(mathJsApi, {
        params: {
          expr: expr,
          precision: precision
        }
      });
      return res.status(200).json({
        result: response.data
      });
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data || "Terjadi kesalahan."
      });
    }
  } else if (req.method === "POST") {
    const {
      expr,
      precision
    } = req.body;
    if (!expr) {
      return res.status(400).json({
        error: "Field 'expr' diperlukan."
      });
    }
    try {
      const response = await axios.post(mathJsApi, {
        expr: expr,
        precision: precision
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return res.status(200).json(response.data);
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data || "Terjadi kesalahan."
      });
    }
  } else {
    return res.status(405).json({
      error: `Method ${req.method} tidak diizinkan.`
    });
  }
}