import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Parameter query diperlukan"
  });
  const headers = {
    Accept: "*/*",
    "User-Agent": "Postify/1.0.0",
    "Content-Encoding": "gzip, deflate, br, zstd",
    "Content-Type": "application/json"
  };
  const payload = {
    query: query,
    search_uuid: uuidv4().replace(/-/g, ""),
    search_options: {
      langcode: "id-MM"
    },
    search_video: true
  };
  const processResponse = responseData => {
    const result = {
      answer: "",
      source: []
    };
    responseData.split("\n").forEach(line => {
      if (line.startsWith("data:")) {
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.data) {
            if (data.data.text) result.answer = data.data.text.replace(/\[\d+\]/g, "");
            if (data.data.sources) result.source = data.data.sources;
          }
        } catch (e) {}
      }
    });
    return result;
  };
  try {
    const response = await axios.post("https://api.felo.ai/search/threads", payload, {
      headers: headers,
      timeout: 3e4,
      responseType: "text"
    });
    const result = processResponse(response.data);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "Gagal memproses permintaan",
      details: error.message
    });
  }
}