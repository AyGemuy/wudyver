import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class KrakenFiles {
  constructor(url) {
    if (!/krakenfiles.com/.test(url)) throw new Error("Input URL harus dari Krakenfiles!");
    this.url = url;
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
  }
  async fetchPage() {
    try {
      const {
        data
      } = await axios.get(this.url, {
        headers: {
          "User-Agent": "Posify/1.0.0",
          Referer: "krakenfiles.com",
          Accept: "krakenfile.com"
        }
      });
      return cheerio.load(data);
    } catch {
      throw new Error("Gagal mengambil halaman Krakenfiles!");
    }
  }
  async extractMetadata($) {
    const metadata = {};
    metadata.filename = $(".coin-info .coin-name h5").text().trim();
    $(".nk-iv-wg4 .nk-iv-wg4-overview li").each((_, elem) => {
      const name = $(elem).find(".sub-text").text().trim().replace(/\s+/g, "_").toLowerCase();
      const value = $(elem).find(".lead-text").text();
      metadata[name] = value;
    });
    $(".nk-iv-wg4-list li").each((_, elem) => {
      const name = $(elem).find("div").eq(0).text().trim().replace(/\s+/g, "_").toLowerCase();
      const value = $(elem).find("div").eq(1).text().trim().replace(/\s+/g, ",");
      metadata[name] = value;
    });
    metadata.thumbnail = $("video").html() ? "https:" + $("video").attr("poster") : $(".lightgallery").html() ? "https:" + $(".lightgallery a").attr("href") : "N/A";
    return metadata;
  }
  async getDownloadLink($) {
    return $("video").html() ? "https:" + $("video source").attr("src") : "https:" + $(".lightgallery a").attr("href");
  }
  async fetchBuffer(downloadUrl, $) {
    try {
      const {
        data
      } = await axios.get(downloadUrl, {
        headers: {
          "User-Agent": "Posify/1.0.0",
          Referer: "krakenfiles.com",
          Accept: "krakenfile.com",
          token: $("#dl-token").val()
        },
        responseType: "arraybuffer"
      });
      if (!Buffer.isBuffer(data)) throw new Error("Hasil bukan buffer!");
      return data;
    } catch {
      throw new Error("Gagal mengunduh buffer!");
    }
  }
  async uploadBuffer(buffer, mimeType = "image/png", fileName = "image.png") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async download() {
    try {
      const $ = await this.fetchPage();
      const metadata = await this.extractMetadata($);
      const downloadUrl = await this.getDownloadLink($);
      const buffer = await this.fetchBuffer(downloadUrl, $);
      const uploadResponse = await this.uploadBuffer(buffer, metadata.filename);
      return {
        metadata: metadata,
        download: uploadResponse
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "URL is required"
  });
  try {
    const kraken = new KrakenFiles(url);
    const result = await kraken.download();
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to process the URL",
      details: error.message
    });
  }
}