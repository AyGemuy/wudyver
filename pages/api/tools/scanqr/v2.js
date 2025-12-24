import axios from "axios";
import * as cheerio from "cheerio";
class BarcodeRecognizer {
  async getDecodedData(url) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await axios.get(`https://zxing.org/w/decode?u=${encodedUrl}`);
      const $ = cheerio.load(response.data);
      return {
        raw: $("table#result tr").eq(0).find("td").eq(1).text().trim(),
        bytes: $("table#result tr").eq(1).find("td").eq(1).text().trim(),
        format: $("table#result tr").eq(2).find("td").eq(1).text().trim(),
        result: $("table#result tr").eq(3).find("td").eq(1).text().trim(),
        parsed: $("table#result tr").eq(4).find("td").eq(1).text().trim()
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) return res.status(400).json({
      error: "Missing URL parameter"
    });
    const barcodeRecognizer = new BarcodeRecognizer();
    const result = await barcodeRecognizer.getDecodedData(url);
    if (result.error) return res.status(500).json({
      error: result.error
    });
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}