import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class VideoDownloader {
  constructor() {
    this.endpoints = {
      info: "https://m8.fly.dev/api/info",
      download: "https://m8.fly.dev/api/download"
    };
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload?host=Catbox`;
  }
  async request(endpoint, payload) {
    try {
      console.log(`Mengirim permintaan ke ${endpoint}...`);
      const {
        data
      } = await axios.post(this.endpoints[endpoint], payload, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Postify/1.0.0",
          Referer: "https://ytiz.xyz/"
        }
      });
      console.log(`Berhasil mendapatkan respons dari ${endpoint}.`);
      return data;
    } catch (error) {
      console.error(`Error di ${endpoint}:`, error.response?.data || error.message);
      throw new Error(`Error di ${endpoint}: ${error.message}`);
    }
  }
  async fetchDetails(videoUrl, format) {
    try {
      console.log(`Mengambil informasi video untuk: ${videoUrl}...`);
      const data = await this.request("info", {
        url: videoUrl,
        format: format,
        startTime: 0,
        endTime: 0
      });
      console.log("Informasi video berhasil diambil.");
      return data;
    } catch (error) {
      console.error("Error mengambil informasi video:", error.message);
      throw error;
    }
  }
  async download(videoUrl, quality, filename, randomID, format) {
    try {
      console.log(`Mengunduh video dengan kualitas ${quality} dan format ${format}...`);
      const data = await this.request("download", {
        url: videoUrl,
        quality: quality,
        metadata: true,
        filename: filename,
        randID: randomID,
        trim: false,
        startTime: 0,
        endTime: 0,
        format: format
      });
      console.log("Unduhan berhasil.");
      return data;
    } catch (error) {
      console.error("Error saat mengunduh media:", error.message);
      throw error;
    }
  }
  async uploadMedia(buffer, headers = "image/png") {
    try {
      const base64Image = buffer.toString("base64");
      const dataUri = `data:${headers["content-type"]};base64,${base64Image}`;
      const requestData = {
        file: dataUri
      };
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, requestData);
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
  async youtube({
    url: videoUrl,
    format = "mp3",
    quality = "128"
  }) {
    try {
      console.log(`Memproses video: ${videoUrl}...`);
      const videoInfo = await this.fetchDetails(videoUrl, format);
      console.log("Mengunduh data audio...");
      const audioData = await this.download(videoUrl, quality, videoInfo?.filename, videoInfo?.randID, format);
      console.log("Mengambil file audio dari server...");
      const response = await axios.post("https://m8.fly.dev/api/file_send", {
        filepath: audioData?.filepath,
        randID: audioData?.randID
      }, {
        responseType: "arraybuffer"
      });
      console.log("Mengonversi respons ke buffer...");
      const mediaBuffer = Buffer.from(response.data || []);
      console.log("Mengunggah hasil unduhan...");
      const uploadResponse = await this.uploadMedia(mediaBuffer, response.headers);
      console.log("Proses selesai!");
      return {
        media: uploadResponse,
        info: videoInfo
      };
    } catch (error) {
      console.error("Error dalam proses scraping:", error.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Url is required"
    });
  }
  const downloader = new VideoDownloader();
  try {
    const data = await downloader.youtube(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error during chat request"
    });
  }
}