import axios from "axios";
import * as cheerio from "cheerio";
const getToken = async () => {
  try {
    const {
      data: api
    } = await axios.get("https://hddownloaders.com");
    const token = cheerio.load(api)("#token").val();
    if (!token) throw new Error("Token tidak ditemukan!");
    return token;
  } catch (error) {
    throw new Error(`Gagal mendapatkan token: ${error.message}`);
  }
};
const downloadVideoData = async (link, token) => {
  try {
    const {
      data
    } = await axios.post("https://hddownloaders.com/wp-json/aio-dl/video-data/", new URLSearchParams({
      url: link,
      token: token
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Postify/1.0.0"
      }
    });
    return data;
  } catch (error) {
    throw new Error(`Gagal mengunduh data video: ${error.response?.data || error.message}`);
  }
};
export default async function handler(req, res) {
  try {
    const {
      url: link
    } = req.method === "GET" ? req.query : req.body;
    if (!link) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const token = await getToken();
    const videoData = await downloadVideoData(link, token);
    return res.status(200).json({
      success: true,
      data: videoData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}